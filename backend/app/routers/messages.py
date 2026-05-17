from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Room, User
from app.schemas import (
    MessageConversationOut,
    MessageCreateIn,
    MessageOut,
    MessageThreadReadIn,
    MessageThreadReadOut,
)
from app.services.auth_service import get_current_active_user
from app.services.exceptions import NotFoundError
from app.services.messages_service import (
    create_message as create_message_service,
    get_message_or_raise,
    list_conversations as list_conversations_service,
    list_thread_messages as list_thread_messages_service,
    mark_thread_as_read as mark_thread_as_read_service,
)

router = APIRouter(prefix="/trohub/messages", tags=["messages"])


@router.post("", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
def create_message(
    payload: MessageCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if payload.receiver_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="receiver_id must be different from sender")

    receiver = db.query(User.id).filter(User.id == payload.receiver_id).first()
    if receiver is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receiver not found")

    if payload.room_id is not None:
        room_exists = db.query(Room.id).filter(Room.id == payload.room_id).first()
        if room_exists is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")

    return create_message_service(db=db, sender_id=current_user.id, payload=payload)


@router.get("/thread", response_model=list[MessageOut])
def list_thread_messages(
    other_user_id: int = Query(..., ge=1),
    room_id: int | None = Query(default=None, ge=1),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return list_thread_messages_service(
        db=db,
        current_user_id=current_user.id,
        other_user_id=other_user_id,
        room_id=room_id,
        skip=skip,
        limit=limit,
    )


@router.get("/conversations", response_model=list[MessageConversationOut])
def list_conversations(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return list_conversations_service(db=db, current_user_id=current_user.id, limit=limit)


@router.post("/thread/read", response_model=MessageThreadReadOut)
def mark_thread_as_read(
    payload: MessageThreadReadIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    updated = mark_thread_as_read_service(
        db=db,
        current_user_id=current_user.id,
        other_user_id=payload.other_user_id,
        room_id=payload.room_id,
    )
    return {"updated": updated}


@router.get("/{message_id}", response_model=MessageOut)
def get_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        message = get_message_or_raise(db=db, message_id=message_id)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    if current_user.id not in (message.sender_id, message.receiver_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to view this message")
    return message
