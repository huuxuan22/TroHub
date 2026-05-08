from sqlalchemy.orm import Session

from app.models import Notification
from app.schemas import NotificationCreate, NotificationUpdate
from app.services.exceptions import NotFoundError


def create_notification(db: Session, payload: NotificationCreate) -> Notification:
    notification = Notification(**payload.model_dump())
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def list_notifications(db: Session, skip: int = 0, limit: int = 20) -> list[Notification]:
    return db.query(Notification).offset(skip).limit(limit).all()


def get_notification_or_raise(db: Session, notification_id: int) -> Notification:
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise NotFoundError("Notification not found")
    return notification


def update_notification(db: Session, notification_id: int, payload: NotificationUpdate) -> Notification:
    notification = get_notification_or_raise(db=db, notification_id=notification_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(notification, key, value)
    db.commit()
    db.refresh(notification)
    return notification


def delete_notification(db: Session, notification_id: int) -> None:
    notification = get_notification_or_raise(db=db, notification_id=notification_id)
    db.delete(notification)
    db.commit()
