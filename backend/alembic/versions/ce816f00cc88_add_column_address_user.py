"""add column address_user

Revision ID: ce816f00cc88
Revises: 20260517_02
Create Date: 2026-05-17 13:57:26.640060

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'ce816f00cc88'
down_revision: Union[str, None] = '20260517_02'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(table_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    if _has_table("craw_data"):
        op.drop_table("craw_data")


def downgrade() -> None:
    pass
