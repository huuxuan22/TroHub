from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import NotificationCreate, NotificationOut, NotificationUpdate
from app.services.exceptions import NotFoundError
from app.services.notifications_service import (
    create_notification as create_notification_service,
    delete_notification as delete_notification_service,
    get_notification_or_raise,
    list_notifications as list_notifications_service,
    update_notification as update_notification_service,
)

router = APIRouter(prefix="/trohub/notifications", tags=["notifications"])


@router.post("", response_model=NotificationOut, status_code=status.HTTP_201_CREATED)
def create_notification(payload: NotificationCreate, db: Session = Depends(get_db)):
    return create_notification_service(db=db, payload=payload)


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return list_notifications_service(db=db, skip=skip, limit=limit)


@router.get("/{notification_id}", response_model=NotificationOut)
def get_notification(notification_id: int, db: Session = Depends(get_db)):
    try:
        return get_notification_or_raise(db=db, notification_id=notification_id)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")


@router.put("/{notification_id}", response_model=NotificationOut)
def update_notification(notification_id: int, payload: NotificationUpdate, db: Session = Depends(get_db)):
    try:
        return update_notification_service(db=db, notification_id=notification_id, payload=payload)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(notification_id: int, db: Session = Depends(get_db)):
    try:
        delete_notification_service(db=db, notification_id=notification_id)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return None
