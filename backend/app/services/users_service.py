from sqlalchemy import func
from sqlalchemy.orm import Session

import bcrypt
from datetime import datetime

from app.models import User, UserRole, UserStatus
import bcrypt

from app.models import User
from app.schemas import UserCreate, UserUpdate
from app.services.exceptions import NotFoundError


def _password_bytes_for_bcrypt(password: str | bytes) -> bytes:
    """bcrypt chỉ nhận tối đa 72 byte — luôn cắt UTF-8 trước khi hash/check."""
    if isinstance(password, bytes):
        b = password
    else:
        b = str(password).encode("utf-8")
    return b if len(b) <= 72 else b[:72]


def get_password_hash(password: str) -> str:
    pw = _password_bytes_for_bcrypt(password)
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pw, salt).decode("ascii")
def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        pw = _password_bytes_for_bcrypt(plain_password)
        stored = password_hash.encode("ascii") if isinstance(password_hash, str) else password_hash
        return bcrypt.checkpw(pw, stored)
    except (ValueError, TypeError):
        return False


def _to_domain_role(value):
    """Chuẩn hóa Pydantic UserRoleSchema hoặc chuỗi → models.UserRole."""
    if isinstance(value, UserRole):
        return value
    if hasattr(value, "value"):
        return UserRole(value.value)
    return UserRole(value)


def _to_domain_status(value):
    if isinstance(value, UserStatus):
        return value
    if hasattr(value, "value"):
        return UserStatus(value.value)
    return UserStatus(value)

def create_user(db: Session, payload: UserCreate) -> User:
    data = payload.model_dump(exclude={"password", "role", "status"}, mode="python")
    data["password_hash"] = get_password_hash(payload.password)
    data["role"] = _to_domain_role(payload.role)
    data["status"] = _to_domain_status(payload.status)
    # ensure created_at present
    if "created_at" not in data:
        data["created_at"] = datetime.utcnow()
    user = User(**data)
    db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    email_norm = email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email_norm).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    if user.status != UserStatus.ACTIVE:
        return None
    return user


def list_users(db: Session, skip: int = 0, limit: int = 20) -> list[User]:
    return db.query(User).offset(skip).limit(limit).all()


def get_user_or_raise(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundError("User not found")
    return user


def update_user(db: Session, user_id: int, payload: UserUpdate) -> User:
    user = get_user_or_raise(db=db, user_id=user_id)
    data = payload.model_dump(exclude_unset=True)
    if "password" in data:
        user.password_hash = get_password_hash(data.pop("password"))
    if "role" in data:
        data["role"] = _to_domain_role(data["role"])
    if "status" in data:
        data["status"] = _to_domain_status(data["status"])
    for key, value in data.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int) -> None:
    user = get_user_or_raise(db=db, user_id=user_id)
    db.delete(user)
    db.commit()


def save_user_location_address(db: Session, user: User, address: str) -> User:
    user.address = address.strip()[:500]
    db.commit()
    db.refresh(user)
    return user
