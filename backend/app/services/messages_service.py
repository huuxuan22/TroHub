from sqlalchemy.orm import Session

from app.models import Message
from app.schemas import MessageCreate, MessageUpdate
from app.services.exceptions import NotFoundError


def create_message(db: Session, payload: MessageCreate) -> Message:
    message = Message(**payload.model_dump())
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def list_messages(db: Session, skip: int = 0, limit: int = 20) -> list[Message]:
    return db.query(Message).offset(skip).limit(limit).all()


def get_message_or_raise(db: Session, message_id: int) -> Message:
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise NotFoundError("Message not found")
    return message


def update_message(db: Session, message_id: int, payload: MessageUpdate) -> Message:
    message = get_message_or_raise(db=db, message_id=message_id)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(message, key, value)
    db.commit()
    db.refresh(message)
    return message


def delete_message(db: Session, message_id: int) -> None:
    message = get_message_or_raise(db=db, message_id=message_id)
    db.delete(message)
    db.commit()
