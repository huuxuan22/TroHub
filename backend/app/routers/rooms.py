from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Amenity, RoomAmenity, RoomImage, User, UserRole
from app.schemas import (
    RoomCreate,
    RoomCreateRequest,
    RoomImageAddIn,
    RoomImageOut,
    RoomOut,
    RoomStatusSchema,
    RoomUpdate,
)
from app.services.minio_storage import storage
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


# POST: chỉ admin hoặc chủ nhà đã duyệt (require_verified_landlord_or_admin).

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
    image_urls = body.pop("image_urls", []) or []
    amenity_ids = body.pop("amenity_ids", []) or []

    internal = RoomCreate(**body, landlord_id=landlord_id)
    room = create_room_service(db=db, payload=internal)

    # Lưu ảnh đã upload (MinIO) vào bảng room_images.
    for url in image_urls:
        if not isinstance(url, str) or not url.strip():
            continue
        db.add(RoomImage(room_id=room.id, image_url=url.strip()[:600]))

    # Gắn tiện ích — bỏ qua id không tồn tại để không phá vỡ giao dịch.
    if amenity_ids:
        valid_ids = {
            aid
            for (aid,) in db.query(Amenity.id).filter(Amenity.id.in_(amenity_ids)).all()
        }
        for aid in valid_ids:
            db.add(RoomAmenity(room_id=room.id, amenity_id=aid))

    if image_urls or amenity_ids:
        db.commit()
        db.refresh(room)

    return room


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


# --- Quản lý ảnh từng phòng -------------------------------------------------

def _extract_object_name_from_url(url: str) -> str | None:
    """Tìm phần object name (sau '/<bucket>/') trong URL ảnh MinIO."""
    if not url:
        return None
    bucket = storage.bucket_name
    marker = f"/{bucket}/"
    idx = url.find(marker)
    if idx == -1:
        return None
    return url[idx + len(marker):]


@router.post(
    "/{room_id}/images",
    response_model=RoomImageOut,
    status_code=status.HTTP_201_CREATED,
)
def add_room_image(
    room_id: int,
    payload: RoomImageAddIn,
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

    image = RoomImage(room_id=room.id, image_url=payload.image_url.strip()[:600])
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


@router.delete(
    "/{room_id}/images/{image_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_room_image(
    room_id: int,
    image_id: int,
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

    image = (
        db.query(RoomImage)
        .filter(RoomImage.id == image_id, RoomImage.room_id == room.id)
        .one_or_none()
    )
    if image is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")

    object_name = _extract_object_name_from_url(image.image_url)
    db.delete(image)
    db.commit()

    if object_name:
        try:
            storage.delete_object(object_name)
        except Exception:
            # Không phá vỡ flow nếu xoá ảnh MinIO lỗi: bản ghi DB đã xoá.
            pass
    return None
