from __future__ import annotations

import json
import logging
import os
import re
import unicodedata
from decimal import Decimal, InvalidOperation
from functools import lru_cache
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

LOGGER = logging.getLogger(__name__)
COORDINATE_SCALE = Decimal("0.0000001")

CITY_CENTERS = {
    "ha noi": (Decimal("21.0285110"), Decimal("105.8048170")),
    "hanoi": (Decimal("21.0285110"), Decimal("105.8048170")),
    "thanh pho ho chi minh": (Decimal("10.7768890"), Decimal("106.7008060")),
    "ho chi minh": (Decimal("10.7768890"), Decimal("106.7008060")),
    "tp hcm": (Decimal("10.7768890"), Decimal("106.7008060")),
    "tphcm": (Decimal("10.7768890"), Decimal("106.7008060")),
    "sai gon": (Decimal("10.7768890"), Decimal("106.7008060")),
    "da nang": (Decimal("16.0544070"), Decimal("108.2021670")),
    "danang": (Decimal("16.0544070"), Decimal("108.2021670")),
    "hai phong": (Decimal("20.8449110"), Decimal("106.6880840")),
    "haiphong": (Decimal("20.8449110"), Decimal("106.6880840")),
    "can tho": (Decimal("10.0451620"), Decimal("105.7468570")),
    "cantho": (Decimal("10.0451620"), Decimal("105.7468570")),
    "hue": (Decimal("16.4637130"), Decimal("107.5908660")),
    "thua thien hue": (Decimal("16.4637130"), Decimal("107.5908660")),
    "nha trang": (Decimal("12.2387910"), Decimal("109.1967490")),
    "khanh hoa": (Decimal("12.2585100"), Decimal("109.0526070")),
    "bien hoa": (Decimal("10.9446900"), Decimal("106.8243200")),
    "dong nai": (Decimal("11.0686300"), Decimal("107.1675970")),
    "thu duc": (Decimal("10.8494090"), Decimal("106.7537050")),
    "vung tau": (Decimal("10.4113790"), Decimal("107.1362240")),
    "ba ria vung tau": (Decimal("10.5417390"), Decimal("107.2429970")),
}


def _normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value or "")
    normalized = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    normalized = normalized.lower()
    normalized = re.sub(r"[^a-z0-9\s]", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def _sanitize_coordinate(value: object, max_abs: int) -> Decimal | None:
    if value in (None, ""):
        return None
    try:
        coordinate = Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None
    if abs(coordinate) > max_abs:
        return None
    return coordinate.quantize(COORDINATE_SCALE)


def _has_coordinates(latitude: object, longitude: object) -> bool:
    return _sanitize_coordinate(latitude, 90) is not None and _sanitize_coordinate(longitude, 180) is not None


def _infer_city_center(address: str) -> tuple[Decimal, Decimal] | None:
    normalized_address = _normalize_text(address)
    for keyword, coordinates in CITY_CENTERS.items():
        if keyword in normalized_address:
            return coordinates
    return None


def _build_search_queries(address: str) -> list[str]:
    cleaned_address = " ".join((address or "").split())
    if not cleaned_address:
        return []

    queries = [cleaned_address]
    normalized_address = _normalize_text(cleaned_address)
    if "viet nam" not in normalized_address and "vietnam" not in normalized_address:
        queries.append(f"{cleaned_address}, Viet Nam")
    return queries


@lru_cache(maxsize=512)
def _geocode_from_provider(address: str) -> tuple[Decimal, Decimal] | None:
    if not address:
        return None
    if os.getenv("GEOCODING_ENABLED", "true").strip().lower() in {"0", "false", "no", "off"}:
        return None

    base_url = os.getenv("GEOCODING_BASE_URL", "https://nominatim.openstreetmap.org/search").strip()
    user_agent = os.getenv("GEOCODING_USER_AGENT", "TroHub/1.0 geocoder").strip() or "TroHub/1.0 geocoder"
    timeout_seconds = float(os.getenv("GEOCODING_TIMEOUT_SECONDS", "4").strip() or "4")

    for query in _build_search_queries(address):
        params = urlencode(
            {
                "q": query,
                "format": "jsonv2",
                "limit": "1",
                "countrycodes": "vn",
                "addressdetails": "1",
            }
        )
        request = Request(
            f"{base_url}?{params}",
            headers={
                "User-Agent": user_agent,
                "Accept": "application/json",
                "Accept-Language": "vi",
            },
        )
        try:
            with urlopen(request, timeout=timeout_seconds) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, ValueError) as exc:
            LOGGER.warning("Geocoding failed for address '%s': %s", address, exc)
            return None

        if not payload:
            continue

        latitude = _sanitize_coordinate(payload[0].get("lat"), 90)
        longitude = _sanitize_coordinate(payload[0].get("lon"), 180)
        if latitude is not None and longitude is not None:
            return latitude, longitude

    return None


def resolve_coordinates(
    *,
    address: str,
    latitude: object = None,
    longitude: object = None,
    prefer_remote: bool = True,
    force_lookup: bool = False,
) -> tuple[Decimal | None, Decimal | None]:
    sanitized_latitude = _sanitize_coordinate(latitude, 90)
    sanitized_longitude = _sanitize_coordinate(longitude, 180)

    if not force_lookup and sanitized_latitude is not None and sanitized_longitude is not None:
        return sanitized_latitude, sanitized_longitude

    if prefer_remote:
        remote_coordinates = _geocode_from_provider(" ".join((address or "").split()))
        if remote_coordinates:
            return remote_coordinates

    fallback_coordinates = _infer_city_center(address)
    if fallback_coordinates:
        return fallback_coordinates

    if sanitized_latitude is not None and sanitized_longitude is not None:
        return sanitized_latitude, sanitized_longitude

    return None, None


def has_valid_coordinates(latitude: object, longitude: object) -> bool:
    return _has_coordinates(latitude, longitude)


@lru_cache(maxsize=512)
def reverse_geocode(latitude: str, longitude: str) -> dict | None:
    """Đổi lat/lng (string để cache hoạt động) thành địa chỉ qua Nominatim.

    Trả về dict {address, display_name, latitude, longitude, city?, district?} hoặc None.
    """
    lat = _sanitize_coordinate(latitude, 90)
    lng = _sanitize_coordinate(longitude, 180)
    if lat is None or lng is None:
        return None
    if os.getenv("GEOCODING_ENABLED", "true").strip().lower() in {"0", "false", "no", "off"}:
        return None

    base_url = os.getenv("GEOCODING_REVERSE_URL", "https://nominatim.openstreetmap.org/reverse").strip()
    user_agent = os.getenv("GEOCODING_USER_AGENT", "TroHub/1.0 geocoder").strip() or "TroHub/1.0 geocoder"
    timeout_seconds = float(os.getenv("GEOCODING_TIMEOUT_SECONDS", "4").strip() or "4")

    params = urlencode(
        {
            "lat": str(lat),
            "lon": str(lng),
            "format": "jsonv2",
            "addressdetails": "1",
            "accept-language": "vi",
            "zoom": "18",
        }
    )
    request = Request(
        f"{base_url}?{params}",
        headers={
            "User-Agent": user_agent,
            "Accept": "application/json",
            "Accept-Language": "vi",
        },
    )
    try:
        with urlopen(request, timeout=timeout_seconds) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, ValueError) as exc:
        LOGGER.warning("Reverse geocoding failed for %s,%s: %s", lat, lng, exc)
        return None

    if not isinstance(payload, dict):
        return None

    address_parts = payload.get("address") or {}
    display_name = payload.get("display_name") or ""

    # Trả về địa chỉ dạng "Số nhà Đường, Phường, Quận, Thành phố" — bỏ "Việt Nam" + mã ZIP.
    keys_in_order = [
        "house_number",
        "road",
        "suburb",
        "neighbourhood",
        "village",
        "town",
        "city_district",
        "district",
        "city",
        "state",
    ]
    pieces: list[str] = []
    seen: set[str] = set()
    for key in keys_in_order:
        value = address_parts.get(key)
        if value and value not in seen:
            seen.add(value)
            pieces.append(value)
    short_address = ", ".join(pieces) or display_name

    return {
        "latitude": str(lat),
        "longitude": str(lng),
        "address": short_address,
        "display_name": display_name,
        "city": address_parts.get("city")
        or address_parts.get("town")
        or address_parts.get("state"),
        "district": address_parts.get("city_district") or address_parts.get("district"),
    }
