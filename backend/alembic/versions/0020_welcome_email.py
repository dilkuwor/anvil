"""welcome email tracking

Revision ID: 0020_welcome_email
Revises: 0019_email_verification
Create Date: 2026-08-22

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0020_welcome_email"
down_revision: Union[str, Sequence[str], None] = "0019_email_verification"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("welcome_email_sent_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "welcome_email_sent_at")
