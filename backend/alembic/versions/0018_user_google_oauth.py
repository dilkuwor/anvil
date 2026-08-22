"""google sign-in identity columns

Revision ID: 0018_user_google_oauth
Revises: 0017_oauth
Create Date: 2026-08-22

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0018_user_google_oauth"
down_revision: Union[str, Sequence[str], None] = "0017_oauth"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("users", "password_hash", existing_type=sa.String(255), nullable=True)
    op.add_column("users", sa.Column("oauth_provider", sa.String(40), nullable=True))
    op.add_column("users", sa.Column("oauth_subject", sa.String(255), nullable=True))
    op.create_index(
        "uq_users_oauth_provider_subject",
        "users",
        ["oauth_provider", "oauth_subject"],
        unique=True,
        postgresql_where=sa.text("oauth_provider IS NOT NULL AND oauth_subject IS NOT NULL"),
        sqlite_where=sa.text("oauth_provider IS NOT NULL AND oauth_subject IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_users_oauth_provider_subject", table_name="users")
    op.drop_column("users", "oauth_subject")
    op.drop_column("users", "oauth_provider")
    op.alter_column("users", "password_hash", existing_type=sa.String(255), nullable=False)
