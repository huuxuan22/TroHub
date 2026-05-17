"""add address to users for saved user location

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


def upgrade() -> None:
    op.add_column("users", sa.Column("address", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "address")
