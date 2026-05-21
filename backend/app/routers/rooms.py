from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Amenity, CrawlData, RoomAmenity, RoomImage, RoomStatus, User, UserRole
from app.schemas import (
    FeaturedHotRoomOut,
    NearbyCrawlRoomOut,
    RoomCreate,
    RoomCreateRequest,
    RoomImageAddIn,
    RoomImageOut,
    RoomOut,
    RoomStatusSchema,
    RoomUpdate,
    RoomContactInfo,
    RoomClaimCreate,
    RoomClaimOut,
)
from app.services.minio_storage import storage
from app.services.auth_service import (
    assert_user_owns_room_or_admin,
    ensure_verified_landlord_for_own_listing,
    get_current_active_user,
    require_verified_landlord_or_admin,
)
from app.services.exceptions import NotFoundError
from app.services.crawl_listing_service import room_is_crawled_listing
from app.services.room_claim_service import ClaimError, create_room_claim
from app.services.room_moderation_service import moderate_room_for_approval
from app.services.rooms_service import (
    create_room as create_room_service,
    delete_room as delete_room_service,
    get_room_or_raise,
    list_rooms as list_rooms_service,
    update_room as update_room_service,
)

router = APIRouter(prefix="/trohub/rooms", tags=["rooms"])


# POST: chỉ admin hoặc chủ nhà đã duyệt (require_verified_landlord_or_admin).

def _ensure_room_can_be_available(db: Session, room_id: int) -> None:
    moderation = moderate_room_for_approval(db=db, room_id=room_id)
    if not moderation.approved:
        detail = f"AI từ chối hiển thị tin: {moderation.reason}"
        if moderation.categories:
            detail += f" ({', '.join(moderation.categories)})"
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


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
    requested_status = body.get("status")
    wants_available = str(getattr(requested_status, "value", requested_status)).lower() == "available"
    if wants_available:
        body["status"] = RoomStatusSchema.draft

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

    if wants_available:
        _ensure_room_can_be_available(db=db, room_id=room.id)
        room.status = RoomStatus.AVAILABLE
        db.commit()
        db.refresh(room)

    return room


@router.get("", response_model=list[RoomOut])
def list_rooms(
    response: Response,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    keyword: str | None = Query(default=None),
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    min_area: float | None = Query(default=None, ge=0),
    max_area: float | None = Query(default=None, ge=0),
    status_filter: RoomStatusSchema | None = Query(default=None, alias="status"),
    room_type: str | None = Query(default=None),
    landlord_id: int | None = Query(default=None, ge=1),
    sort_by: str = Query(default="created_at", pattern="^(created_at|price|area_sqm)$"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="min_price cannot be greater than max_price")
    if min_area is not None and max_area is not None and min_area > max_area:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="min_area cannot be greater than max_area")

    rooms, total = list_rooms_service(
        db=db,
        skip=skip,
        limit=limit,
        keyword=keyword,
        min_price=min_price,
        max_price=max_price,
        min_area=min_area,
        max_area=max_area,
        status=status_filter.value if status_filter else None,
        room_type=room_type,
        landlord_id=landlord_id,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    response.headers["X-Total-Count"] = str(total)
    response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"
    return rooms


@router.get("/featured-hot", response_model=list[FeaturedHotRoomOut])
def featured_hot_rooms(
    limit: int = Query(default=10, ge=1, le=10),
    db: Session = Depends(get_db),
):
    """10 phòng nổi bật — modal ưu đãi sau đăng nhập."""
    from app.services.featured_hot_rooms_service import list_featured_hot_rooms

    rooms = list_featured_hot_rooms(db, limit=limit)
    out: list[FeaturedHotRoomOut] = []
    for room in rooms:
        payload = FeaturedHotRoomOut.model_validate(room)
        payload.amenities = [
            {"id": ra.amenity.id, "name": ra.amenity.name}
            for ra in room.room_amenities
            if ra.amenity is not None
        ]
        out.append(payload)
    return out


@router.get("/nearby-crawl-new", response_model=list[NearbyCrawlRoomOut])
def nearby_crawl_new_rooms(
    limit: int = Query(default=30, ge=1, le=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Phòng crawl mới gần `users.address` — dùng cho modal sau đăng nhập."""
    from app.services.nearby_crawl_rooms_service import list_nearby_new_crawl_rooms

    rows = list_nearby_new_crawl_rooms(db, current_user, limit=limit)
    out: list[NearbyCrawlRoomOut] = []
    for item in rows:
        room = item["room"]
        payload = NearbyCrawlRoomOut.model_validate(room)
        payload.distance_km = item["distance_km"]
        out.append(payload)
    return out


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

    requested_status = payload.status
    wants_available = str(getattr(requested_status, "value", requested_status)).lower() == "available"
    if wants_available:
        data = payload.model_dump(exclude_unset=True)
        data["status"] = RoomStatusSchema.draft
        payload = RoomUpdate(**data)

    updated = update_room_service(db=db, room_id=room_id, payload=payload)
    if wants_available:
        _ensure_room_can_be_available(db=db, room_id=updated.id)
        updated.status = RoomStatus.AVAILABLE
        db.commit()
        db.refresh(updated)
    return updated


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


@router.get("/{room_id}/contact", response_model=RoomContactInfo)
def get_room_contact_info(room_id: int, db: Session = Depends(get_db)):
    try:
        room = get_room_or_raise(db=db, room_id=room_id)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    
    if room_is_crawled_listing(room, db):
        phone = None
        if room.source_url:
            crawl_data = db.query(CrawlData).filter(CrawlData.url == room.source_url).first()
            if crawl_data and crawl_data.phone:
                phone = str(crawl_data.phone).strip() or None
        return RoomContactInfo(
            is_crawled=True,
            phone=phone,
            email=None,
            landlord_id=room.landlord_id,
        )

    user = db.query(User).filter(User.id == room.landlord_id).first()
    return RoomContactInfo(
        is_crawled=False,
        phone=user.phone_number if user else None,
        email=user.email if user else None,
        landlord_id=room.landlord_id,
    )


@router.post("/{room_id}/claim", response_model=RoomClaimOut, status_code=status.HTTP_201_CREATED)
def claim_room(
    room_id: int,
    payload: RoomClaimCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_verified_landlord_or_admin),
):
    try:
        room = get_room_or_raise(db=db, room_id=room_id)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
        
    try:
        return create_room_claim(db=db, room=room, user_id=current_user.id, payload=payload)
    except ClaimError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


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
