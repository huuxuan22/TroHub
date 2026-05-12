from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import LoginRequest, TokenOut, UserCreate, UserOut, UserRegister, UserRoleSchema
from app.services.users_service import create_user, authenticate_user
from app.services.auth_service import create_access_token, get_current_user
from app.models import User as UserModel

router = APIRouter(prefix="/trohub/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
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
def get_me(current_user: UserModel = Depends(get_current_user)):
    return current_user


@router.post("/logout")
def logout():
    return {"message": "Logged out successfully"}
