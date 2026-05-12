from __future__ import annotations

import sys
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path

from sqlalchemy import select

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal
from app.models import LandlordProfile, Room, RoomStatus, User, UserRole, UserStatus

SEED_PASSWORD_HASH = "seed-data-not-for-login"

SEED_LANDLORDS = [
    {
        "email": "seed.landlord1@trohub.local",
        "full_name": "Chu tro Quan 10",
        "phone_number": "0901000001",
    },
    {
        "email": "seed.landlord2@trohub.local",
        "full_name": "Chu tro Quan 7",
        "phone_number": "0901000002",
    },
    {
        "email": "seed.landlord3@trohub.local",
        "full_name": "Chu tro Thu Duc",
        "phone_number": "0901000003",
    },
]

SEED_ROOMS = [
    {
        "title": "Phong tro gan DH Bach Khoa",
        "room_type": "Phòng trọ",
        "price": Decimal("3200000"),
        "area_sqm": Decimal("18"),
        "address": "268 Ly Thuong Kiet, Phuong 14, Quan 10, TP.HCM",
        "latitude": Decimal("10.7737000"),
        "longitude": Decimal("106.6602000"),
        "description": "Phong co gac, gio giac tu do, gan truong.",
        "landlord_email": "seed.landlord1@trohub.local",
        "created_at": datetime.utcnow() - timedelta(hours=6),
    },
    {
        "title": "Studio mini Quan 7 gan lotte",
        "room_type": "Căn hộ mini",
        "price": Decimal("5000000"),
        "area_sqm": Decimal("26"),
        "address": "469 Nguyen Huu Tho, Tan Hung, Quan 7, TP.HCM",
        "latitude": Decimal("10.7322000"),
        "longitude": Decimal("106.7036000"),
        "description": "Noi that co ban, an ninh, co thang may.",
        "landlord_email": "seed.landlord2@trohub.local",
        "created_at": datetime.utcnow() - timedelta(days=1, hours=2),
    },
    {
        "title": "Phong cho thue gan ben xe Mien Dong",
        "room_type": "Phòng trọ",
        "price": Decimal("2700000"),
        "area_sqm": Decimal("15"),
        "address": "292 Dinh Bo Linh, Phuong 26, Binh Thanh, TP.HCM",
        "latitude": Decimal("10.8116000"),
        "longitude": Decimal("106.7118000"),
        "description": "Phong moi, co cho de xe, gan tram xe buyt.",
        "landlord_email": "seed.landlord1@trohub.local",
        "created_at": datetime.utcnow() - timedelta(days=2, hours=5),
    },
    {
        "title": "Can ho mini gan cong vien Gia Dinh",
        "room_type": "Căn hộ mini",
        "price": Decimal("6200000"),
        "area_sqm": Decimal("30"),
        "address": "12 Nguyen Kiem, Phuong 9, Phu Nhuan, TP.HCM",
        "latitude": Decimal("10.8016000"),
        "longitude": Decimal("106.6775000"),
        "description": "Can ho mini co bep rieng, may giat chung.",
        "landlord_email": "seed.landlord2@trohub.local",
        "created_at": datetime.utcnow() - timedelta(days=3),
    },
    {
        "title": "Phong tro gan cho Ben Thanh",
        "room_type": "Phòng trọ",
        "price": Decimal("4800000"),
        "area_sqm": Decimal("22"),
        "address": "45 Le Thi Rieng, Ben Thanh, Quan 1, TP.HCM",
        "latitude": Decimal("10.7705000"),
        "longitude": Decimal("106.6920000"),
        "description": "Phu hop nguoi di lam trung tam, ra vao van tay.",
        "landlord_email": "seed.landlord1@trohub.local",
        "created_at": datetime.utcnow() - timedelta(days=4),
    },
    {
        "title": "Phong dep Thu Duc gan khu CNC",
        "room_type": "Phòng trọ",
        "price": Decimal("3900000"),
        "area_sqm": Decimal("20"),
        "address": "Xa Lo Ha Noi, Linh Trung, Thu Duc, TP.HCM",
        "latitude": Decimal("10.8574000"),
        "longitude": Decimal("106.7869000"),
        "description": "Gan khu cong nghe cao, co ban cong, internet manh.",
        "landlord_email": "seed.landlord3@trohub.local",
        "created_at": datetime.utcnow() - timedelta(days=5),
    },
]


def get_or_create_landlord(db, spec: dict) -> User:
    user = db.execute(select(User).where(User.email == spec["email"])).scalar_one_or_none()
    if user is None:
        user = User(
            full_name=spec["full_name"],
            email=spec["email"],
            password_hash=SEED_PASSWORD_HASH,
            role=UserRole.LANDLORD,
            phone_number=spec["phone_number"],
            status=UserStatus.ACTIVE,
        )
        db.add(user)
        db.flush()
        _ensure_seed_landlord_profile(db, user)
        return user

    user.full_name = spec["full_name"]
    user.phone_number = spec["phone_number"]
    user.role = UserRole.LANDLORD
    user.status = UserStatus.ACTIVE
    _ensure_seed_landlord_profile(db, user)
    return user


def _ensure_seed_landlord_profile(db, user: User) -> None:
    existing = db.execute(select(LandlordProfile).where(LandlordProfile.user_id == user.id)).scalar_one_or_none()
    if existing is None:
        db.add(
            LandlordProfile(
                user_id=user.id,
                business_name=user.full_name,
                national_id="SEED",
                business_license=None,
                is_verified=1,
            )
        )
    else:
        existing.is_verified = 1


def upsert_room(db, spec: dict, landlord_id: int) -> None:
    room = db.execute(select(Room).where(Room.title == spec["title"])).scalar_one_or_none()
    if room is None:
        room = Room(title=spec["title"])
        db.add(room)

    room.room_type = spec["room_type"]
    room.description = spec["description"]
    room.price = spec["price"]
    room.area_sqm = spec["area_sqm"]
    room.address = spec["address"]
    room.latitude = spec["latitude"]
    room.longitude = spec["longitude"]
    room.status = RoomStatus.AVAILABLE
    room.source = "owner"
    room.landlord_id = landlord_id
    room.created_at = spec["created_at"]
    room.expires_at = datetime.utcnow() + timedelta(days=45)


def main() -> None:
    db = SessionLocal()
    try:
        landlords = {
            spec["email"]: get_or_create_landlord(db, spec)
            for spec in SEED_LANDLORDS
        }

        for spec in SEED_ROOMS:
            upsert_room(db, spec, landlords[spec["landlord_email"]].id)

        db.commit()
        print(f"Seeded {len(SEED_ROOMS)} rooms into database.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
