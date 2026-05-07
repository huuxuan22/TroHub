from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import MessageCreate, MessageOut, MessageUpdate
from app.services.exceptions import NotFoundError
from app.services.messages_service import (
    create_message as create_message_service,
    delete_message as delete_message_service,
    get_message_or_raise,
    list_messages as list_messages_service,
    update_message as update_message_service,
)

router = APIRouter(prefix="/trohub/messages", tags=["messages"])


@router.post("", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
def create_message(payload: MessageCreate, db: Session = Depends(get_db)):
    return create_message_service(db=db, payload=payload)


@router.get("", response_model=list[MessageOut])
def list_messages(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return list_messages_service(db=db, skip=skip, limit=limit)


@router.get("/{message_id}", response_model=MessageOut)
def get_message(message_id: int, db: Session = Depends(get_db)):
    try:
        return get_message_or_raise(db=db, message_id=message_id)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")


@router.put("/{message_id}", response_model=MessageOut)
def update_message(message_id: int, payload: MessageUpdate, db: Session = Depends(get_db)):
    try:
        return update_message_service(db=db, message_id=message_id, payload=payload)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message(message_id: int, db: Session = Depends(get_db)):
    try:
        delete_message_service(db=db, message_id=message_id)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    return None
