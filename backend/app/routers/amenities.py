from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import AmenityCreate, AmenityOut, AmenityUpdate
from app.services.amenities_service import (
    create_amenity as create_amenity_service,
    delete_amenity as delete_amenity_service,
    get_amenity_or_raise,
    list_amenities as list_amenities_service,
    update_amenity as update_amenity_service,
)
from app.services.exceptions import NotFoundError

router = APIRouter(prefix="/trohub/amenities", tags=["amenities"])


@router.post("", response_model=AmenityOut, status_code=status.HTTP_201_CREATED)
def create_amenity(payload: AmenityCreate, db: Session = Depends(get_db)):
    return create_amenity_service(db=db, payload=payload)


@router.get("", response_model=list[AmenityOut])
def list_amenities(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return list_amenities_service(db=db, skip=skip, limit=limit)


@router.get("/{amenity_id}", response_model=AmenityOut)
def get_amenity(amenity_id: int, db: Session = Depends(get_db)):
    try:
        return get_amenity_or_raise(db=db, amenity_id=amenity_id)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Amenity not found")


@router.put("/{amenity_id}", response_model=AmenityOut)
def update_amenity(amenity_id: int, payload: AmenityUpdate, db: Session = Depends(get_db)):
    try:
        return update_amenity_service(db=db, amenity_id=amenity_id, payload=payload)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Amenity not found")


@router.delete("/{amenity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_amenity(amenity_id: int, db: Session = Depends(get_db)):
    try:
        delete_amenity_service(db=db, amenity_id=amenity_id)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Amenity not found")
    return None
