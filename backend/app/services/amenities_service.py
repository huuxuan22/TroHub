from sqlalchemy.orm import Session

from app.models import Amenity
from app.schemas import AmenityCreate, AmenityUpdate
from app.services.exceptions import NotFoundError


def create_amenity(db: Session, payload: AmenityCreate) -> Amenity:
    amenity = Amenity(**payload.model_dump())
    db.add(amenity)
    db.commit()
    db.refresh(amenity)
    return amenity


def list_amenities(db: Session, skip: int = 0, limit: int = 20) -> list[Amenity]:
    return db.query(Amenity).offset(skip).limit(limit).all()


def get_amenity_or_raise(db: Session, amenity_id: int) -> Amenity:
    amenity = db.query(Amenity).filter(Amenity.id == amenity_id).first()
    if not amenity:
        raise NotFoundError("Amenity not found")
    return amenity


def update_amenity(db: Session, amenity_id: int, payload: AmenityUpdate) -> Amenity:
    amenity = get_amenity_or_raise(db=db, amenity_id=amenity_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(amenity, key, value)
    db.commit()
    db.refresh(amenity)
    return amenity


def delete_amenity(db: Session, amenity_id: int) -> None:
    amenity = get_amenity_or_raise(db=db, amenity_id=amenity_id)
    db.delete(amenity)
    db.commit()
