from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models import SearchHistory
from app.schemas import SearchHistoryLogIn


def _build_filters_payload(payload: SearchHistoryLogIn) -> dict | None:
    merged: dict = {}
    if payload.filters:
        merged.update(payload.filters)
    if payload.city:
        merged["city"] = payload.city.strip()
    if payload.result_count is not None:
        merged["result_count"] = payload.result_count
    return merged or None


def record_search_history(
    db: Session,
    *,
    payload: SearchHistoryLogIn,
    user_id: int | None,
) -> SearchHistory:
    keyword = (payload.keyword or "").strip() or None
    if keyword and len(keyword) > 255:
        keyword = keyword[:255]

    row = SearchHistory(
        user_id=user_id,
        keyword=keyword,
        filters=_build_filters_payload(payload),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_search_history_for_user(
    db: Session,
    *,
    user_id: int,
    skip: int = 0,
    limit: int = 30,
) -> list[SearchHistory]:
    return (
        db.query(SearchHistory)
        .filter(SearchHistory.user_id == user_id)
        .order_by(desc(SearchHistory.created_at))
        .offset(skip)
        .limit(limit)
        .all()
    )
