import os
from datetime import datetime, timedelta
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Room, User, UserRole, UserStatus

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/trohub/auth/login")


def create_access_token(subject: Any, expires_delta: int | None = None) -> str:
    expire = datetime.utcnow() + (timedelta(minutes=expires_delta) if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode = {"sub": str(subject), "exp": expire}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        subject = payload.get("sub")
        if subject is None:
            raise credentials_error
        user_id = int(subject)
    except (JWTError, ValueError):
        raise credentials_error

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise credentials_error
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active",
        )
    return current_user


def require_roles(*allowed: UserRole):
    def _dep(user: User = Depends(get_current_active_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for this operation",
            )
        return user

    return _dep


require_landlord_or_admin = require_roles(UserRole.LANDLORD, UserRole.ADMIN)


def require_verified_landlord_or_admin(user: User = Depends(get_current_active_user)) -> User:
    """Chỉ admin hoặc chủ phòng đã được admin xác minh (landlord_profile.is_verified)."""
    if user.role == UserRole.ADMIN:
        return user
    if user.role != UserRole.LANDLORD:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cần tài khoản chủ phòng đã được xác minh để thực hiện thao tác này.",
        )
    prof = user.landlord_profile
    if prof is None or not prof.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản chủ phòng chưa được admin xác minh. Vui lòng hoàn tất hồ sơ và chờ duyệt.",
        )
    return user


def ensure_verified_landlord_for_own_listing(user: User) -> None:
    """Dùng sau khi đã xác định user sở hữu tin: chặn chủ phòng chưa duyệt."""
    if user.role == UserRole.ADMIN:
        return
    if user.role != UserRole.LANDLORD:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không có quyền thao tác tin đăng.",
        )
    prof = user.landlord_profile
    if prof is None or not prof.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản chủ phòng chưa được admin xác minh.",
        )


def assert_user_owns_room_or_admin(user: User, room: Room) -> None:
    if user.role == UserRole.ADMIN:
        return
    if room.landlord_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only modify your own listings",
        )
