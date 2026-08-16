"""guest preview interview sessions

Revision ID: 0007_preview_interviews
Revises: 0006_cheat_sheets
Create Date: 2026-08-16

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0007_preview_interviews"
down_revision: Union[str, Sequence[str], None] = "0006_cheat_sheets"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "interview_sessions",
        "user_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )
    op.add_column(
        "interview_sessions",
        sa.Column("is_preview", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade() -> None:
    op.drop_column("interview_sessions", "is_preview")
    op.alter_column(
        "interview_sessions",
        "user_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
