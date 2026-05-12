from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserRole
from app.schemas import RoomCreate, RoomCreateRequest, RoomOut, RoomStatusSchema, RoomUpdate
from app.services.auth_service import (
    assert_user_owns_room_or_admin,
    ensure_verified_landlord_for_own_listing,
    get_current_active_user,
    require_verified_landlord_or_admin,
)
from app.services.exceptions import NotFoundError
from app.services.rooms_service import (
    create_room as create_room_service,
    delete_room as delete_room_service,
    get_room_or_raise,
    list_rooms as list_rooms_service,
    update_room as update_room_service,
)

router = APIRouter(prefix="/trohub/rooms", tags=["rooms"])


@router.post("", response_model=RoomOut, status_code=status.HTTP_201_CREATED)
def create_room(
    payload: RoomCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_verified_landlord_or_admin),
):
    if current_user.role == UserRole.ADMIN:
        landlord_id = payload.landlord_id if payload.landlord_id is not None else current_user.id
    else:
        landlord_id = current_user.id
    body = payload.model_dump()
    body.pop("landlord_id", None)
    internal = RoomCreate(**body, landlord_id=landlord_id)
    return create_room_service(db=db, payload=internal)


@router.get("", response_model=list[RoomOut])
def list_rooms(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    keyword: str | None = Query(default=None),
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    status_filter: RoomStatusSchema | None = Query(default=None, alias="status"),
    room_type: str | None = Query(default=None),
    landlord_id: int | None = Query(default=None, ge=1),
    sort_by: str = Query(default="created_at", pattern="^(created_at|price|area_sqm)$"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="min_price cannot be greater than max_price")

    return list_rooms_service(
        db=db,
        skip=skip,
        limit=limit,
        keyword=keyword,
        min_price=min_price,
        max_price=max_price,
        status=status_filter.value if status_filter else None,
        room_type=room_type,
        landlord_id=landlord_id,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/{room_id}", response_model=RoomOut)
def get_room(room_id: int, db: Session = Depends(get_db)):
    try:
        return get_room_or_raise(db=db, room_id=room_id)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")


@router.put("/{room_id}", response_model=RoomOut)
def update_room(
    room_id: int,
    payload: RoomUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        room = get_room_or_raise(db=db, room_id=room_id)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    assert_user_owns_room_or_admin(current_user, room)
    if current_user.role != UserRole.ADMIN:
        ensure_verified_landlord_for_own_listing(current_user)
        data = payload.model_dump(exclude_unset=True)
        data.pop("landlord_id", None)
        payload = RoomUpdate(**data)
    return update_room_service(db=db, room_id=room_id, payload=payload)


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        room = get_room_or_raise(db=db, room_id=room_id)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    assert_user_owns_room_or_admin(current_user, room)
    if current_user.role != UserRole.ADMIN:
        ensure_verified_landlord_for_own_listing(current_user)
    delete_room_service(db=db, room_id=room_id)
    return None
