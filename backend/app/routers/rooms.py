from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import RoomCreate, RoomOut, RoomStatusSchema, RoomUpdate
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
def create_room(payload: RoomCreate, db: Session = Depends(get_db)):
    return create_room_service(db=db, payload=payload)


@router.get("", response_model=list[RoomOut])
def list_rooms(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    keyword: str | None = Query(default=None),
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    status_filter: RoomStatusSchema | None = Query(default=None, alias="status"),
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
def update_room(room_id: int, payload: RoomUpdate, db: Session = Depends(get_db)):
    try:
        return update_room_service(db=db, room_id=room_id, payload=payload)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room(room_id: int, db: Session = Depends(get_db)):
    try:
        delete_room_service(db=db, room_id=room_id)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    return None
