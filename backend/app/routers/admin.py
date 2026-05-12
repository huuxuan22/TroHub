"""Trang quản trị: thống kê, duyệt chủ nhà, quản lý người dùng/phòng/báo cáo."""
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import (
    LandlordProfile,
    Notification,
    Report,
    ReportStatus,
    Room,
    RoomStatus,
    User,
    UserRole,
    UserStatus,
)
from app.schemas import (
    AdminStatsOut,
    LandlordApplicationOut,
    LandlordProfileCounts,
    LandlordRejectIn,
    ReportOut,
    ReportStatusPatch,
    RoomOut,
    RoomStatusPatch,
    UserOut,
    UserStatusPatch,
)
from app.services.auth_service import require_roles
from app.services.exceptions import NotFoundError
from app.services.users_service import delete_user as delete_user_service

router = APIRouter(prefix="/trohub/admin", tags=["admin"])

# Mọi endpoint trong router yêu cầu vai trò ADMIN (kèm token hợp lệ).
admin_dep = require_roles(UserRole.ADMIN)


# ---------- Tổng quan ----------

@router.get("/stats", response_model=AdminStatsOut)
def admin_stats(db: Session = Depends(get_db), _: User = Depends(admin_dep)):
    """Trả các con số tổng quan cho widget dashboard."""

    def _count(query):
        return int(query.scalar() or 0)

    total_users = _count(db.query(func.count(User.id)))
    total_tenants = _count(
        db.query(func.count(User.id)).filter(User.role == UserRole.TENANT)
    )
    total_landlords = _count(
        db.query(func.count(User.id)).filter(User.role == UserRole.LANDLORD)
    )
    total_admins = _count(
        db.query(func.count(User.id)).filter(User.role == UserRole.ADMIN)
    )

    pending_apps = _count(
        db.query(func.count(LandlordProfile.id)).filter(LandlordProfile.is_verified == 0)
    )
    verified_landlords = _count(
        db.query(func.count(LandlordProfile.id)).filter(LandlordProfile.is_verified == 1)
    )

    total_rooms = _count(db.query(func.count(Room.id)))
    rooms_available = _count(
        db.query(func.count(Room.id)).filter(Room.status == RoomStatus.AVAILABLE)
    )
    rooms_hidden = _count(
        db.query(func.count(Room.id)).filter(Room.status == RoomStatus.HIDDEN)
    )

    total_reports = _count(db.query(func.count(Report.id)))
    pending_reports = _count(
        db.query(func.count(Report.id)).filter(Report.status == ReportStatus.PENDING)
    )

    return AdminStatsOut(
        total_users=total_users,
        total_tenants=total_tenants,
        total_landlords=total_landlords,
        total_admins=total_admins,
        pending_landlord_applications=pending_apps,
        verified_landlords=verified_landlords,
        total_rooms=total_rooms,
        rooms_available=rooms_available,
        rooms_hidden=rooms_hidden,
        total_reports=total_reports,
        pending_reports=pending_reports,
    )


# ---------- Duyệt chủ nhà ----------

@router.get("/landlord-profiles/counts", response_model=LandlordProfileCounts)
def landlord_profile_counts(
    db: Session = Depends(get_db),
    _: User = Depends(admin_dep),
):
    """Đếm nhanh số hồ sơ theo trạng thái, dùng cho badge ở tab."""
    pending = int(
        db.query(func.count(LandlordProfile.id))
        .filter(LandlordProfile.is_verified == 0)
        .scalar()
        or 0
    )
    verified = int(
        db.query(func.count(LandlordProfile.id))
        .filter(LandlordProfile.is_verified == 1)
        .scalar()
        or 0
    )
    return LandlordProfileCounts(pending=pending, verified=verified, total=pending + verified)


@router.get("/landlord-profiles", response_model=list[LandlordApplicationOut])
def list_landlord_profiles(
    state: Literal["all", "pending", "verified"] = Query(default="pending"),
    keyword: str | None = Query(default=None, description="Tìm theo tên kinh doanh, họ tên hoặc email"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(admin_dep),
):
    """Danh sách hồ sơ chủ nhà — mặc định lấy hồ sơ chờ duyệt."""
    query = (
        db.query(LandlordProfile)
        .join(User, LandlordProfile.user_id == User.id)
        .options(joinedload(LandlordProfile.user))
        .order_by(LandlordProfile.created_at.desc())
    )
    if state == "pending":
        query = query.filter(LandlordProfile.is_verified == 0)
    elif state == "verified":
        query = query.filter(LandlordProfile.is_verified == 1)

    if keyword:
        like = f"%{keyword.strip()}%"
        query = query.filter(
            or_(
                LandlordProfile.business_name.ilike(like),
                User.full_name.ilike(like),
                User.email.ilike(like),
            )
        )

    return query.offset(skip).limit(limit).all()


@router.get("/landlord-profiles/{user_id}", response_model=LandlordApplicationOut)
def get_landlord_profile(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(admin_dep),
):
    """Xem chi tiết một hồ sơ chủ nhà (dùng cho modal chi tiết bên admin)."""
    prof = (
        db.query(LandlordProfile)
        .options(joinedload(LandlordProfile.user))
        .filter(LandlordProfile.user_id == user_id)
        .first()
    )
    if not prof:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng chưa có hồ sơ chủ nhà.",
        )
    return prof


@router.patch("/landlord-profiles/{user_id}/approve", response_model=UserOut)
def approve_landlord_profile(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(admin_dep),
):
    user = (
        db.query(User)
        .options(joinedload(User.landlord_profile))
        .filter(User.id == user_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng")
    prof = user.landlord_profile
    if prof is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Người dùng chưa gửi hồ sơ chủ nhà.",
        )
    prof.is_verified = 1
    user.role = UserRole.LANDLORD

    db.add(
        Notification(
            user_id=user.id,
            content=(
                "🎉 Hồ sơ chủ nhà của bạn đã được admin duyệt. "
                "Bạn có thể đăng tin và quản lý phòng từ bây giờ."
            ),
        )
    )

    db.commit()
    db.refresh(user)
    return user


@router.patch("/landlord-profiles/{user_id}/reject", response_model=UserOut)
def reject_landlord_profile(
    user_id: int,
    payload: LandlordRejectIn | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(admin_dep),
):
    """Từ chối hồ sơ: xoá profile để chủ nhà có thể nộp lại; user trở về vai trò tenant.

    Có thể kèm `reason` để gửi vào Notification cho user biết lý do bị từ chối.
    """
    user = (
        db.query(User)
        .options(joinedload(User.landlord_profile))
        .filter(User.id == user_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng")
    prof = user.landlord_profile
    if prof is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Người dùng chưa có hồ sơ chủ nhà để từ chối.",
        )

    reason = (payload.reason or "").strip() if payload else ""
    note_content = "❌ Hồ sơ chủ nhà của bạn đã bị từ chối."
    if reason:
        note_content += f" Lý do: {reason}"
    note_content += " Bạn có thể chỉnh sửa thông tin và gửi lại."

    db.delete(prof)
    if user.role == UserRole.LANDLORD:
        user.role = UserRole.TENANT

    db.add(Notification(user_id=user.id, content=note_content))

    db.commit()
    db.refresh(user)
    return user


# ---------- Người dùng ----------

@router.get("/users", response_model=list[UserOut])
def admin_list_users(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    keyword: str | None = Query(default=None, description="Tìm theo họ tên hoặc email"),
    role: Literal["tenant", "landlord", "admin"] | None = Query(default=None),
    user_status: Literal["active", "inactive", "banned"] | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    _: User = Depends(admin_dep),
):
    query = db.query(User).options(joinedload(User.landlord_profile)).order_by(User.created_at.desc())
    if keyword:
        like = f"%{keyword.strip()}%"
        query = query.filter(or_(User.full_name.ilike(like), User.email.ilike(like)))
    if role:
        query = query.filter(User.role == UserRole(role))
    if user_status:
        query = query.filter(User.status == UserStatus(user_status))
    return query.offset(skip).limit(limit).all()


@router.patch("/users/{user_id}/status", response_model=UserOut)
def admin_update_user_status(
    user_id: int,
    payload: UserStatusPatch,
    db: Session = Depends(get_db),
    admin_user: User = Depends(admin_dep),
):
    if user_id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể thay đổi trạng thái của chính tài khoản admin đang đăng nhập.",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng")
    user.status = UserStatus(payload.status.value)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(admin_dep),
):
    if user_id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xoá chính tài khoản admin đang đăng nhập.",
        )
    try:
        delete_user_service(db=db, user_id=user_id)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng") from None
    return None


# ---------- Phòng / tin đăng ----------

@router.get("/rooms", response_model=list[RoomOut])
def admin_list_rooms(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    keyword: str | None = Query(default=None),
    room_status: Literal["draft", "available", "rented", "hidden", "expired"] | None = Query(
        default=None, alias="status"
    ),
    db: Session = Depends(get_db),
    _: User = Depends(admin_dep),
):
    query = db.query(Room).order_by(Room.created_at.desc())
    if keyword:
        like = f"%{keyword.strip()}%"
        query = query.filter(or_(Room.title.ilike(like), Room.address.ilike(like)))
    if room_status:
        query = query.filter(Room.status == RoomStatus(room_status))
    return query.offset(skip).limit(limit).all()


@router.patch("/rooms/{room_id}/status", response_model=RoomOut)
def admin_update_room_status(
    room_id: int,
    payload: RoomStatusPatch,
    db: Session = Depends(get_db),
    _: User = Depends(admin_dep),
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    room.status = RoomStatus(payload.status.value)
    db.commit()
    db.refresh(room)
    return room


@router.delete("/rooms/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_room(
    room_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(admin_dep),
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    db.delete(room)
    db.commit()
    return None


# ---------- Báo cáo ----------

@router.get("/reports", response_model=list[ReportOut])
def admin_list_reports(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    report_status: Literal["pending", "reviewed", "resolved", "rejected"] | None = Query(
        default=None, alias="status"
    ),
    db: Session = Depends(get_db),
    _: User = Depends(admin_dep),
):
    query = db.query(Report).order_by(Report.created_at.desc())
    if report_status:
        query = query.filter(Report.status == ReportStatus(report_status))
    return query.offset(skip).limit(limit).all()


@router.patch("/reports/{report_id}/status", response_model=ReportOut)
def admin_update_report_status(
    report_id: int,
    payload: ReportStatusPatch,
    db: Session = Depends(get_db),
    _: User = Depends(admin_dep),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy báo cáo")
    report.status = ReportStatus(payload.status.value)
    db.commit()
    db.refresh(report)
    return report
