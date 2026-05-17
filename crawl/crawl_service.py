"""
Nghiệp vụ crawl: chuẩn hóa dòng, lọc, lưu DB và kích hoạt chuẩn hóa nền trên backend.
Tách khỏi `main.py` (HTTP) và `crawl_db.py` (MySQL thuần).
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
import unicodedata
from urllib.parse import urlparse

import requests

from config import (
    BACKEND_BASE_URL,
    BACKEND_NORMALIZE_TIMEOUT,
    BACKEND_NORMALIZE_URL,
    CRAWL_NORMALIZE_WEBHOOK_SECRET,
    LIST_URL,
)
from crawl_db import get_conn, init_crawl_table, save_crawl_rows
from crawler import crawl_all

logger = logging.getLogger(__name__)

_URL_PK_MAX_LEN = 767


def persist_normalized_rows(normalized: list[dict]) -> int:
    """Ghi các dòng đã chuẩn hóa vào bảng staging (MYSQL_TABLE)."""
    return save_crawl_rows(normalized, url_pk_max_len=_URL_PK_MAX_LEN)


def _backend_origin() -> str:
    """Chỉ lấy scheme + host + port (vd. http://127.0.0.1:8000), không gắn path API."""
    if BACKEND_BASE_URL:
        return BACKEND_BASE_URL.rstrip("/")
    parsed = urlparse(BACKEND_NORMALIZE_URL)
    if not parsed.scheme or not parsed.netloc:
        return BACKEND_NORMALIZE_URL.rstrip("/")
    return f"{parsed.scheme}://{parsed.netloc}"


def notify_backend_normalize(urls: list[str]) -> None:
    """POST đồng bộ (gọi từ thread/asyncio.to_thread) — không chặn event loop của FastAPI crawl."""
    if not BACKEND_NORMALIZE_URL or not urls:
        return
    health_url = f"{_backend_origin()}/trohub/health"
    try:
        h = requests.get(health_url, timeout=5)
        if h.status_code >= 400:
            logger.warning(
                "Backend chưa sẵn sàng (%s → %s). Khởi động uvicorn backend port 8000 trước khi crawl.",
                health_url,
                h.status_code,
            )
            return
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Không kết nối được backend (%s). Đảm bảo service backend đang chạy: %s",
            health_url,
            exc,
        )
        return

    headers: dict[str, str] = {"Content-Type": "application/json"}
    if CRAWL_NORMALIZE_WEBHOOK_SECRET:
        headers["X-Crawl-Secret"] = CRAWL_NORMALIZE_WEBHOOK_SECRET
    for attempt in (1, 2):
        try:
            r = requests.post(
                BACKEND_NORMALIZE_URL,
                json={"urls": urls},
                headers=headers,
                timeout=BACKEND_NORMALIZE_TIMEOUT,
            )
            if r.status_code >= 400:
                logger.warning("Backend normalize trả %s: %s", r.status_code, r.text[:200])
            else:
                logger.info(
                    "Đã gọi backend normalize (%s URL, status=%s)",
                    len(urls),
                    r.status_code,
                )
            return
        except requests.Timeout as exc:
            if attempt == 1:
                logger.warning(
                    "Backend normalize timeout (lần 1, %ss), thử lại…",
                    BACKEND_NORMALIZE_TIMEOUT,
                )
                continue
            logger.warning(
                "Không gọi được backend normalize (%s): %s",
                BACKEND_NORMALIZE_URL,
                exc,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Không gọi được backend normalize (%s): %s", BACKEND_NORMALIZE_URL, exc)
            return


async def schedule_notify_backend_normalize(urls: list[str]) -> None:
    clean = [u.strip() for u in urls if u and str(u).strip()]
    if not clean:
        return
    await asyncio.to_thread(notify_backend_normalize, clean)


def _parse_coord_field(raw: object, *, max_abs: float) -> float | None:
    if raw is None or raw == "":
        return None
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return None
    if abs(value) > max_abs:
        return None
    return value


def _normalize_crawled_row(row: dict) -> dict:
    from config import GEOCODE_ON_CRAWL

    title = row.get("title", "")
    description = row.get("description", "")
    address = row.get("address", "") or ""
    latitude = _parse_coord_field(row.get("latitude"), max_abs=90)
    longitude = _parse_coord_field(row.get("longitude"), max_abs=180)

    if GEOCODE_ON_CRAWL and address.strip() and (latitude is None or longitude is None):
        try:
            from geocoding import geocode_for_crawl

            latitude, longitude = geocode_for_crawl(address, latitude, longitude)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Geocode crawl thất bại cho %s: %s", address[:80], exc)

    return {
        "url": row.get("url", ""),
        "title": title,
        "address": address,
        "latitude": latitude,
        "longitude": longitude,
        "price": _parse_price_to_int(row.get("price", "")),
        "area": _parse_area_to_float(row.get("area", "")),
        "room_type": _extract_room_type(title, description),
        "amenities": _extract_amenities(description),
        "phone": row.get("phone", ""),
        "description": description,
        "images": _serialize_images_for_db(row.get("images")),
        "posted_date": row.get("posted_date", ""),
    }


def _address_matches_location(row: dict, xa_phuong: str | None) -> bool:
    if not xa_phuong or not xa_phuong.strip():
        return True
    addr = str(row.get("address", "")).lower()
    return xa_phuong.strip().lower() in addr


def _extract_room_type(title: str, description: str) -> str:
    text = f"{title} {description}".lower()
    if "nhà nguyên căn" in text or "biet thu" in text:
        return "nha_cho_thue"
    if "căn hộ" in text or "can ho" in text or "studio" in text:
        return "can_ho"
    return "phong_tro"


def _extract_amenities(description: str) -> str:
    text = description.lower()
    tags = []
    mapping = {
        "wifi": ["wifi", "internet"],
        "may_lanh": ["máy lạnh", "dieu hoa", "điều hòa"],
        "noi_that": ["nội thất", "full đồ", "day du noi that"],
        "gara": ["gara", "để xe", "giu xe"],
        "wc_rieng": ["wc riêng", "toilet riêng", "ve sinh rieng"],
    }
    for key, keywords in mapping.items():
        if any(k in text for k in keywords):
            tags.append(key)
    return ",".join(tags)


def _parse_price_to_int(raw: str) -> int:
    digits = "".join(ch for ch in str(raw) if ch.isdigit())
    return int(digits) if digits else 0


def _parse_area_to_float(raw: str) -> float:
    cleaned = str(raw).lower().replace("m²", "").replace("m2", "").strip()
    cleaned = cleaned.replace(",", ".")
    num = ""
    for ch in cleaned:
        if ch.isdigit() or ch == ".":
            num += ch
    try:
        return float(num) if num else 0.0
    except ValueError:
        return 0.0


def _ensure_https_photo_url(u: str) -> str:
    u = (u or "").strip()
    if not u:
        return ""
    if u.startswith("//"):
        return "https:" + u
    if u.startswith("http://") or u.startswith("https://"):
        return u
    return "https://" + u.lstrip("/")


def _parse_images_field_to_list(raw: object) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, (list, tuple)):
        candidates = [str(x).strip() for x in raw if str(x).strip()]
    else:
        s = str(raw).strip()
        if not s:
            return []
        if s.startswith("["):
            try:
                data = json.loads(s)
            except json.JSONDecodeError:
                data = []
            candidates = [str(x).strip() for x in data] if isinstance(data, list) else []
        elif "|" in s:
            candidates = [x.strip() for x in s.split("|") if x.strip()]
        else:
            candidates = [s]
    return [_ensure_https_photo_url(u) for u in candidates if u]


def _serialize_images_for_db(raw: object) -> str:
    urls = _parse_images_field_to_list(raw)
    return json.dumps(urls, ensure_ascii=False) if urls else ""


def _expand_room_row_images(row: dict) -> dict:
    r = dict(row)
    r["image_urls"] = _parse_images_field_to_list(r.get("images"))
    return r


def _crawl_and_store(max_pages: int, max_items: int, list_url: str) -> dict:
    rows = crawl_all(max_pages=max_pages, max_items=max_items, list_url=list_url)
    if not rows:
        logger.warning("Crawl không thu được tin nào — kiểm tra log crawler / parser.")
    normalized = [_normalize_crawled_row(r) for r in rows]
    inserted = persist_normalized_rows(normalized)
    return {"count": len(rows), "saved": inserted, "normalized": normalized}


def _slugify_location(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    no_marks = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    no_marks = no_marks.replace("đ", "d").replace("Đ", "D").lower().strip()
    return re.sub(r"[^a-z0-9]+", "-", no_marks).strip("-")


def _resolve_list_url(list_url: str, tinh_thanh: str | None) -> str:
    if not tinh_thanh:
        return list_url
    return f"https://phongtro123.com/tinh-thanh/{_slugify_location(tinh_thanh)}"


def _match_amenities(room_amenities: str, requested: str | None) -> bool:
    if not requested:
        return True
    room_tokens = {x.strip().lower() for x in str(room_amenities or "").split(",") if x.strip()}
    req_tokens = [x.strip().lower() for x in requested.split(",") if x.strip()]
    return all(token in room_tokens for token in req_tokens)


def _row_matches_filters(row: dict, body: object) -> bool:
    title = str(row.get("title", ""))
    address = str(row.get("address", ""))
    keyword_hay = f"{title} {address}".lower()
    if getattr(body, "keyword", None) and str(body.keyword).strip().lower() not in keyword_hay:
        return False

    price = int(row.get("price", 0))
    area = float(row.get("area", 0))
    if getattr(body, "min_price", None) is not None and body.min_price > 0 and price < body.min_price:
        return False
    if getattr(body, "max_price", None) is not None and body.max_price > 0 and price > body.max_price:
        return False
    if getattr(body, "min_area", None) is not None and body.min_area > 0 and area < body.min_area:
        return False
    if getattr(body, "max_area", None) is not None and body.max_area > 0 and area > body.max_area:
        return False
    if getattr(body, "room_type", None) and str(row.get("room_type", "")).lower() != str(body.room_type).lower():
        return False
    if not _match_amenities(str(row.get("amenities", "")), getattr(body, "amenities", None)):
        return False
    return True


def init_db() -> None:
    init_crawl_table()
