from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.schemas import (
    LoginRequest,
    TokenOut,
    UserCreate,
    UserLocationSave,
    UserOut,
    UserRegister,
    UserRegistrationCodeRequest,
    UserRoleSchema,
)
from app.services.users_service import authenticate_user, create_user, save_user_location_address
from app.services.auth_service import create_access_token, get_current_user
from app.services.email_verification_service import (
    EmailVerificationDeliveryError,
    send_registration_code,
    verify_registration_code,
)
from app.models import User as UserModel

router = APIRouter(prefix="/trohub/auth", tags=["auth"])


def _ensure_public_registration_payload(payload: UserRegistrationCodeRequest, db: Session) -> None:
    # ensure email is unique
    if db.query(UserModel.id).filter(func.lower(UserModel.email) == payload.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.",
        )
    if payload.role == UserRoleSchema.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot register as admin via public API")
    if payload.role != UserRoleSchema.tenant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Đăng ký công khai chỉ dành cho tài khoản người tìm phòng. Liên hệ hỗ trợ nếu bạn là chủ nhà.",
        )


@router.post("/register/send-code", status_code=status.HTTP_202_ACCEPTED)
def send_register_code(payload: UserRegistrationCodeRequest, db: Session = Depends(get_db)):
    _ensure_public_registration_payload(payload, db)
    try:
        send_registration_code(db=db, email=payload.email)
    except EmailVerificationDeliveryError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return {"message": "Đã gửi mã xác thực đến email của bạn."}


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    _ensure_public_registration_payload(payload, db)
    try:
        verify_registration_code(db=db, email=payload.email, code=payload.verification_code)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    create_payload = UserCreate(
        full_name=payload.full_name,
        email=payload.email,
        password=payload.password,
        phone_number=payload.phone_number,
        role=payload.role,
    )
    try:
        return create_user(db=db, payload=create_payload)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.",
        ) from None
    except OperationalError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cannot connect to MySQL. Check the server is running and DATABASE_URL in backend/.env (host, port, password, database name trohub).",
        ) from None
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.post("/login", response_model=TokenOut)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db=db, email=payload.email, password=payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(subject=user.id)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def get_me(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    # Luôn tải landlord_profile trong cùng session (JSON đủ is_verified: 0/1 sau khi admin duyệt).
    user = (
        db.query(UserModel)
        .options(joinedload(UserModel.landlord_profile))
        .filter(UserModel.id == current_user.id)
        .first()
    )
    return user if user is not None else current_user


@router.patch("/me/location", response_model=UserOut)
def save_my_location(
    payload: UserLocationSave,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Lưu địa chỉ vị trí người dùng (chỉ khi đã đăng nhập)."""
    user = save_user_location_address(db, current_user, payload.address)
    return (
        db.query(UserModel)
        .options(joinedload(UserModel.landlord_profile))
        .filter(UserModel.id == user.id)
        .first()
        or user
    )


@router.post("/logout")
def logout():
    return {"message": "Logged out successfully"}
