from sqlalchemy import and_, case, func, or_
from sqlalchemy.orm import Session

from app.models import Message, User
from app.schemas import MessageCreateIn
from app.services.exceptions import NotFoundError


def create_message(db: Session, sender_id: int, payload: MessageCreateIn) -> Message:
    message = Message(
        sender_id=sender_id,
        receiver_id=payload.receiver_id,
        room_id=payload.room_id,
        content=payload.content,
        is_read=False,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def list_thread_messages(
    db: Session,
    current_user_id: int,
    other_user_id: int,
    room_id: int | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[Message]:
    query = db.query(Message).filter(
        or_(
            and_(Message.sender_id == current_user_id, Message.receiver_id == other_user_id),
            and_(Message.sender_id == other_user_id, Message.receiver_id == current_user_id),
        )
    )
    if room_id is not None:
        query = query.filter(Message.room_id == room_id)
    return query.order_by(Message.sent_at.asc()).offset(skip).limit(limit).all()


def list_conversations(db: Session, current_user_id: int, limit: int = 20) -> list[dict]:
    other_user_id_expr = case(
        (Message.sender_id == current_user_id, Message.receiver_id),
        else_=Message.sender_id,
    )

    grouped = (
        db.query(
            other_user_id_expr.label("other_user_id"),
            Message.room_id.label("room_id"),
            func.max(Message.sent_at).label("last_message_at"),
        )
        .filter(or_(Message.sender_id == current_user_id, Message.receiver_id == current_user_id))
        .group_by(other_user_id_expr, Message.room_id)
        .order_by(func.max(Message.sent_at).desc())
        .limit(limit)
        .all()
    )

    unread_rows = (
        db.query(
            other_user_id_expr.label("other_user_id"),
            Message.room_id.label("room_id"),
            func.count(Message.id).label("unread_count"),
        )
        .filter(Message.receiver_id == current_user_id, Message.is_read.is_(False))
        .group_by(other_user_id_expr, Message.room_id)
        .all()
    )
    unread_map = {(r.other_user_id, r.room_id): int(r.unread_count or 0) for r in unread_rows}

    conversations: list[dict] = []
    for row in grouped:
        message_query = db.query(Message).filter(
            or_(
                and_(Message.sender_id == current_user_id, Message.receiver_id == row.other_user_id),
                and_(Message.sender_id == row.other_user_id, Message.receiver_id == current_user_id),
            )
        )
        if row.room_id is None:
            message_query = message_query.filter(Message.room_id.is_(None))
        else:
            message_query = message_query.filter(Message.room_id == row.room_id)

        last_message = message_query.order_by(Message.sent_at.desc(), Message.id.desc()).first()
        other_user = db.query(User).filter(User.id == row.other_user_id).first()
        if not last_message or not other_user:
            continue
        conversations.append(
            {
                "other_user_id": row.other_user_id,
                "other_user_name": other_user.full_name,
                "room_id": row.room_id,
                "last_message": last_message.content,
                "last_message_at": last_message.sent_at,
                "unread_count": unread_map.get((row.other_user_id, row.room_id), 0),
            }
        )
    return conversations


def get_message_or_raise(db: Session, message_id: int) -> Message:
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise NotFoundError("Message not found")
    return message


def mark_thread_as_read(
    db: Session,
    current_user_id: int,
    other_user_id: int,
    room_id: int | None = None,
) -> int:
    query = db.query(Message).filter(
        Message.receiver_id == current_user_id,
        Message.sender_id == other_user_id,
        Message.is_read.is_(False),
    )
    if room_id is not None:
        query = query.filter(Message.room_id == room_id)
    updated = query.update({Message.is_read: True}, synchronize_session=False)
    db.commit()
    return int(updated or 0)
