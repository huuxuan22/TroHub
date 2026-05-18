from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import UserCreate, UserOut, UserUpdate
from app.services.exceptions import NotFoundError
from app.models import User, UserRole
from app.services.users_service import (
    create_user as create_user_service,
    delete_user as delete_user_service,
    get_user_or_raise,
    list_users as list_users_service,
    update_user as update_user_service,
)

router = APIRouter(prefix="/trohub/users", tags=["users"])


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    return create_user_service(db=db, payload=payload)


@router.get("", response_model=list[UserOut])
def list_users(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return list_users_service(db=db, skip=skip, limit=limit)


@router.get("/support-admin", response_model=UserOut)
def get_support_admin(db: Session = Depends(get_db)):
    admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if not admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Support admin not found")
    return admin


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    try:
        return get_user_or_raise(db=db, user_id=user_id)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")


@router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db)):
    try:
        return update_user_service(db=db, user_id=user_id, payload=payload)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    try:
        delete_user_service(db=db, user_id=user_id)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return None
