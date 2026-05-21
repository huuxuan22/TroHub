from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import SearchHistoryLogIn, SearchHistoryOut
from app.services.auth_service import get_current_active_user, get_optional_current_user
from app.services.search_crawl_service import schedule_crawl_from_search_history
from app.services.search_history_service import list_search_history_for_user, record_search_history

router = APIRouter(prefix="/trohub/search-history", tags=["search-history"])


@router.post("", response_model=SearchHistoryOut, status_code=status.HTTP_201_CREATED)
def log_search(
    payload: SearchHistoryLogIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    """Ghi nhận một lần tìm kiếm (đăng nhập hoặc khách)."""
    keyword = (payload.keyword or "").strip()
    city = (payload.city or "").strip()
    if not keyword and not city and not payload.filters:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cần ít nhất từ khóa, thành phố hoặc bộ lọc.",
        )

    row = record_search_history(
        db=db,
        payload=payload,
        user_id=current_user.id if current_user else None,
    )
    schedule_crawl_from_search_history(background_tasks, row)
    return row


@router.get("/me", response_model=list[SearchHistoryOut])
def list_my_search_history(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    rows = list_search_history_for_user(db=db, user_id=current_user.id, skip=skip, limit=limit)
    return rows
