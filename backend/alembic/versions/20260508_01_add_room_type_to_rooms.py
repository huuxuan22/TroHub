"""add room_type to rooms

Revision ID: 20260508_01
Revises: 20260507_01
Create Date: 2026-05-08 20:55:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260508_01"
down_revision: Union[str, None] = "20260507_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "rooms",
        sa.Column("room_type", sa.String(length=100), nullable=False, server_default="Phòng trọ"),
    )
    op.alter_column("rooms", "room_type", server_default=None)


def downgrade() -> None:
    op.drop_column("rooms", "room_type")
