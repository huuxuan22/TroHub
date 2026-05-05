"""Business logic for reading room listings from the database."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from models.crawl_history import CrawlHistory
from utils.exceptions import NotFoundError


def list_crawl_history(db: Session, *, skip: int = 0, limit: int = 50) -> list[CrawlHistory]:
    stmt = select(CrawlHistory).order_by(CrawlHistory.created_at.desc()).offset(skip).limit(limit)
    return list(db.scalars(stmt).all())


def get_crawl_history_by_id(db: Session, crawl_history_id: int) -> CrawlHistory:
    crawl_history = db.get(CrawlHistory, crawl_history_id)
    if crawl_history is None:
        raise NotFoundError(f"Crawl history with id {crawl_history_id} not found")
    return crawl_history


def create_crawl_history_bulk(db: Session, items: list[CrawlHistory]) -> list[CrawlHistory]:
    """Persist multiple rows in one transaction."""
    for row in items:
        db.add(row)
    db.commit()
    for row in items:
        db.refresh(row)
    return items
