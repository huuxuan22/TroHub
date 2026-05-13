from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import (
    FavoriteCreate,
    FavoriteOut,
    FavoriteRoomIdsOut,
    FavoriteWithRoomOut,
)
from app.services.auth_service import get_current_active_user
from app.services.exceptions import NotFoundError
from app.services.favorites_service import (
    add_favorite_for_user,
    delete_favorite_by_user_room,
    list_favorite_room_ids_for_user,
    list_favorites_for_user_with_rooms,
)

router = APIRouter(prefix="/trohub/favorites", tags=["favorites"])


@router.get("/me/room-ids", response_model=FavoriteRoomIdsOut)
def list_my_favorite_room_ids(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    room_ids = list_favorite_room_ids_for_user(db=db, user_id=current_user.id)
    return FavoriteRoomIdsOut(room_ids=room_ids)


@router.get("/me", response_model=list[FavoriteWithRoomOut])
def list_my_favorites(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    rows = list_favorites_for_user_with_rooms(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        sort_order=sort_order,
    )
    return [FavoriteWithRoomOut.model_validate(r, from_attributes=True) for r in rows]


@router.post("/me", response_model=FavoriteOut, status_code=status.HTTP_201_CREATED)
def add_my_favorite(
    payload: FavoriteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        return add_favorite_for_user(db=db, user_id=current_user.id, room_id=payload.room_id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e


@router.delete("/me/by-room/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_my_favorite_by_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        delete_favorite_by_user_room(db=db, user_id=current_user.id, room_id=room_id)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Favorite not found") from None
    return None
