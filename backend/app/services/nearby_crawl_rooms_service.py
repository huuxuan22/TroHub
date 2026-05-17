"""Phòng crawl mới gần vị trí người dùng (theo users.address)."""

from __future__ import annotations

import math
import os
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session, selectinload

from app.models import Room, RoomStatus, User
from app.services.geocoding_service import resolve_coordinates

NEARBY_MAX_KM = float(os.getenv("NEARBY_CRAWL_MAX_KM", "25"))
NEARBY_MAX_AGE_HOURS = int(os.getenv("NEARBY_CRAWL_MAX_AGE_HOURS", "168"))
NEARBY_DEFAULT_LIMIT = min(30, int(os.getenv("NEARBY_CRAWL_LIMIT", "30")))


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def list_nearby_new_crawl_rooms(
    db: Session,
    user: User,
    *,
    limit: int | None = None,
) -> list[dict]:
    """
    Trả về phòng source=crawl, available, có tọa độ, tạo gần đây, trong bán kính NEARBY_MAX_KM.
    Mỗi phần tử: {room: Room, distance_km: float}.
    """
    cap = min(limit or NEARBY_DEFAULT_LIMIT, 30)
    address = (user.address or "").strip()
    if not address:
        return []

    user_lat, user_lng = resolve_coordinates(address=address, prefer_remote=True)
    if user_lat is None or user_lng is None:
        return []

    u_lat = float(user_lat)
    u_lng = float(user_lng)
    since = datetime.utcnow() - timedelta(hours=NEARBY_MAX_AGE_HOURS)

    rooms = (
        db.query(Room)
        .options(selectinload(Room.images))
        .filter(
            Room.source == "crawl",
            Room.status == RoomStatus.AVAILABLE,
            Room.latitude.isnot(None),
            Room.longitude.isnot(None),
            Room.created_at >= since,
        )
        .order_by(Room.created_at.desc())
        .limit(200)
        .all()
    )

    scored: list[tuple[Room, float]] = []
    for room in rooms:
        if room.latitude is None or room.longitude is None:
            continue
        km = _haversine_km(u_lat, u_lng, float(room.latitude), float(room.longitude))
        if km <= NEARBY_MAX_KM:
            scored.append((room, km))

    scored.sort(key=lambda x: (x[1], -x[0].id))
    return [{"room": r, "distance_km": round(km, 2)} for r, km in scored[:cap]]
