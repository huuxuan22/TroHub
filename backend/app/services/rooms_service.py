from sqlalchemy import asc, desc, or_
from sqlalchemy.orm import Session

from app.models import Room
from app.schemas import RoomCreate, RoomUpdate
from app.services.exceptions import NotFoundError


def create_room(db: Session, payload: RoomCreate) -> Room:
    room = Room(**payload.model_dump())
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


def list_rooms(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    keyword: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    status: str | None = None,
    landlord_id: int | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> list[Room]:
    query = db.query(Room)

    if keyword:
        keyword_like = f"%{keyword.strip()}%"
        query = query.filter(
            or_(
                Room.title.ilike(keyword_like),
                Room.description.ilike(keyword_like),
                Room.address.ilike(keyword_like),
            )
        )

    if min_price is not None:
        query = query.filter(Room.price >= min_price)
    if max_price is not None:
        query = query.filter(Room.price <= max_price)
    if status:
        query = query.filter(Room.status == status)
    if landlord_id is not None:
        query = query.filter(Room.landlord_id == landlord_id)

    sortable_fields = {
        "created_at": Room.created_at,
        "price": Room.price,
        "area_sqm": Room.area_sqm,
    }
    sort_column = sortable_fields.get(sort_by, Room.created_at)
    order_fn = desc if sort_order.lower() == "desc" else asc
    query = query.order_by(order_fn(sort_column))

    return query.offset(skip).limit(limit).all()


def get_room_or_raise(db: Session, room_id: int) -> Room:
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise NotFoundError("Room not found")
    return room


def update_room(db: Session, room_id: int, payload: RoomUpdate) -> Room:
    room = get_room_or_raise(db=db, room_id=room_id)
    update_data = payload.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(room, key, value)

    db.commit()
    db.refresh(room)
    return room


def delete_room(db: Session, room_id: int) -> None:
    room = get_room_or_raise(db=db, room_id=room_id)
    db.delete(room)
    db.commit()
