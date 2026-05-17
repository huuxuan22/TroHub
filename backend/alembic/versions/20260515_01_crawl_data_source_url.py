"""rooms.source_url for crawl dedup (bảng crawl_data do crawl service tạo, không tạo ở đây)

Revision ID: 20260515_01
Revises: 20260512_01
Create Date: 2026-05-15
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260515_01"
down_revision: Union[str, None] = "20260512_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("rooms", sa.Column("source_url", sa.String(length=767), nullable=True))
    op.create_unique_constraint("uq_rooms_source_url", "rooms", ["source_url"])


def downgrade() -> None:
    op.drop_constraint("uq_rooms_source_url", "rooms", type_="unique")
    op.drop_column("rooms", "source_url")
