from sqlalchemy import asc, desc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.models import Favorite, Room
from app.services.exceptions import NotFoundError


def add_favorite_for_user(db: Session, *, user_id: int, room_id: int) -> Favorite:
    exists = db.query(Room.id).filter(Room.id == room_id).first()
    if not exists:
        raise NotFoundError("Room not found")

    fav = Favorite(user_id=user_id, room_id=room_id)
    db.add(fav)
    try:
        db.commit()
        db.refresh(fav)
        return fav
    except IntegrityError:
        db.rollback()
        existing = (
            db.query(Favorite)
            .filter(Favorite.user_id == user_id, Favorite.room_id == room_id)
            .first()
        )
        if existing:
            return existing
        raise


def list_favorites_for_user_with_rooms(
    db: Session,
    *,
    user_id: int,
    skip: int = 0,
    limit: int = 50,
    sort_order: str = "desc",
) -> list[Favorite]:
    order_fn = desc if sort_order.lower() == "desc" else asc
    return (
        db.query(Favorite)
        .options(selectinload(Favorite.room).selectinload(Room.images))
        .filter(Favorite.user_id == user_id)
        .order_by(order_fn(Favorite.created_at))
        .offset(skip)
        .limit(limit)
        .all()
    )


def list_favorite_room_ids_for_user(db: Session, *, user_id: int) -> list[int]:
    rows = (
        db.query(Favorite.room_id)
        .filter(Favorite.user_id == user_id)
        .order_by(asc(Favorite.room_id))
        .all()
    )
    return [r for (r,) in rows]


def delete_favorite_by_user_room(db: Session, *, user_id: int, room_id: int) -> None:
    fav = (
        db.query(Favorite)
        .filter(Favorite.user_id == user_id, Favorite.room_id == room_id)
        .first()
    )
    if not fav:
        raise NotFoundError("Favorite not found")
    db.delete(fav)
    db.commit()
