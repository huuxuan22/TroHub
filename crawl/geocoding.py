"""Geocoding khi crawl — tái sử dụng `geocoding_service` của backend."""

from __future__ import annotations

import sys
from decimal import Decimal
from pathlib import Path

_REPO = Path(__file__).resolve().parent.parent
_BACKEND = _REPO / "backend"
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from app.services.geocoding_service import resolve_coordinates  # noqa: E402


def geocode_for_crawl(
    address: str,
    latitude: float | None = None,
    longitude: float | None = None,
) -> tuple[float | None, float | None]:
    lat, lng = resolve_coordinates(
        address=address or "",
        latitude=latitude,
        longitude=longitude,
        prefer_remote=True,
    )
    out_lat = float(lat) if isinstance(lat, Decimal) else (float(lat) if lat is not None else None)
    out_lng = float(lng) if isinstance(lng, Decimal) else (float(lng) if lng is not None else None)
    return out_lat, out_lng
