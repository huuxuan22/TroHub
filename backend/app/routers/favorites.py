from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import FavoriteCreate, FavoriteOut
from app.services.exceptions import NotFoundError
from app.services.favorites_service import (
    create_favorite as create_favorite_service,
    delete_favorite as delete_favorite_service,
    get_favorite_or_raise,
    list_favorites as list_favorites_service,
)

router = APIRouter(prefix="/trohub/favorites", tags=["favorites"])


@router.post("", response_model=FavoriteOut, status_code=status.HTTP_201_CREATED)
def create_favorite(payload: FavoriteCreate, db: Session = Depends(get_db)):
    return create_favorite_service(db=db, payload=payload)


@router.get("", response_model=list[FavoriteOut])
def list_favorites(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return list_favorites_service(db=db, skip=skip, limit=limit)


@router.get("/{favorite_id}", response_model=FavoriteOut)
def get_favorite(favorite_id: int, db: Session = Depends(get_db)):
    try:
        return get_favorite_or_raise(db=db, favorite_id=favorite_id)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Favorite not found")


@router.delete("/{favorite_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_favorite(favorite_id: int, db: Session = Depends(get_db)):
    try:
        delete_favorite_service(db=db, favorite_id=favorite_id)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Favorite not found")
    return None
