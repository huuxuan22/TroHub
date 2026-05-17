"""Tính toán số liệu dashboard admin."""
import re
from collections import Counter
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import LandlordProfile, Report, ReportStatus, Room, RoomStatus, User, UserRole


def extract_district_from_address(address: str) -> str:
    """Rút gọn khu vực (quận/huyện) từ chuỗi địa chỉ tiếng Việt."""
    if not address or not str(address).strip():
        return "Không rõ"

    addr = str(address).strip()
    match = re.search(r"(?:Quận|Quan|Q\.?)\s*(\d+)", addr, re.IGNORECASE)
    if match:
        return f"Quận {match.group(1)}"

    parts = [p.strip() for p in addr.split(",") if p.strip()]
    skip_tokens = ("tp.", "thanh pho", "hcm", "ho chi minh", "viet nam", "vietnam", "việt nam")

    for part in reversed(parts):
        low = part.lower()
        if re.search(r"phuong|phường|ward", low, re.IGNORECASE):
            continue
        if any(token in low for token in skip_tokens):
            continue
        if len(part) >= 2:
            return part[:120]

    return parts[0][:120] if parts else "Không rõ"


def compute_admin_stats(db: Session) -> dict:
    def _count(query):
        return int(query.scalar() or 0)

    total_users = _count(db.query(func.count(User.id)))
    total_tenants = _count(db.query(func.count(User.id)).filter(User.role == UserRole.TENANT))
    total_landlords = _count(db.query(func.count(User.id)).filter(User.role == UserRole.LANDLORD))
    total_admins = _count(db.query(func.count(User.id)).filter(User.role == UserRole.ADMIN))

    pending_apps = _count(
        db.query(func.count(LandlordProfile.id)).filter(LandlordProfile.is_verified == 0)
    )
    verified_landlords = _count(
        db.query(func.count(LandlordProfile.id)).filter(LandlordProfile.is_verified == 1)
    )
    total_landlord_profiles = pending_apps + verified_landlords
    verification_rate_percent = (
        round(verified_landlords / total_landlord_profiles * 100, 1)
        if total_landlord_profiles
        else 0.0
    )

    total_rooms = _count(db.query(func.count(Room.id)))
    rooms_pending = _count(
        db.query(func.count(Room.id)).filter(Room.status == RoomStatus.DRAFT)
    )
    rooms_available = _count(
        db.query(func.count(Room.id)).filter(Room.status == RoomStatus.AVAILABLE)
    )
    rooms_hidden = _count(
        db.query(func.count(Room.id)).filter(Room.status == RoomStatus.HIDDEN)
    )

    rooms_by_status = {
        status.value: _count(db.query(func.count(Room.id)).filter(Room.status == status))
        for status in RoomStatus
    }

    avg_raw = db.query(func.avg(Room.price)).scalar()
    average_rent_price = float(avg_raw) if avg_raw is not None else None

    addresses = [row[0] for row in db.query(Room.address).all()]
    district_counter = Counter(extract_district_from_address(addr) for addr in addresses)
    top_districts = [
        {"name": name, "count": count}
        for name, count in district_counter.most_common(6)
        if name and count > 0
    ]
    top_district_name = top_districts[0]["name"] if top_districts else None
    top_district_count = top_districts[0]["count"] if top_districts else 0

    total_reports = _count(db.query(func.count(Report.id)))
    pending_reports = _count(
        db.query(func.count(Report.id)).filter(Report.status == ReportStatus.PENDING)
    )

    return {
        "total_users": total_users,
        "total_tenants": total_tenants,
        "total_landlords": total_landlords,
        "total_admins": total_admins,
        "pending_landlord_applications": pending_apps,
        "verified_landlords": verified_landlords,
        "verification_rate_percent": verification_rate_percent,
        "total_rooms": total_rooms,
        "rooms_pending": rooms_pending,
        "rooms_available": rooms_available,
        "rooms_hidden": rooms_hidden,
        "rooms_by_status": rooms_by_status,
        "average_rent_price": average_rent_price,
        "top_district_name": top_district_name,
        "top_district_count": top_district_count,
        "top_districts": top_districts,
        "total_reports": total_reports,
        "violations_count": total_reports,
        "pending_reports": pending_reports,
    }
