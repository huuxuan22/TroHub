"""
Giao dịch chuẩn hóa crawl_data → rooms / room_images / amenities / room_amenities.

Mỗi URL được xử lý trong một transaction riêng (commit sau mỗi phòng thành công).
"""

from __future__ import annotations

import logging
import os
from decimal import Decimal
from typing import Literal

from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import (
    Amenity,
    CrawlData,
    LandlordProfile,
    Room,
    RoomAmenity,
    RoomImage,
    RoomStatus,
    User,
    UserRole,
    UserStatus,
)
from app.services.crawl_row_parsing import (
    amenity_display_name,
    map_crawl_room_type_slug,
    parse_amenity_tokens,
    parse_images_field_to_list,
)
from app.services.geocoding_service import resolve_coordinates
from app.services.users_service import get_password_hash

logger = logging.getLogger("trohub.crawl_normalize")

Outcome = Literal["inserted", "skipped", "missing", "error"]

CRAWL_LANDLORD_EMAIL = os.getenv("CRAWL_IMPORT_LANDLORD_EMAIL", "crawler.system@trohub.local").strip()


def _truncate(s: str, max_len: int) -> str:
    if len(s) <= max_len:
        return s
    return s[:max_len]


def _get_or_create_crawl_landlord(session: Session) -> int:
    user = session.scalar(select(User).where(User.email == CRAWL_LANDLORD_EMAIL))
    if user is None:
        user = User(
            full_name="Hệ thống (crawl)",
            email=CRAWL_LANDLORD_EMAIL,
            password_hash=get_password_hash("crawler-no-login-placeholder"),
            role=UserRole.LANDLORD,
            phone_number=None,
            status=UserStatus.ACTIVE,
        )
        session.add(user)
        session.flush()
        session.add(
            LandlordProfile(
                user_id=user.id,
                business_name="Nguồn crawl",
                national_id=None,
                business_license=None,
                is_verified=0,
            )
        )
        session.flush()
        return user.id

    prof = session.scalar(select(LandlordProfile).where(LandlordProfile.user_id == user.id))
    if prof is None:
        session.add(
            LandlordProfile(
                user_id=user.id,
                business_name="Nguồn crawl",
                national_id=None,
                business_license=None,
                is_verified=0,
            )
        )
        session.flush()
    return user.id


def _room_already_exists(session: Session, *, source_url: str, title_for_room: str) -> bool:
    q = select(Room.id).where(
        or_(
            Room.source_url == source_url,
            Room.title == title_for_room,
        )
    )
    return session.scalar(q.limit(1)) is not None


def _get_or_create_amenity(session: Session, display_name: str) -> Amenity | None:
    name = display_name.strip()
    if not name:
        return None
    found = session.scalar(select(Amenity).where(Amenity.name == name))
    if found is not None:
        return found
    with session.begin_nested():
        try:
            a = Amenity(name=name)
            session.add(a)
            session.flush()
            return a
        except IntegrityError:
            pass
    return session.scalar(select(Amenity).where(Amenity.name == name))


def normalize_one_crawl_url(session: Session, url: str, landlord_id: int) -> Outcome:
    row = session.get(CrawlData, url)
    if row is None:
        return "missing"

    title_room = _truncate(row.title or "", 255)
    if _room_already_exists(session, source_url=row.url, title_for_room=title_room):
        return "skipped"

    price_dec = Decimal(int(row.price or 0))
    area_dec = Decimal(str(float(row.area or 0))) if row.area else None
    address = _truncate((row.address or "").strip() or "Chưa cập nhật", 500)

    latitude, longitude = resolve_coordinates(
        address=address,
        latitude=row.latitude,
        longitude=row.longitude,
        prefer_remote=True,
    )

    room = Room(
        title=title_room,
        room_type=map_crawl_room_type_slug(row.room_type),
        description=row.description,
        price=price_dec,
        area_sqm=area_dec,
        address=address,
        latitude=latitude,
        longitude=longitude,
        status=RoomStatus.AVAILABLE,
        source="crawl",
        source_url=row.url,
        landlord_id=landlord_id,
        expires_at=None,
    )
    session.add(room)
    session.flush()

    image_urls = parse_images_field_to_list(row.images)
    seen_img: set[str] = set()
    for raw_u in image_urls:
        u = _truncate(raw_u, 600)
        if not u or u in seen_img:
            continue
        seen_img.add(u)
        session.add(RoomImage(room_id=room.id, image_url=u))

    tokens = parse_amenity_tokens(row.amenities)
    seen_am: set[str] = set()
    for tok in tokens:
        label = amenity_display_name(tok)
        if not label or label.lower() in seen_am:
            continue
        seen_am.add(label.lower())
        amenity = _get_or_create_amenity(session, label)
        if amenity is None:
            continue
        session.add(RoomAmenity(room_id=room.id, amenity_id=amenity.id))

    return "inserted"


def normalize_crawl_urls(urls: list[str]) -> dict[str, int]:
    """
    Chuẩn hóa từng URL trong danh sách (mỗi URL một transaction commit riêng).

    Trả về đếm inserted / skipped / missing / errors.
    """
    stats = {"inserted": 0, "skipped": 0, "missing": 0, "errors": 0}
    if not urls:
        return stats

    landlord_db = SessionLocal()
    landlord_id: int | None = None
    try:
        with landlord_db.begin():
            landlord_id = _get_or_create_crawl_landlord(landlord_db)
    except Exception:
        logger.exception("Không tạo/không lấy được landlord crawl hệ thống")
        stats["errors"] = len(urls)
        return stats
    finally:
        landlord_db.close()

    if landlord_id is None:
        stats["errors"] = len(urls)
        return stats

    for url in urls:
        if not url or not str(url).strip():
            continue
        u = str(url).strip()
        db = SessionLocal()
        try:
            with db.begin():
                out = normalize_one_crawl_url(db, u, landlord_id)
                if out == "inserted":
                    stats["inserted"] += 1
                elif out == "skipped":
                    stats["skipped"] += 1
                elif out == "missing":
                    stats["missing"] += 1
        except Exception:
            logger.exception("Lỗi chuẩn hóa crawl url=%s", u[:120])
            stats["errors"] += 1
        finally:
            db.close()

    return stats
