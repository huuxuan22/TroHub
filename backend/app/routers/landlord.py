from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import LandlordProfile, User, UserRole
from app.schemas import LandlordApplicationIn, LandlordProfileOut
from app.services.auth_service import get_current_active_user

router = APIRouter(prefix="/trohub/landlord", tags=["landlord"])


@router.post("/apply", response_model=LandlordProfileOut, status_code=status.HTTP_201_CREATED)
def apply_as_landlord(
    payload: LandlordApplicationIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tài khoản admin không cần đăng ký chủ phòng.")

    prof = user.landlord_profile
    if prof is not None and prof.is_verified == 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản của bạn đã là chủ nhà được xác minh.",
        )

    if prof is None:
        prof = LandlordProfile(
            user_id=user.id,
            business_name=payload.business_name.strip(),
            national_id=payload.national_id.strip(),
            business_license=(payload.business_license or "").strip() or None,
            is_verified=0,
        )
        db.add(prof)
    else:
        prof.business_name = payload.business_name.strip()
        prof.national_id = payload.national_id.strip()
        prof.business_license = (payload.business_license or "").strip() or None
        prof.is_verified = 0

    db.commit()
    db.refresh(prof)
    return prof
