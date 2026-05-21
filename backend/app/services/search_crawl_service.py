import hashlib
import json
import logging
import os
import threading
import time
from typing import Any

import httpx
from fastapi import BackgroundTasks

from app.models import SearchHistory
from app.services.geocoding_service import reverse_geocode

logger = logging.getLogger("trohub.search_crawl")

_recent_lock = threading.Lock()
_recent_fingerprints: dict[str, float] = {}


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def _env_int(name: str, default: int, *, min_value: int, max_value: int) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default
    return max(min_value, min(value, max_value))


def _clean_text(value: Any, *, max_len: int = 255) -> str | None:
    text = str(value or "").strip()
    if not text:
        return None
    return text[:max_len]


def _first_filter(filters: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = filters.get(key)
        if value not in (None, ""):
            return value
    return None


def _number(value: Any, *, integer: bool = False) -> int | float | None:
    if value in (None, ""):
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if parsed <= 0:
        return None
    return int(parsed) if integer else parsed


def _coordinate(value: Any, *, max_abs: int) -> float | None:
    if value in (None, ""):
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return parsed if abs(parsed) <= max_abs else None


def _room_type_slug(value: Any) -> str | None:
    text = str(value or "").strip().lower()
    if not text:
        return None
    mapping = {
        "phòng trọ": "phong_tro",
        "phong tro": "phong_tro",
        "phong_tro": "phong_tro",
        "căn hộ": "can_ho",
        "can ho": "can_ho",
        "can_ho": "can_ho",
        "nhà nguyên căn": "nha_cho_thue",
        "nha nguyen can": "nha_cho_thue",
        "nhà cho thuê": "nha_cho_thue",
        "nha cho thue": "nha_cho_thue",
        "nha_cho_thue": "nha_cho_thue",
    }
    return mapping.get(text, text if text in {"phong_tro", "can_ho", "nha_cho_thue"} else None)


def _amenities_value(value: Any) -> str | None:
    if isinstance(value, (list, tuple, set)):
        items = [str(item).strip() for item in value if str(item).strip()]
        return ",".join(items) or None
    return _clean_text(value)


def _build_crawl_payload_from_values(keyword_value: Any, filters_value: Any) -> dict[str, Any] | None:
    filters = filters_value if isinstance(filters_value, dict) else {}
    latitude = _coordinate(_first_filter(filters, "latitude", "lat"), max_abs=90)
    longitude = _coordinate(_first_filter(filters, "longitude", "lng", "lon"), max_abs=180)
    geo = reverse_geocode(str(latitude), str(longitude)) if latitude is not None and longitude is not None else None
    city = _clean_text(_first_filter(filters, "city", "tinh_thanh") or (geo or {}).get("city"), max_len=120)
    location_keyword = _first_filter(filters, "district", "address") or (geo or {}).get("district") or (geo or {}).get("address")
    keyword = _clean_text(keyword_value or _first_filter(filters, "query", "keyword") or location_keyword)

    payload: dict[str, Any] = {
        "keyword": keyword,
        "tinh_thanh": city,
        "min_price": _number(_first_filter(filters, "min_price", "budget_min"), integer=True),
        "max_price": _number(_first_filter(filters, "max_price", "budget_max"), integer=True),
        "min_area": _number(_first_filter(filters, "min_area", "minArea")),
        "max_area": _number(_first_filter(filters, "max_area", "maxArea")),
        "amenities": _amenities_value(_first_filter(filters, "amenities")),
        "room_type": _room_type_slug(_first_filter(filters, "room_type", "type")),
        "max_pages": _env_int("SEARCH_CRAWL_MAX_PAGES", 2, min_value=1, max_value=20),
        "max_items": _env_int("SEARCH_CRAWL_MAX_ITEMS", 30, min_value=5, max_value=200),
    }
    payload = {key: value for key, value in payload.items() if value is not None}

    has_search_signal = any(
        key in payload
        for key in ("keyword", "tinh_thanh", "min_price", "max_price", "min_area", "max_area", "amenities", "room_type")
    )
    return payload if has_search_signal else None


def _build_crawl_payload(history: SearchHistory) -> dict[str, Any] | None:
    return _build_crawl_payload_from_values(history.keyword, history.filters)


def _fingerprint(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _already_recent(payload: dict[str, Any]) -> bool:
    dedupe_seconds = _env_int("SEARCH_CRAWL_DEDUPE_SECONDS", 600, min_value=0, max_value=86400)
    if dedupe_seconds <= 0:
        return False
    now = time.monotonic()
    fp = _fingerprint(payload)
    with _recent_lock:
        expired = [key for key, ts in _recent_fingerprints.items() if now - ts > dedupe_seconds]
        for key in expired:
            _recent_fingerprints.pop(key, None)
        previous = _recent_fingerprints.get(fp)
        if previous is not None and now - previous <= dedupe_seconds:
            return True
        _recent_fingerprints[fp] = now
    return False


def _crawler_url() -> str:
    default_base = "http://crawler:8002" if os.path.exists("/.dockerenv") else "http://127.0.0.1:8002"
    base = os.getenv("SEARCH_CRAWL_BASE_URL") or os.getenv("CRAWLER_BASE_URL") or default_base
    return f"{base.rstrip('/')}/crawl/by-filters"


def _run_search_crawl_payload(history_id: int, payload: dict[str, Any]) -> None:
    timeout = _env_int("SEARCH_CRAWL_TIMEOUT_SECONDS", 120, min_value=5, max_value=900)
    url = _crawler_url()
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.post(url, json=payload)
            response.raise_for_status()
        logger.info("Search history #%s triggered crawl: %s", history_id, payload)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Search history #%s could not trigger crawl (%s): %s", history_id, url, exc)


def _run_search_crawl_from_history(history_id: int, keyword: str | None, filters: dict[str, Any] | None) -> None:
    payload = _build_crawl_payload_from_values(keyword, filters)
    if not payload:
        return
    if _already_recent(payload):
        return
    _run_search_crawl_payload(history_id, payload)


def schedule_crawl_from_search_history(background_tasks: BackgroundTasks, history: SearchHistory) -> None:
    if not _env_bool("SEARCH_CRAWL_ENABLED", True):
        return

    filters = dict(history.filters) if isinstance(history.filters, dict) else None
    background_tasks.add_task(_run_search_crawl_from_history, history.id, history.keyword, filters)
