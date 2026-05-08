from sqlalchemy.orm import Session

from app.models import User
from app.schemas import UserCreate, UserUpdate
from app.services.exceptions import NotFoundError


def create_user(db: Session, payload: UserCreate) -> User:
    data = payload.model_dump(exclude={"password"})
    data["password_hash"] = payload.password
    user = User(**data)
    db.add(user)
    db.commit()
    db.refresh(user)
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
        user.password_hash = data.pop("password")
    for key, value in data.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int) -> None:
    user = get_user_or_raise(db=db, user_id=user_id)
    db.delete(user)
    db.commit()
