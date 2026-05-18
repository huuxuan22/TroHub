"""Yêu cầu nhận quyền sở hữu phòng crawl → admin duyệt → chuyển landlord + source owner."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Room, RoomClaim
from app.schemas import RoomClaimCreate
from app.services.crawl_listing_service import room_is_crawled_listing
from app.services.exceptions import NotFoundError


class ClaimError(Exception):
    """Lỗi nghiệp vụ claim (map sang HTTP 400)."""


def create_room_claim(db: Session, *, room: Room, user_id: int, payload: RoomClaimCreate) -> RoomClaim:
    if not room_is_crawled_listing(room, db):
        raise ClaimError("Can only claim crawled rooms")

    pending = db.scalar(
        select(RoomClaim.id).where(RoomClaim.room_id == room.id, RoomClaim.status == "pending").limit(1)
    )
    if pending is not None:
        raise ClaimError("A pending claim already exists for this room")

    claim = RoomClaim(
        room_id=room.id,
        user_id=user_id,
        status="pending",
        phone_number=payload.phone_number,
        evidence=payload.evidence,
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return claim


def approve_room_claim(db: Session, claim_id: int) -> RoomClaim:
    claim = db.get(RoomClaim, claim_id)
    if claim is None:
        raise NotFoundError("Claim not found")
    if claim.status != "pending":
        raise ClaimError(f"Claim is already {claim.status}")

    room = db.get(Room, claim.room_id)
    if room is None:
        raise NotFoundError("Room not found")

    claim.status = "approved"
    room.landlord_id = claim.user_id
    room.source = "owner"
    db.commit()
    db.refresh(claim)
    db.refresh(room)
    return claim


def list_room_claims(db: Session, *, status: str | None = None, limit: int = 50) -> list[RoomClaim]:
    query = db.query(RoomClaim).order_by(RoomClaim.created_at.desc())
    if status:
        query = query.filter(RoomClaim.status == status)
    return query.limit(limit).all()
