"""user display name and avatar

Revision ID: 0005_user_display_avatar
Revises: 0004_learning_catalog
Create Date: 2026-08-16

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005_user_display_avatar"
down_revision: Union[str, Sequence[str], None] = "0004_learning_catalog"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("display_name", sa.String(80), nullable=True))
    op.add_column("users", sa.Column("avatar_bytes", sa.LargeBinary(), nullable=True))
    op.add_column("users", sa.Column("avatar_content_type", sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "avatar_content_type")
    op.drop_column("users", "avatar_bytes")
    op.drop_column("users", "display_name")
