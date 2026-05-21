from __future__ import annotations

import logging
import os
import re
import time
from dataclasses import dataclass
from decimal import Decimal
from typing import Any
import unicodedata

import httpx
from sqlalchemy import and_, desc, or_
from sqlalchemy.orm import Session, selectinload

from app.models import CrawlData, Message, Room, RoomAmenity, RoomStatus, User, UserRole
from app.services.crawl_listing_service import room_is_crawled_listing, user_is_crawl_system_account
from app.services.crawl_row_parsing import amenity_display_name, parse_amenity_tokens

_log = logging.getLogger("trohub.ai_chat")


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"
GEMINI_FALLBACK_MODELS = ("gemini-flash-latest", "gemini-2.5-flash-lite")
# Tin fallback cũ không đưa vào ngữ cảnh — tránh AI lặp lại câu "tạm thời không khả dụng".
_BOILERPLATE_REPLY_MARKERS = (
    "Trợ lý AI tạm thời không khả dụng",
    "quản trị viên sẽ phản hồi sớm nhất có thể",
)
_ROOM_SUGGESTION_MARKERS = ("#", "crawl:", "sđt nguồn", "sdt nguon")


@dataclass(frozen=True)
class AIChatConfig:
    enabled: bool
    provider: str  # "gemini" | "openai"
    api_key: str | None
    base_url: str
    model: str
    timeout_seconds: float
    max_history_messages: int
    max_tokens: int
    max_suggested_rooms: int
    support_user_id: int | None
    support_user_email: str | None


def get_ai_chat_config() -> AIChatConfig:
    gemini_key = (os.getenv("GEMINI_API_KEY") or "").strip() or None
    openai_key = (os.getenv("OPENAI_API_KEY") or os.getenv("AI_CHAT_API_KEY") or "").strip() or None

    provider = (os.getenv("AI_CHAT_PROVIDER") or "").strip().lower()
    if provider not in {"gemini", "openai"}:
        provider = "gemini" if gemini_key else "openai"

    if provider == "gemini":
        api_key = gemini_key
        default_model = "gemini-flash-latest"
        model = os.getenv("AI_CHAT_MODEL", os.getenv("GEMINI_MODEL", default_model))
        base_url = GEMINI_API_BASE
    else:
        api_key = openai_key
        model = os.getenv("AI_CHAT_MODEL", os.getenv("OPENAI_MODEL", "gpt-4o-mini"))
        base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")

    enabled_default = bool(api_key)
    support_user_id_raw = os.getenv("AI_CHAT_SUPPORT_USER_ID", "").strip()
    support_user_id = int(support_user_id_raw) if support_user_id_raw.isdigit() else None

    return AIChatConfig(
        enabled=_env_bool("AI_CHAT_ENABLED", enabled_default),
        provider=provider,
        api_key=api_key,
        base_url=base_url,
        model=model,
        timeout_seconds=_env_float("AI_CHAT_TIMEOUT_SECONDS", 30.0),
        max_history_messages=max(4, min(_env_int("AI_CHAT_MAX_HISTORY_MESSAGES", 12), 30)),
        max_tokens=max(80, min(_env_int("AI_CHAT_MAX_TOKENS", 450), 1200)),
        max_suggested_rooms=max(3, min(_env_int("AI_CHAT_MAX_SUGGESTED_ROOMS", 5), 10)),
        support_user_id=support_user_id,
        support_user_email=(os.getenv("AI_CHAT_SUPPORT_USER_EMAIL") or "").strip().lower() or None,
    )


def _same_room_filter(room_id: int | None):
    if room_id is None:
        return Message.room_id.is_(None)
    return Message.room_id == room_id


def _format_money(value: Decimal | int | float | None) -> str | None:
    if value is None:
        return None
    try:
        amount = float(value)
    except (TypeError, ValueError):
        return str(value)
    if amount >= 1_000_000:
        return f"{amount / 1_000_000:.1f} triệu VND/tháng"
    return f"{amount:,.0f} VND/tháng"


def _normalize_text(value: object) -> str:
    text = str(value or "").replace("đ", "d").replace("Đ", "D")
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = re.sub(r"[^0-9a-zA-Z]+", " ", text).lower()
    return re.sub(r"\s+", " ", text).strip()


def _price_to_vnd(raw: str, unit: str | None) -> int | None:
    try:
        number = float(raw.replace(",", "."))
    except (TypeError, ValueError):
        return None
    unit_norm = _normalize_text(unit)
    if "tr" in unit_norm or "trieu" in unit_norm or "cu" in unit_norm or number < 1000:
        return int(number * 1_000_000)
    return int(number)


def _normalize_price_text(value: object) -> str:
    text = str(value or "").replace("đ", "d").replace("Đ", "D")
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = re.sub(r"(?<=\d)[,.](?=\d)", ".", text)
    text = re.sub(r"[^0-9a-zA-Z.\-]+", " ", text).lower()
    return re.sub(r"\s+", " ", text).strip()


def _extract_price_filters(text: str) -> tuple[int | None, int | None]:
    price_text = re.sub(r"(\d(?:[\.,]\d+)?)\s*[-–—]\s*(\d)", r"\1 den \2", str(text or ""))
    normalized = _normalize_price_text(price_text)
    min_price: int | None = None
    max_price: int | None = None

    range_match = re.search(
        r"(?:tu\s*)?(\d+(?:\.\d+)?)\s*(?:cu|tr|trieu|m|million)?\s*(?:den|toi|-)\s*(\d+(?:\.\d+)?)\s*(cu|tr|trieu|m|million)?",
        normalized,
    )
    if range_match:
        low = _price_to_vnd(range_match.group(1), range_match.group(3) or "trieu")
        high = _price_to_vnd(range_match.group(2), range_match.group(3) or "trieu")
        if low is not None and high is not None:
            min_price, max_price = min(low, high), max(low, high)

    upper_match = re.search(r"(?:duoi|toi da|max|khong qua|nho hon)\s*(\d+(?:\.\d+)?)\s*(cu|tr|trieu|m|million)?", normalized)
    if upper_match:
        parsed = _price_to_vnd(upper_match.group(1), upper_match.group(2) or "trieu")
        if parsed is not None:
            max_price = parsed if max_price is None else min(max_price, parsed)

    lower_match = re.search(r"(?:tren|tu|toi thieu|min|lon hon)\s*(\d+(?:\.\d+)?)\s*(cu|tr|trieu|m|million)?", normalized)
    if lower_match and "den" not in normalized:
        parsed = _price_to_vnd(lower_match.group(1), lower_match.group(2) or "trieu")
        if parsed is not None:
            min_price = parsed if min_price is None else max(min_price, parsed)

    exact_matches = re.findall(
        r"(?:gia|muc gia|tam gia)?\s*(\d+(?:\.\d+)?)\s*(cu|tr|trieu|m|million)\b",
        normalized,
    )
    has_range_or_comparison = any(
        marker in normalized
        for marker in ("duoi", "toi da", "max", "khong qua", "nho hon", "tren", "toi thieu", "min", "lon hon", " den ")
    )
    if exact_matches and not has_range_or_comparison:
        value, unit = exact_matches[-1]
        parsed = _price_to_vnd(value, unit)
        if parsed is not None:
            min_price = parsed
            max_price = parsed

    return min_price, max_price


_ROOM_SEARCH_HINTS = {
    "tim",
    "kiem",
    "phong",
    "tro",
    "thue",
    "can",
    "can ho",
    "nha",
    "gan",
    "gia",
    "trieu",
    "cu",
    "duoi",
    "tren",
    "quan",
    "duong",
    "khu",
    "ha noi",
    "da nang",
    "hcm",
    "tphcm",
    "sai gon",
}

_SEARCH_STOPWORDS = {
    "ai",
    "ban",
    "cho",
    "co",
    "con",
    "duoi",
    "gia",
    "giup",
    "ho",
    "khong",
    "kiem",
    "minh",
    "mot",
    "nha",
    "phong",
    "thue",
    "tim",
    "toi",
    "tro",
    "trieu",
    "vnd",
}

_CITY_ALIASES: dict[str, tuple[str, ...]] = {
    "Hồ Chí Minh": ("ho chi minh", "tp ho chi minh", "thanh pho ho chi minh", "hcm", "tp hcm", "tphcm", "sai gon", "saigon"),
    "Đà Nẵng": ("da nang", "tp da nang", "thanh pho da nang"),
    "Hà Nội": ("ha noi", "tp ha noi", "thanh pho ha noi"),
}

_KNOWN_AREA_PHRASES = (
    # TP.HCM
    "binh thanh",
    "binh tan",
    "go vap",
    "phu nhuan",
    "tan binh",
    "tan phu",
    "thu duc",
    "nha be",
    "binh chanh",
    "hoc mon",
    "cu chi",
    "can gio",
    # Da Nang
    "hai chau",
    "thanh khe",
    "son tra",
    "ngu hanh son",
    "cam le",
    "lien chieu",
    "hoa vang",
    # Ha Noi
    "ba dinh",
    "hoan kiem",
    "dong da",
    "hai ba trung",
    "cau giay",
    "thanh xuan",
    "hoang mai",
    "nam tu liem",
    "bac tu liem",
    "ha dong",
    "tay ho",
    "long bien",
)


def _looks_like_room_search(text: str) -> bool:
    normalized = _normalize_text(text)
    if not normalized:
        return False
    return any(hint in normalized for hint in _ROOM_SEARCH_HINTS)


def _looks_like_search_followup(text: str) -> bool:
    normalized = _normalize_text(text)
    if not normalized:
        return False
    followup_phrases = (
        "hien thi",
        "show",
        "xem",
        "cho xem",
        "liet ke",
        "danh sach",
        "thi sao",
        "ten phong",
        "cai ten phong",
        "gui",
        "dua",
        "co phong nao",
        "phong nao",
    )
    return any(phrase in normalized for phrase in followup_phrases) or len(normalized.split()) <= 4


def _looks_like_schedule_request(text: str) -> bool:
    normalized = _normalize_text(text)
    if not normalized:
        return False
    schedule_phrases = (
        "dat lich",
        "lich xem",
        "hen xem",
        "xem phong",
        "di xem",
        "tham quan",
        "gap chu phong",
        "gap chu nha",
        "hen chu phong",
        "hen chu nha",
    )
    return any(phrase in normalized for phrase in schedule_phrases)


def _extract_room_id_from_text(text: str | None) -> int | None:
    if not text:
        return None
    patterns = (
        r"/room/(\d+)",
        r"#(\d+)",
        r"\bphong\s*(?:so\s*)?(\d+)\b",
        r"\bma\s*phong\s*(\d+)\b",
    )
    for pattern in patterns:
        match = re.search(pattern, str(text), re.I)
        if match:
            try:
                return int(match.group(1))
            except (TypeError, ValueError):
                return None
    return None


def _resolve_schedule_room_id(incoming_message: Message, history: list[dict[str, str]]) -> int | None:
    room_id = _extract_room_id_from_text(incoming_message.content)
    if room_id:
        return room_id
    if incoming_message.room_id:
        return int(incoming_message.room_id)

    # Chỉ dùng lịch sử gần nếu người dùng vừa nhắc lại đúng một phòng cụ thể.
    for item in reversed(history[-4:]):
        if item.get("role") != "user":
            continue
        room_id = _extract_room_id_from_text(item.get("content"))
        if room_id:
            return room_id
    return None


def _search_tokens(text: str) -> list[str]:
    tokens = []
    for token in _normalize_text(text).split():
        if len(token) < 2 or token.isdigit() or token in _SEARCH_STOPWORDS:
            continue
        tokens.append(token)
    return tokens[:12]


def _has_normalized_phrase(text: str, phrase: str) -> bool:
    return f" {phrase} " in f" {_normalize_text(text)} "


def _extract_location_filters(text: str) -> tuple[str | None, list[str]]:
    normalized = _normalize_text(text)
    if not normalized:
        return None, []

    city_filter: str | None = None
    for city, aliases in _CITY_ALIASES.items():
        if any(_has_normalized_phrase(normalized, alias) for alias in aliases):
            city_filter = city
            break

    area_filters: list[str] = []
    seen: set[str] = set()

    for match in re.finditer(r"\b(?:quan|q)\s*0?(\d{1,2})\b", normalized):
        area = f"quan {int(match.group(1))}"
        if area not in seen:
            seen.add(area)
            area_filters.append(area)

    for phrase in _KNOWN_AREA_PHRASES:
        if _has_normalized_phrase(normalized, phrase) and phrase not in seen:
            seen.add(phrase)
            area_filters.append(phrase)

    return city_filter, area_filters[:4]


def _matches_city_address(address: object, city_filter: str | None) -> bool:
    if not city_filter:
        return True
    aliases = _CITY_ALIASES.get(city_filter, ())
    return any(_has_normalized_phrase(str(address or ""), alias) for alias in aliases)


def _matches_area_text(value: object, area: str) -> bool:
    normalized = _normalize_text(value)
    if _has_normalized_phrase(normalized, area):
        return True

    district_match = re.fullmatch(r"quan (\d{1,2})", area)
    if district_match:
        number = district_match.group(1)
        return _has_normalized_phrase(normalized, f"q {number}") or _has_normalized_phrase(normalized, f"q{number}")
    return False


def _filter_by_location(
    items: list[Any],
    *,
    city_filter: str | None,
    area_filters: list[str],
    address_getter,
    text_getter,
) -> list[Any]:
    filtered = [item for item in items if _matches_city_address(address_getter(item), city_filter)]
    if not area_filters:
        return filtered

    area_matches = [
        item
        for item in filtered
        if any(_matches_area_text(text_getter(item), area) for area in area_filters)
    ]
    return area_matches or filtered


def _room_amenities(room: Room) -> list[str]:
    return [
        ra.amenity.name
        for ra in getattr(room, "room_amenities", []) or []
        if getattr(ra, "amenity", None) is not None and ra.amenity.name
    ]


def _score_room_for_message(room: Room, tokens: list[str]) -> int:
    if not tokens:
        return 0
    haystack = _normalize_text(
        " ".join(
            str(part or "")
            for part in (
                room.title,
                room.room_type,
                room.address,
                room.description,
                " ".join(_room_amenities(room)),
            )
        )
    )
    score = 0
    for token in tokens:
        if token in haystack:
            score += 4 if token in _normalize_text(room.address) else 2
    return score


def _score_crawl_row_for_message(row: CrawlData, tokens: list[str]) -> int:
    if not tokens:
        return 0
    address_text = _normalize_text(row.address)
    haystack = _normalize_text(
        " ".join(
            str(part or "")
            for part in (
                row.title,
                row.room_type,
                row.address,
                row.description,
                row.amenities,
            )
        )
    )
    score = 0
    for token in tokens:
        if token in haystack:
            score += 4 if token in address_text else 2
    return score


def _format_room_suggestion(room: Room) -> str:
    amenities = ", ".join(_room_amenities(room)[:5])
    image_hint = f", {len(room.images)} ảnh" if getattr(room, "images", None) else ""
    parts = [
        f"#{room.id} - {room.title}",
        f"loại {room.room_type}" if room.room_type else None,
        f"giá {_format_money(room.price) or 'chưa rõ'}",
        f"diện tích {room.area_sqm} m2" if room.area_sqm is not None else None,
        f"địa chỉ {room.address}",
        f"tiện ích {amenities}" if amenities else None,
        f"nguồn {room.source}{image_hint}",
        f"link /room/{room.id}",
    ]
    return "; ".join(part for part in parts if part)


def _format_crawl_suggestion(row: CrawlData) -> str:
    amenities = ", ".join(amenity_display_name(item) for item in parse_amenity_tokens(row.amenities)[:5])
    parts = [
        f"crawl:{row.url} - {row.title}",
        f"loại {row.room_type}" if row.room_type else None,
        f"giá {_format_money(row.price) or 'chưa rõ'}",
        f"diện tích {row.area} m2" if row.area else None,
        f"địa chỉ {row.address}" if row.address else None,
        f"tiện ích {amenities}" if amenities else None,
        f"SĐT nguồn: {row.phone}" if row.phone else None,
        f"link nguồn {row.url}" if row.url else None,
    ]
    return "; ".join(part for part in parts if part)


def _suggestion_lines_from_context(context: str) -> list[str]:
    return [line[2:].strip() for line in context.splitlines() if line.startswith("- ")]


def _reply_has_concrete_suggestions(reply: str) -> bool:
    normalized = _normalize_text(reply)
    return any(marker in reply.lower() for marker in _ROOM_SUGGESTION_MARKERS) or "sdt nguon" in normalized


def _clean_suggestion_for_user(line: str) -> str:
    if line.startswith("crawl:"):
        return re.sub(r"^crawl:\S+\s+-\s+", "Tin crawl - ", line)
    return line


def _fallback_room_search_reply(context: str) -> str | None:
    suggestions = _suggestion_lines_from_context(context)
    if not suggestions:
        return None

    lines = ["Mình tìm thấy một số phòng phù hợp:"]
    lines.extend(f"{index}. {_clean_suggestion_for_user(line)}" for index, line in enumerate(suggestions, start=1))
    lines.append("Bạn có thể bấm link /room/<mã phòng> để xem chi tiết; với tin crawl thì mở link nguồn hoặc liên hệ qua SĐT nguồn nếu có.")
    return "\n".join(lines)


def _fallback_provider_error_reply(search_context: str, search_text: str) -> str:
    if _looks_like_room_search(search_text):
        fallback = _fallback_room_search_reply(search_context)
        if fallback:
            return fallback
        return (
            "Mình chưa thấy phòng khớp đúng yêu cầu trong dữ liệu hiện có. "
            "Bạn thử nới ngân sách, đổi khu vực hoặc nói rõ thêm loại phòng/diện tích để mình lọc lại."
        )

    return (
        "Mình đã nhận tin nhắn của bạn. Hiện hệ thống AI chưa gọi được nhà cung cấp, "
        "nên mình sẽ chuyển nội dung này cho quản trị viên xử lý tiếp."
    )


def _safe_ai_error(exc: Exception) -> str:
    return re.sub(r"([?&]key=)[^&\s]+", r"\1***", str(exc))


def _create_schedule_forward_reply(db: Session, incoming_message: Message, history: list[dict[str, str]]) -> str | None:
    if not _looks_like_schedule_request(incoming_message.content):
        return None

    room_id = _resolve_schedule_room_id(incoming_message, history)
    if not room_id:
        return (
            "Bạn muốn đặt lịch xem phòng nào? Hãy gửi mã phòng dạng #123 hoặc link /room/123, "
            "kèm ngày giờ muốn xem để mình chuyển yêu cầu cho chủ phòng."
        )

    room = db.query(Room).filter(Room.id == room_id).first()
    if room is None:
        return f"Mình chưa tìm thấy phòng #{room_id}. Bạn kiểm tra lại mã phòng hoặc gửi link /room/{room_id} giúp mình."

    if room.status != RoomStatus.AVAILABLE:
        return f"Phòng #{room_id} hiện không ở trạng thái đang hiển thị, nên mình chưa thể gửi yêu cầu đặt lịch."

    if room_is_crawled_listing(room, db):
        return (
            f"Phòng #{room_id} là tin từ nguồn crawl, TroHub chưa có chủ phòng trên hệ thống để xác nhận lịch tự động. "
            "Bạn hãy dùng số điện thoại nguồn trên trang chi tiết hoặc gửi admin kiểm tra thêm."
        )

    landlord = db.query(User).filter(User.id == room.landlord_id).first()
    if landlord is None or user_is_crawl_system_account(landlord):
        return f"Mình chưa xác định được chủ phòng thật cho phòng #{room_id}, nên chưa thể chuyển yêu cầu đặt lịch."

    sender = db.query(User).filter(User.id == incoming_message.sender_id).first()
    sender_name = sender.full_name if sender else f"User #{incoming_message.sender_id}"
    forwarded_content = (
        f"Khách {sender_name} muốn đặt lịch xem phòng #{room.id} - {room.title}.\n"
        f"Nội dung khách gửi: {incoming_message.content.strip()}\n"
        "Vui lòng phản hồi trong TroHub để xác nhận ngày giờ xem phòng."
    )

    db.add(
        Message(
            sender_id=incoming_message.sender_id,
            receiver_id=landlord.id,
            room_id=room.id,
            content=forwarded_content[:4000],
            is_read=False,
        )
    )
    db.flush()

    return (
        f"Mình đã gửi yêu cầu đặt lịch xem phòng #{room.id} cho chủ phòng trên TroHub. "
        "Lịch xem chỉ được xác nhận khi chủ phòng phản hồi lại trong chat, bạn đừng chuyển cọc trước khi xem phòng thực tế."
    )


def _search_text_from_history(incoming_message: Message, history: list[dict[str, str]]) -> str:
    current = incoming_message.content or ""
    if _looks_like_search_followup(current):
        for item in reversed(history):
            if item.get("role") != "user":
                continue
            content = item.get("content") or ""
            if content == current:
                continue
            if _looks_like_room_search(content):
                return f"{content}\n{current}"
    if _looks_like_room_search(current):
        return current
    return current


def _available_room_search_context(db: Session, user_text: str, limit: int) -> str:
    if not _looks_like_room_search(user_text):
        return (
            "Nếu khách hỏi tìm phòng, hãy hỏi lại vị trí, ngân sách, loại phòng hoặc tiện ích mong muốn. "
            "Nếu khách hỏi đặt phòng, hướng dẫn khách mở chi tiết phòng rồi dùng nút liên hệ/chat với chủ phòng; "
            "TroHub chưa xác nhận giữ chỗ tự động trong chat."
        )

    min_price, max_price = _extract_price_filters(user_text)
    city_filter, area_filters = _extract_location_filters(user_text)
    query = (
        db.query(Room)
        .options(
            selectinload(Room.images),
            selectinload(Room.room_amenities).selectinload(RoomAmenity.amenity),
        )
        .filter(Room.status == RoomStatus.AVAILABLE)
    )
    if min_price is not None or max_price is not None:
        query = query.filter(Room.price > 0)
    if min_price is not None:
        query = query.filter(Room.price >= min_price)
    if max_price is not None:
        query = query.filter(Room.price <= max_price)

    tokens = _search_tokens(user_text)
    candidates = query.order_by(desc(Room.created_at), desc(Room.id)).limit(80).all()
    candidates = _filter_by_location(
        candidates,
        city_filter=city_filter,
        area_filters=area_filters,
        address_getter=lambda room: room.address,
        text_getter=lambda room: " ".join(str(part or "") for part in (room.title, room.address, room.description)),
    )
    ranked = sorted(candidates, key=lambda room: (_score_room_for_message(room, tokens), room.created_at, room.id), reverse=True)
    matches = [room for room in ranked if _score_room_for_message(room, tokens) > 0] or ranked

    crawl_query = db.query(CrawlData)
    if min_price is not None or max_price is not None:
        crawl_query = crawl_query.filter(CrawlData.price > 0)
    if min_price is not None:
        crawl_query = crawl_query.filter(CrawlData.price >= min_price)
    if max_price is not None:
        crawl_query = crawl_query.filter(CrawlData.price <= max_price)

    normalized_urls = {room.source_url for room in matches if room.source_url}
    crawl_candidates = crawl_query.limit(120).all()
    crawl_candidates = _filter_by_location(
        crawl_candidates,
        city_filter=city_filter,
        area_filters=area_filters,
        address_getter=lambda row: row.address,
        text_getter=lambda row: " ".join(str(part or "") for part in (row.title, row.address, row.description)),
    )
    crawl_ranked = sorted(crawl_candidates, key=lambda row: _score_crawl_row_for_message(row, tokens), reverse=True)
    crawl_matches = [
        row
        for row in crawl_ranked
        if row.url not in normalized_urls and (not tokens or _score_crawl_row_for_message(row, tokens) > 0)
    ]

    selected_rooms = matches[:limit]
    remaining = max(0, limit - len(selected_rooms))
    selected_crawl_rows = crawl_matches[:remaining]

    filter_lines = []
    if city_filter:
        filter_lines.append(f"thành phố {city_filter}")
    if area_filters:
        filter_lines.append(f"khu vực {', '.join(area_filters)}")
    if min_price is not None:
        filter_lines.append(f"giá từ {_format_money(min_price)}")
    if max_price is not None:
        filter_lines.append(f"giá tối đa {_format_money(max_price)}")
    filter_summary = ", ".join(filter_lines) if filter_lines else "không có lọc giá rõ ràng"

    if not selected_rooms and not selected_crawl_rows:
        return (
            f"Khách đang tìm phòng ({filter_summary}) nhưng DB hiện không có phòng AVAILABLE hoặc crawl_data phù hợp. "
            "Hãy nói rõ chưa thấy phòng khớp và hỏi khách nới ngân sách/khu vực/tiện ích."
        )

    lines = [f"Khách đang tìm phòng; bộ lọc suy ra: {filter_summary}. Dữ liệu gợi ý từ DB:"]
    if selected_rooms:
        lines.append("Phòng trong bảng rooms:")
        lines.extend(f"- {_format_room_suggestion(room)}" for room in selected_rooms)
    if selected_crawl_rows:
        lines.append("Tin thô trong bảng crawl_data:")
        lines.extend(f"- {_format_crawl_suggestion(row)}" for row in selected_crawl_rows)
    lines.append(
        "Khi gợi ý phòng trong rooms, nêu id phòng để khách mở chi tiết. "
        "Với tin crawl_data, nêu là tin nguồn crawl và hướng dẫn khách dùng SĐT nguồn nếu có; không nói đã giữ chỗ."
    )
    return "\n".join(lines)


def _room_context(db: Session, room_id: int | None) -> str:
    if room_id is None:
        return "Cuộc trò chuyện hỗ trợ chung, không gắn với phòng cụ thể."

    room = db.query(Room).filter(Room.id == room_id).first()
    if room is None:
        return f"Cuộc trò chuyện có room_id={room_id}, nhưng không tìm thấy dữ liệu phòng."

    details = [
        f"Tên phòng: {room.title}",
        f"Loại phòng: {room.room_type}",
        f"Địa chỉ: {room.address}",
        f"Giá: {_format_money(room.price) or 'chưa rõ'}",
        f"Diện tích: {room.area_sqm} m2" if room.area_sqm is not None else None,
        f"Trạng thái: {getattr(room.status, 'value', room.status)}",
    ]
    if room.description:
        details.append(f"Mô tả: {room.description[:800]}")
    return "\n".join(item for item in details if item)


def _is_boilerplate_reply(content: str | None) -> bool:
    text = (content or "").strip()
    if not text:
        return True
    return any(marker in text for marker in _BOILERPLATE_REPLY_MARKERS)


def _thread_history(db: Session, incoming_message: Message, max_messages: int) -> list[dict[str, str]]:
    rows = (
        db.query(Message)
        .filter(
            or_(
                and_(
                    Message.sender_id == incoming_message.sender_id,
                    Message.receiver_id == incoming_message.receiver_id,
                ),
                and_(
                    Message.sender_id == incoming_message.receiver_id,
                    Message.receiver_id == incoming_message.sender_id,
                ),
            ),
            _same_room_filter(incoming_message.room_id),
            Message.id <= incoming_message.id,
        )
        .order_by(Message.sent_at.desc(), Message.id.desc())
        .limit(max_messages)
        .all()
    )

    history: list[dict[str, str]] = []
    for row in reversed(rows):
        if _is_boilerplate_reply(row.content):
            continue
        role = "assistant" if row.sender_id == incoming_message.receiver_id else "user"
        history.append({"role": role, "content": row.content})
    return history


def should_ai_auto_reply(db: Session, incoming_message: Message, config: AIChatConfig | None = None) -> bool:
    config = config or get_ai_chat_config()
    if not config.enabled or not config.api_key:
        return False
    if incoming_message.sender_id == incoming_message.receiver_id:
        return False

    sender = db.query(User).filter(User.id == incoming_message.sender_id).first()
    receiver = db.query(User).filter(User.id == incoming_message.receiver_id).first()
    if sender is None or receiver is None:
        return False
    if sender.role == UserRole.ADMIN:
        return False

    # Trả lời khi nhắn tới admin hỗ trợ (widget "Hỗ trợ trực tuyến") hoặc user chỉ định trong .env.
    if receiver.role == UserRole.ADMIN:
        return True
    if config.support_user_id is not None and receiver.id == config.support_user_id:
        return True
    if config.support_user_email:
        return (receiver.email or "").strip().lower() == config.support_user_email
    return False


def _build_chat_messages(
    db: Session,
    incoming_message: Message,
    *,
    max_history: int,
    max_suggested_rooms: int,
) -> list[dict[str, str]]:
    history = _thread_history(db, incoming_message, max_history)
    search_text = _search_text_from_history(incoming_message, history)
    system_prompt = (
        "Bạn là trợ lý AI chăm sóc khách hàng của TroHub, nền tảng tìm và đăng phòng trọ. "
        "Trả lời bằng tiếng Việt, rõ ràng, ngắn gọn, tối đa 5 câu. "
        "Chỉ dùng thông tin phòng được cung cấp trong ngữ cảnh; không bịa giá, địa chỉ, trạng thái hoặc chính sách. "
        "Bạn có thể giúp khách lọc phòng theo vị trí, ngân sách, loại phòng, diện tích và tiện ích nếu dữ liệu có trong ngữ cảnh. "
        "Nếu ngữ cảnh có danh sách phòng/tin gợi ý, bắt buộc liệt kê từng phòng/tin cụ thể, gồm mã # hoặc nhãn tin crawl, tên, giá và địa chỉ; "
        "với phòng trong bảng rooms phải giữ nguyên link /room/<id>, với tin crawl phải giữ nguyên link nguồn nếu có. "
        "không được chỉ nói chung chung rằng có một số phòng. "
        "TroHub chưa có thao tác đặt cọc/giữ chỗ tự động trong chat. Với nhu cầu đặt lịch xem phòng hệ thống, hãy yêu cầu khách gửi mã phòng #id hoặc link /room/id, "
        "ngày giờ muốn xem và số điện thoại nếu khách muốn chủ phòng gọi lại; chỉ nói lịch được xác nhận sau khi chủ phòng phản hồi. "
        "Với tin crawl, không tự đặt lịch; hướng dẫn khách dùng SĐT nguồn hoặc nhờ admin kiểm tra. "
        "Nếu câu hỏi cần kiểm tra tài khoản, thanh toán, tranh chấp, dữ liệu cá nhân hoặc quyết định của admin, "
        "hãy nói rằng bạn đã ghi nhận và sẽ chuyển quản trị viên xử lý."
    )
    return [
        {"role": "system", "content": system_prompt},
        {"role": "system", "content": f"Ngữ cảnh TroHub:\n{_room_context(db, incoming_message.room_id)}"},
        {
            "role": "system",
            "content": f"Dữ liệu hỗ trợ tìm/đặt phòng:\n{_available_room_search_context(db, search_text, max_suggested_rooms)}",
        },
        *history,
    ]


def _to_gemini_payload(messages: list[dict[str, str]]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    system_lines: list[str] = []
    contents: list[dict[str, Any]] = []
    for message in messages:
        role = message["role"]
        text = message["content"]
        if role == "system":
            system_lines.append(text)
            continue
        gemini_role = "model" if role == "assistant" else "user"
        if contents and contents[-1]["role"] == gemini_role:
            prev = contents[-1]["parts"][0]["text"]
            contents[-1]["parts"][0]["text"] = f"{prev}\n\n{text}"
        else:
            contents.append({"role": gemini_role, "parts": [{"text": text}]})
    system_instruction = {"parts": [{"text": "\n\n".join(system_lines)}]} if system_lines else None
    return system_instruction, contents


def _call_openai(config: AIChatConfig, messages: list[dict[str, str]]) -> str:
    response = httpx.post(
        f"{config.base_url}/chat/completions",
        headers={
            "Authorization": f"Bearer {config.api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": config.model,
            "messages": messages,
            "temperature": 0.35,
            "max_tokens": config.max_tokens,
        },
        timeout=config.timeout_seconds,
    )
    response.raise_for_status()
    payload: dict[str, Any] = response.json()
    return str(payload["choices"][0]["message"]["content"] or "").strip()


def _gemini_models_to_try(primary: str) -> list[str]:
    models: list[str] = []
    for name in (primary, *GEMINI_FALLBACK_MODELS):
        clean = name.removeprefix("models/")
        if clean and clean not in models:
            models.append(clean)
    return models


def _parse_gemini_reply(payload: dict[str, Any]) -> str:
    candidates = payload.get("candidates") or []
    if not candidates:
        raise ValueError("Gemini returned no candidates")
    parts = candidates[0].get("content", {}).get("parts") or []
    text_parts = [str(part.get("text", "")).strip() for part in parts if part.get("text")]
    reply = "\n".join(part for part in text_parts if part).strip()
    if not reply or _is_boilerplate_reply(reply):
        raise ValueError("Gemini returned empty or boilerplate text")
    return reply


def _call_gemini(config: AIChatConfig, messages: list[dict[str, str]]) -> str:
    system_instruction, contents = _to_gemini_payload(messages)
    if not contents:
        raise ValueError("Gemini requires at least one user message")
    if contents[-1]["role"] != "user":
        raise ValueError("Gemini requires the latest turn to be from the user")

    body: dict[str, Any] = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.35,
            "maxOutputTokens": config.max_tokens,
        },
    }
    if system_instruction:
        body["systemInstruction"] = system_instruction

    retryable_status = {429, 500, 502, 503, 504}
    last_error: Exception | None = None

    for model in _gemini_models_to_try(config.model):
        url = f"{GEMINI_API_BASE}/models/{model}:generateContent"
        for attempt in range(2):
            try:
                response = httpx.post(
                    url,
                    params={"key": config.api_key},
                    headers={"Content-Type": "application/json"},
                    json=body,
                    timeout=config.timeout_seconds,
                )
                response.raise_for_status()
                return _parse_gemini_reply(response.json())
            except httpx.HTTPStatusError as exc:
                last_error = exc
                status = exc.response.status_code
                if status in retryable_status and attempt == 0:
                    time.sleep(1.5)
                    continue
                if status in retryable_status:
                    _log.warning("Gemini model %s failed (%s), trying fallback", model, status)
                    break
                raise
            except httpx.TimeoutException as exc:
                last_error = exc
                if attempt == 0:
                    time.sleep(1.0)
                    continue
                _log.warning("Gemini model %s timed out, trying fallback", model)
                break

    raise last_error or ValueError("Gemini request failed")


def generate_ai_reply(db: Session, incoming_message: Message, config: AIChatConfig | None = None) -> str | None:
    config = config or get_ai_chat_config()
    if not config.enabled or not config.api_key:
        return None

    messages = _build_chat_messages(
        db,
        incoming_message,
        max_history=config.max_history_messages,
        max_suggested_rooms=config.max_suggested_rooms,
    )
    history = _thread_history(db, incoming_message, config.max_history_messages)
    search_text = _search_text_from_history(incoming_message, history)
    search_context = _available_room_search_context(db, search_text, config.max_suggested_rooms)
    schedule_reply = _create_schedule_forward_reply(db=db, incoming_message=incoming_message, history=history)
    if schedule_reply:
        return schedule_reply[:4000]

    try:
        if config.provider == "gemini":
            content = _call_gemini(config, messages)
        else:
            content = _call_openai(config, messages)
    except Exception as exc:
        _log.warning("AI chat reply failed (%s): %s", config.provider, _safe_ai_error(exc))
        return _fallback_provider_error_reply(search_context, search_text)[:4000]

    reply = str(content or "").strip()
    if _looks_like_room_search(search_text) and not _reply_has_concrete_suggestions(reply):
        fallback = _fallback_room_search_reply(search_context)
        if fallback:
            return fallback[:4000]
    return reply[:4000] if reply else None


def create_ai_auto_reply(db: Session, incoming_message: Message) -> Message | None:
    config = get_ai_chat_config()
    if not should_ai_auto_reply(db=db, incoming_message=incoming_message, config=config):
        return None

    reply = generate_ai_reply(db=db, incoming_message=incoming_message, config=config)
    if not reply:
        return None

    message = Message(
        sender_id=incoming_message.receiver_id,
        receiver_id=incoming_message.sender_id,
        room_id=incoming_message.room_id,
        content=reply,
        is_read=False,
    )
    db.add(message)
    try:
        db.commit()
        db.refresh(message)
    except Exception:
        db.rollback()
        _log.exception("Could not save AI chat reply")
        return None
    return message
