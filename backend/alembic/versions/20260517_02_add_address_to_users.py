"""add address to users for saved user location

Revision ID: 20260517_02
Revises: 20260517_01
Create Date: 2026-05-17
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260517_02"
down_revision: Union[str, None] = "20260517_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def upgrade() -> None:
    if not _has_column("users", "address"):
        op.add_column("users", sa.Column("address", sa.String(length=500), nullable=True))


def downgrade() -> None:
    if _has_column("users", "address"):
        op.drop_column("users", "address")
