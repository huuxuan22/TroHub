"""ensure rooms.source_url exists

Revision ID: 20260517_01
Revises: 20260516_01
Create Date: 2026-05-17
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260517_01"
down_revision: Union[str, None] = "20260516_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def _has_unique_source_url() -> bool:
    inspector = sa.inspect(op.get_bind())
    unique_constraints = inspector.get_unique_constraints("rooms")
    if any(constraint.get("name") == "uq_rooms_source_url" for constraint in unique_constraints):
        return True

    indexes = inspector.get_indexes("rooms")
    return any(index.get("name") == "uq_rooms_source_url" and index.get("unique") for index in indexes)


def upgrade() -> None:
    if not _has_column("rooms", "source_url"):
        op.add_column("rooms", sa.Column("source_url", sa.String(length=767), nullable=True))

    if not _has_unique_source_url():
        op.create_unique_constraint("uq_rooms_source_url", "rooms", ["source_url"])


def downgrade() -> None:
    if _has_unique_source_url():
        op.drop_constraint("uq_rooms_source_url", "rooms", type_="unique")

    if _has_column("rooms", "source_url"):
        op.drop_column("rooms", "source_url")
