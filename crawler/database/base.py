"""Declarative base for SQLAlchemy models."""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Subclass for all ORM models so Alembic can discover metadata."""
