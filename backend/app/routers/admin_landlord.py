from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import User, UserRole
from app.schemas import UserOut
from app.services.auth_service import require_roles

router = APIRouter(prefix="/trohub/admin", tags=["admin"])


@router.patch("/landlord-profiles/{user_id}/approve", response_model=UserOut)
def approve_landlord_profile(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    user = (
        db.query(User)
        .options(joinedload(User.landlord_profile))
        .filter(User.id == user_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    prof = user.landlord_profile
    if prof is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Người dùng chưa gửi hồ sơ chủ phòng.",
        )
    prof.is_verified = True
    user.role = UserRole.LANDLORD
    db.commit()
    db.refresh(user)
    return user
