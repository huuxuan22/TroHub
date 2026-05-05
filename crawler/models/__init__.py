"""
SQLAlchemy models package.

Import every model here so that all tables are registered on ``Base.metadata``.
Alembic's ``env.py`` does ``import models`` (side effect only) before reading
``target_metadata`` — if you add a new model file, import it below or autogenerate
will miss tables and produce empty migrations.
"""

from database.base import Base
from models.crawl_history import CrawlHistory

__all__ = ["Base", "CrawlHistory"]
