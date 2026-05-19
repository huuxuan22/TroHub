from __future__ import annotations

import base64
import json
import logging
import re
from dataclasses import dataclass
from typing import Any

import httpx
from sqlalchemy.orm import Session, selectinload

from app.models import Room, RoomAmenity, RoomImage
from app.services.ai_chat_service import GEMINI_API_BASE, _gemini_models_to_try, get_ai_chat_config

_log = logging.getLogger("trohub.room_moderation")

_BLOCKED_TEXT_PATTERNS = (
    r"\bma\s*tuy\b",
    r"\bcan\s+sa\b",
    r"\bmai\s+dam\b",
    r"\bc[aá]?\s*c[uư][oọ]c\b",
    r"\bl[oô]\s*d[eề]\b",
    r"\bvay\s+nang\s+lai\b",
)
_GIBBERISH_REPEATED_CHARS = re.compile(r"(.)\1{5,}", re.IGNORECASE)
_GIBBERISH_LONG_ALNUM = re.compile(r"^[a-z0-9]{12,}$", re.IGNORECASE)


@dataclass(frozen=True)
class RoomModerationResult:
    approved: bool
    reason: str
    categories: list[str]


class RoomModerationUnavailable(Exception):
    pass


def _strip_code_fence(text: str) -> str:
    clean = str(text or "").strip()
    if clean.startswith("```"):
        clean = re.sub(r"^```(?:json)?", "", clean, flags=re.IGNORECASE).strip()
        clean = re.sub(r"```$", "", clean).strip()
    return clean


def _parse_result(text: str) -> RoomModerationResult:
    clean = _strip_code_fence(text)
    try:
        payload = json.loads(clean)
    except json.JSONDecodeError as exc:
        raise ValueError("AI moderation returned non-JSON text") from exc

    approved = bool(payload.get("approved"))
    reason = str(payload.get("reason") or "").strip()
    categories_raw = payload.get("categories") or []
    categories = [str(item).strip() for item in categories_raw if str(item).strip()] if isinstance(categories_raw, list) else []
    if not reason:
        reason = "Nội dung tin đăng không đạt yêu cầu kiểm duyệt."
    return RoomModerationResult(approved=approved, reason=reason, categories=categories)


def _room_text(room: Room) -> str:
    amenities = [
        ra.amenity.name
        for ra in getattr(room, "room_amenities", []) or []
        if getattr(ra, "amenity", None) is not None and ra.amenity.name
    ]
    parts = [
        f"Tiêu đề: {room.title}",
        f"Loại phòng: {room.room_type}",
        f"Giá: {room.price}",
        f"Diện tích: {room.area_sqm}",
        f"Địa chỉ: {room.address}",
        f"Mô tả: {room.description or ''}",
        f"Tiện ích: {', '.join(amenities)}" if amenities else "",
    ]
    return "\n".join(part for part in parts if part)


def _local_text_block_reason(room: Room) -> str | None:
    text = _normalize_ascii(_room_text(room))
    for pattern in _BLOCKED_TEXT_PATTERNS:
        if re.search(pattern, text):
            return "Tin đăng có từ khóa nghi vấn vi phạm chính sách."

    title = _normalize_ascii(room.title or "").strip()
    description = _normalize_ascii(room.description or "").strip()
    combined = f"{title} {description}".strip()
    words = [w for w in re.split(r"[^a-z0-9]+", combined) if len(w) >= 2]
    title_words = [w for w in re.split(r"[^a-z0-9]+", title) if len(w) >= 2]

    if not title or len(words) < 4:
        return "Nội dung tin đăng quá sơ sài hoặc không đủ thông tin."

    if _GIBBERISH_REPEATED_CHARS.search(title) or _GIBBERISH_REPEATED_CHARS.search(description):
        return "Nội dung tin đăng có dấu hiệu ký tự lặp, không hợp lệ."

    if len(title_words) <= 1 and _GIBBERISH_LONG_ALNUM.match(title.replace(" ", "")):
        return "Tiêu đề có dấu hiệu nội dung rác, không có nghĩa."

    unique_chars = len(set(re.sub(r"\s+", "", combined)))
    if len(combined) >= 20 and unique_chars <= 6:
        return "Nội dung tin đăng có độ lặp cao, nghi là nội dung rác."

    return None


def _normalize_ascii(value: object) -> str:
    text = str(value or "").lower()
    replacements = {
        "á": "a", "à": "a", "ả": "a", "ã": "a", "ạ": "a",
        "ă": "a", "ắ": "a", "ằ": "a", "ẳ": "a", "ẵ": "a", "ặ": "a",
        "â": "a", "ấ": "a", "ầ": "a", "ẩ": "a", "ẫ": "a", "ậ": "a",
        "é": "e", "è": "e", "ẻ": "e", "ẽ": "e", "ẹ": "e",
        "ê": "e", "ế": "e", "ề": "e", "ể": "e", "ễ": "e", "ệ": "e",
        "í": "i", "ì": "i", "ỉ": "i", "ĩ": "i", "ị": "i",
        "ó": "o", "ò": "o", "ỏ": "o", "õ": "o", "ọ": "o",
        "ô": "o", "ố": "o", "ồ": "o", "ổ": "o", "ỗ": "o", "ộ": "o",
        "ơ": "o", "ớ": "o", "ờ": "o", "ở": "o", "ỡ": "o", "ợ": "o",
        "ú": "u", "ù": "u", "ủ": "u", "ũ": "u", "ụ": "u",
        "ư": "u", "ứ": "u", "ừ": "u", "ử": "u", "ữ": "u", "ự": "u",
        "ý": "y", "ỳ": "y", "ỷ": "y", "ỹ": "y", "ỵ": "y",
        "đ": "d",
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    return re.sub(r"\s+", " ", text)


def _moderation_prompt(room: Room, image_count: int) -> str:
    return (
        "Bạn là bộ kiểm duyệt tin đăng phòng trọ cho TroHub. "
        "Hãy đánh giá nội dung và ảnh nếu có. Chỉ trả JSON hợp lệ, không markdown.\n"
        "Duyệt nếu tin có vẻ là phòng/nhà/căn hộ cho thuê hợp lệ. "
        "Từ chối nếu phát hiện: ảnh hoặc mô tả không liên quan bất động sản, ảnh khiêu dâm/khỏa thân, bạo lực/gore, vũ khí, ma túy, cờ bạc, "
        "lừa đảo, spam, thông tin mạo danh, nội dung thù ghét/phân biệt đối xử, yêu cầu đặt cọc đáng ngờ, hoặc mô tả sai phạm pháp luật.\n"
        "Nếu chỉ thiếu một vài chi tiết nhưng không vi phạm, vẫn duyệt.\n"
        'Schema: {"approved": boolean, "reason": "lý do ngắn bằng tiếng Việt", "categories": ["..."]}\n\n'
        f"Số ảnh được gửi kèm: {image_count}\n"
        f"Dữ liệu tin đăng:\n{_room_text(room)}"
    )


def _openai_parts(prompt: str, image_urls: list[str]) -> list[dict[str, Any]]:
    parts: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
    for url in image_urls[:4]:
        parts.append({"type": "image_url", "image_url": {"url": url, "detail": "low"}})
    return parts


def _call_openai_room_moderation(room: Room, image_urls: list[str]) -> RoomModerationResult:
    config = get_ai_chat_config()
    if not config.api_key:
        raise RoomModerationUnavailable("Chưa cấu hình API key cho AI moderation.")

    response = httpx.post(
        f"{config.base_url}/chat/completions",
        headers={
            "Authorization": f"Bearer {config.api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": config.model,
            "messages": [{"role": "user", "content": _openai_parts(_moderation_prompt(room, len(image_urls)), image_urls)}],
            "temperature": 0,
            "max_tokens": 300,
            "response_format": {"type": "json_object"},
        },
        timeout=config.timeout_seconds,
    )
    response.raise_for_status()
    payload = response.json()
    return _parse_result(str(payload["choices"][0]["message"]["content"] or ""))


def _image_to_gemini_part(url: str, timeout: float) -> dict[str, Any] | None:
    content: bytes | None = None
    content_type = ""
    try:
        response = httpx.get(url, timeout=min(timeout, 8.0), follow_redirects=True)
        response.raise_for_status()
        content = response.content
        content_type = response.headers.get("content-type", "").split(";")[0].strip().lower()
    except Exception:
        object_name = _extract_minio_object_name(url)
        if not object_name:
            _log.warning("Could not fetch image for room moderation: %s", url)
            return None
        try:
            from app.services.minio_storage import storage

            obj = storage.client.get_object(storage.bucket_name, object_name)
            try:
                content = obj.read()
                content_type = obj.headers.get("Content-Type", "").split(";")[0].strip().lower()
            finally:
                obj.close()
                obj.release_conn()
        except Exception as exc:
            _log.warning("Could not read MinIO image for room moderation (%s): %s", object_name, exc)
            return None

    if content_type not in {"image/jpeg", "image/png", "image/webp"}:
        return None
    if not content or len(content) > 5_000_000:
        return None
    return {
        "inline_data": {
            "mime_type": content_type,
            "data": base64.b64encode(content).decode("ascii"),
        }
    }


def _extract_minio_object_name(url: str) -> str | None:
    bucket_name = _infer_bucket_name()
    marker = f"/{bucket_name}/"
    index = str(url or "").find(marker)
    if index == -1:
        return None
    object_name = url[index + len(marker):].split("?", 1)[0].strip("/")
    return object_name or None


def _infer_bucket_name() -> str:
    try:
        from app.services.minio_storage import storage

        return storage.bucket_name
    except Exception:
        import os

        return os.getenv("MINIO_BUCKET", "anh")


def _call_gemini_room_moderation(room: Room, image_urls: list[str]) -> RoomModerationResult:
    config = get_ai_chat_config()
    if not config.api_key:
        raise RoomModerationUnavailable("Chưa cấu hình API key cho AI moderation.")

    parts: list[dict[str, Any]] = [{"text": _moderation_prompt(room, len(image_urls))}]
    attached_images = 0
    for url in image_urls[:4]:
        image_part = _image_to_gemini_part(url, config.timeout_seconds)
        if image_part:
            parts.append(image_part)
            attached_images += 1

    if image_urls and attached_images == 0:
        raise RoomModerationUnavailable("Không tải được ảnh tin đăng để kiểm duyệt.")

    body = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "temperature": 0,
            "maxOutputTokens": 300,
            "responseMimeType": "application/json",
        },
    }

    last_error: Exception | None = None
    for model in _gemini_models_to_try(config.model):
        try:
            response = httpx.post(
                f"{GEMINI_API_BASE}/models/{model}:generateContent",
                params={"key": config.api_key},
                headers={"Content-Type": "application/json"},
                json=body,
                timeout=config.timeout_seconds,
            )
            response.raise_for_status()
            payload = response.json()
            parts_out = payload["candidates"][0]["content"].get("parts") or []
            text = "\n".join(str(part.get("text", "")).strip() for part in parts_out if part.get("text")).strip()
            return _parse_result(text)
        except Exception as exc:
            last_error = exc
            _log.warning("Gemini room moderation failed with model %s: %s", model, exc)
            continue
    raise last_error or RoomModerationUnavailable("AI moderation failed.")


def moderate_room_for_approval(db: Session, room_id: int) -> RoomModerationResult:
    room = (
        db.query(Room)
        .options(
            selectinload(Room.images),
            selectinload(Room.room_amenities).selectinload(RoomAmenity.amenity),
        )
        .filter(Room.id == room_id)
        .first()
    )
    if room is None:
        raise ValueError("Room not found")

    local_reason = _local_text_block_reason(room)
    if local_reason:
        return RoomModerationResult(approved=False, reason=local_reason, categories=["content_quality"])

    image_urls = [
        image.image_url
        for image in getattr(room, "images", []) or []
        if isinstance(image, RoomImage) and image.image_url
    ]
    config = get_ai_chat_config()
    if not config.enabled or not config.api_key:
        _log.warning("AI room moderation unavailable for room %s: AI is disabled or missing API key.", room_id)
        return RoomModerationResult(
            approved=True,
            reason="AI moderation unavailable; room approved by local policy checks.",
            categories=[],
        )

    try:
        if config.provider == "gemini":
            return _call_gemini_room_moderation(room, image_urls)
        return _call_openai_room_moderation(room, image_urls)
    except RoomModerationUnavailable as exc:
        _log.warning("AI room moderation unavailable for room %s: %s", room_id, exc)
    except Exception as exc:
        _log.exception("AI room moderation failed for room %s", room_id, exc_info=exc)

    return RoomModerationResult(
        approved=True,
        reason="AI moderation failed; room approved by local policy checks.",
        categories=[],
    )
