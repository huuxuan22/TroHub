from sqlalchemy.orm import Session

from datetime import datetime

from passlib.context import CryptContext

from app.models import User
from app.schemas import UserCreate, UserUpdate
from app.services.exceptions import NotFoundError


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def create_user(db: Session, payload: UserCreate) -> User:
    data = payload.model_dump(exclude={"password"})
    data["password_hash"] = get_password_hash(payload.password)
    # ensure created_at present
    if "created_at" not in data:
        data["created_at"] = datetime.utcnow()
    user = User(**data)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
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
    for key, value in data.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int) -> None:
    user = get_user_or_raise(db=db, user_id=user_id)
    db.delete(user)
    db.commit()
