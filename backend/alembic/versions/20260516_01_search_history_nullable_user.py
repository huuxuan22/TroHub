"""search_history.user_id nullable for anonymous searches

Revision ID: 20260516_01
Revises: 20260515_01
Create Date: 2026-05-16
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260516_01"
down_revision: Union[str, None] = "20260515_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "search_history",
        "user_id",
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "search_history",
        "user_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
