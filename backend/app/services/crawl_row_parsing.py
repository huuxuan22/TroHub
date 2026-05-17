"""Parse trường `images` / `amenities` từ bảng crawl_data (khớp logic crawl service)."""

from __future__ import annotations

import json
import re
from typing import Any

_SLUG_SPLIT = re.compile(r"[\s,;|]+")


def ensure_https_photo_url(u: str) -> str:
    u = (u or "").strip()
    if not u:
        return ""
    if u.startswith("//"):
        return "https:" + u
    if u.startswith("http://") or u.startswith("https://"):
        return u
    return "https://" + u.lstrip("/")


def parse_images_field_to_list(raw: Any) -> list[str]:
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
    return [ensure_https_photo_url(u) for u in candidates if u]


def parse_amenity_tokens(raw: str | None) -> list[str]:
    if not raw or not str(raw).strip():
        return []
    parts = [p.strip() for p in _SLUG_SPLIT.split(str(raw)) if p.strip()]
    seen: set[str] = set()
    out: list[str] = []
    for p in parts:
        key = p.lower()
        if key not in seen:
            seen.add(key)
            out.append(p)
    return out


AMENITY_SLUG_TO_LABEL: dict[str, str] = {
    "wifi": "WiFi",
    "may_lanh": "Máy lạnh",
    "noi_that": "Nội thất",
    "gara": "Gara / để xe",
    "wc_rieng": "WC riêng",
}


def amenity_display_name(token: str) -> str:
    t = token.strip().lower().replace(" ", "_")
    if t in AMENITY_SLUG_TO_LABEL:
        return AMENITY_SLUG_TO_LABEL[t]
    if not token.strip():
        return ""
    return token.strip()


def map_crawl_room_type_slug(slug: str | None) -> str:
    s = (slug or "").strip().lower()
    if s == "can_ho":
        return "Căn hộ mini"
    if s == "nha_cho_thue":
        return "Nhà nguyên căn"
    return "Phòng trọ"
