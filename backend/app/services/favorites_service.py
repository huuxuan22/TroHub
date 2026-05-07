from sqlalchemy.orm import Session

from app.models import Favorite
from app.schemas import FavoriteCreate
from app.services.exceptions import NotFoundError


def create_favorite(db: Session, payload: FavoriteCreate) -> Favorite:
    favorite = Favorite(**payload.model_dump())
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    return favorite


def list_favorites(db: Session, skip: int = 0, limit: int = 20) -> list[Favorite]:
    return db.query(Favorite).offset(skip).limit(limit).all()


def get_favorite_or_raise(db: Session, favorite_id: int) -> Favorite:
    favorite = db.query(Favorite).filter(Favorite.id == favorite_id).first()
    if not favorite:
        raise NotFoundError("Favorite not found")
    return favorite


def delete_favorite(db: Session, favorite_id: int) -> None:
    favorite = get_favorite_or_raise(db=db, favorite_id=favorite_id)
    db.delete(favorite)
    db.commit()
