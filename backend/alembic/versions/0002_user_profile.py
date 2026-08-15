"""user profile fields

Revision ID: 0002_user_profile
Revises: 0001_initial
Create Date: 2026-04-08

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_user_profile"
down_revision: Union[str, Sequence[str], None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("linkedin_url", sa.String(500), nullable=True))
    op.add_column("users", sa.Column("github_url", sa.String(500), nullable=True))
    op.add_column("users", sa.Column("website_url", sa.String(500), nullable=True))
    op.add_column("users", sa.Column("country", sa.String(80), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "country")
    op.drop_column("users", "website_url")
    op.drop_column("users", "github_url")
    op.drop_column("users", "linkedin_url")
