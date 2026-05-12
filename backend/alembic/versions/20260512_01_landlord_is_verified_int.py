"""landlord_profiles.is_verified as 0/1 (chưa duyệt / đã duyệt)

Revision ID: 20260512_01
Revises: 20260508_01
Create Date: 2026-05-12
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260512_01"
down_revision: Union[str, None] = "20260508_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "landlord_profiles",
        "is_verified",
        existing_type=sa.Boolean(),
        type_=sa.SmallInteger(),
        existing_nullable=False,
        server_default=sa.text("0"),
    )


def downgrade() -> None:
    op.alter_column(
        "landlord_profiles",
        "is_verified",
        existing_type=sa.SmallInteger(),
        type_=sa.Boolean(),
        existing_nullable=False,
        server_default=sa.text("0"),
    )
