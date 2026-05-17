"""10 phòng nổi bật cho modal ưu đãi sau đăng nhập."""

from __future__ import annotations

from sqlalchemy import desc
from sqlalchemy.orm import Session, selectinload

from app.models import Room, RoomAmenity, RoomStatus


def list_featured_hot_rooms(db: Session, *, limit: int = 10) -> list[Room]:
    cap = min(max(limit, 1), 10)
    return (
        db.query(Room)
        .options(
            selectinload(Room.images),
            selectinload(Room.room_amenities).selectinload(RoomAmenity.amenity),
        )
        .filter(Room.status == RoomStatus.AVAILABLE)
        .order_by(desc(Room.created_at), Room.id.desc())
        .limit(cap)
        .all()
    )
