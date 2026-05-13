from sqlalchemy import asc, desc, func, or_
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.orm.attributes import set_committed_value

from app.models import Room, RoomStatus
from app.schemas import RoomCreate, RoomUpdate
from app.services.exceptions import NotFoundError
from app.services.geocoding_service import has_valid_coordinates, resolve_coordinates


def _to_domain_room_status(value):
    """Schema RoomStatusSchema (draft, …) → models.RoomStatus."""
    if isinstance(value, RoomStatus):
        return value
    if hasattr(value, "value"):
        return RoomStatus(value.value)
    return RoomStatus(value)


def _apply_coordinates(room: Room, latitude, longitude, *, persist: bool) -> bool:
    if latitude is None or longitude is None:
        return False
    if has_valid_coordinates(room.latitude, room.longitude) and room.latitude == latitude and room.longitude == longitude:
        return False

    if persist:
        room.latitude = latitude
        room.longitude = longitude
    else:
        set_committed_value(room, "latitude", latitude)
        set_committed_value(room, "longitude", longitude)
    return True


def _hydrate_room_coordinates(
    room: Room,
    *,
    prefer_remote: bool,
    persist: bool,
    force_lookup: bool = False,
) -> bool:
    latitude, longitude = resolve_coordinates(
        address=room.address,
        latitude=room.latitude,
        longitude=room.longitude,
        prefer_remote=prefer_remote,
        force_lookup=force_lookup,
    )
    return _apply_coordinates(room, latitude, longitude, persist=persist)


def create_room(db: Session, payload: RoomCreate) -> Room:
    room_data = payload.model_dump(mode="python", exclude={"status"})
    room_data["status"] = _to_domain_room_status(payload.status)
    room_data["latitude"], room_data["longitude"] = resolve_coordinates(
        address=room_data.get("address", ""),
        latitude=room_data.get("latitude"),
        longitude=room_data.get("longitude"),
        prefer_remote=True,
    )
    room = Room(**room_data)
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


def _build_room_filter_query(
    db: Session,
    *,
    keyword: str | None,
    min_price: float | None,
    max_price: float | None,
    status: str | None,
    room_type: str | None,
    landlord_id: int | None,
):
    """Trả về base query đã áp filter, chưa sort/phân trang. Dùng chung
    cho cả list (có sort + offset/limit) và count tổng phục vụ pagination."""
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
        query = query.filter(Room.status == _to_domain_room_status(status))
    if room_type:
        query = query.filter(Room.room_type == room_type)
    if landlord_id is not None:
        query = query.filter(Room.landlord_id == landlord_id)

    return query


def list_rooms(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    keyword: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    status: str | None = None,
    room_type: str | None = None,
    landlord_id: int | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> tuple[list[Room], int]:
    base = _build_room_filter_query(
        db,
        keyword=keyword,
        min_price=min_price,
        max_price=max_price,
        status=status,
        room_type=room_type,
        landlord_id=landlord_id,
    )

    total = base.with_entities(func.count(Room.id)).scalar() or 0

    sortable_fields = {
        "created_at": Room.created_at,
        "price": Room.price,
        "area_sqm": Room.area_sqm,
    }
    sort_column = sortable_fields.get(sort_by, Room.created_at)
    order_fn = desc if sort_order.lower() == "desc" else asc

    query = (
        base.options(selectinload(Room.images))
        .order_by(order_fn(sort_column), Room.id.desc())
        .offset(skip)
        .limit(limit)
    )
    rooms = query.all()
    for room in rooms:
        _hydrate_room_coordinates(room, prefer_remote=False, persist=False)
    return rooms, total


def get_room_or_raise(db: Session, room_id: int) -> Room:
    room = (
        db.query(Room)
        .options(selectinload(Room.images))
        .filter(Room.id == room_id)
        .first()
    )
    if not room:
        raise NotFoundError("Room not found")
    if _hydrate_room_coordinates(room, prefer_remote=True, persist=True):
        db.commit()
        db.refresh(room)
    return room


def update_room(db: Session, room_id: int, payload: RoomUpdate) -> Room:
    room = get_room_or_raise(db=db, room_id=room_id)
    update_data = payload.model_dump(exclude_unset=True)

    if {"address", "latitude", "longitude"} & update_data.keys():
        address_changed = "address" in update_data and update_data["address"] != room.address
        provided_full_coordinates = has_valid_coordinates(update_data.get("latitude"), update_data.get("longitude"))
        source_latitude = update_data.get("latitude")
        source_longitude = update_data.get("longitude")

        if not provided_full_coordinates and address_changed:
            source_latitude = None
            source_longitude = None
        elif "latitude" not in update_data:
            source_latitude = room.latitude
        elif update_data.get("latitude") is None:
            source_latitude = None

        if not provided_full_coordinates and address_changed:
            source_longitude = None
        elif "longitude" not in update_data:
            source_longitude = room.longitude
        elif update_data.get("longitude") is None:
            source_longitude = None

        update_data["latitude"], update_data["longitude"] = resolve_coordinates(
            address=update_data.get("address", room.address),
            latitude=source_latitude,
            longitude=source_longitude,
            prefer_remote=True,
            force_lookup=address_changed and not provided_full_coordinates,
        )

    if "status" in update_data:
        update_data["status"] = _to_domain_room_status(update_data["status"])

    for key, value in update_data.items():
        setattr(room, key, value)

    db.commit()
    db.refresh(room)
    return room


def delete_room(db: Session, room_id: int) -> None:
    room = get_room_or_raise(db=db, room_id=room_id)
    db.delete(room)
    db.commit()
