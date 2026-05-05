"""Crawl history record (listing snapshot)."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from database.base import Base


class CrawlHistory(Base):
    __tablename__ = "crawl_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    location: Mapped[str | None] = mapped_column(String(512), nullable=True)
    image: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"CrawlHistory(id={self.id!r}, title={self.title!r})"
