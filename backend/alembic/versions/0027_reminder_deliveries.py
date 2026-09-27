"""per-user reminder delivery log

Revision ID: 0027_reminder_deliveries
Revises: 0026_cron_job_history
Create Date: 2026-09-27

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0027_reminder_deliveries"
down_revision: Union[str, Sequence[str], None] = "0026_cron_job_history"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "reminder_deliveries",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("kind", sa.String(10), nullable=False, server_default="daily"),
        sa.Column("status", sa.String(10), nullable=False),
        sa.Column("reason", sa.String(40), nullable=True),
        sa.Column("subject", sa.String(200), nullable=False, server_default=""),
        sa.Column("task_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("task_titles", sa.JSON(), nullable=False),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_reminder_deliveries_user_id", "reminder_deliveries", ["user_id"])
    op.create_index("ix_reminder_deliveries_user_created", "reminder_deliveries", ["user_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_reminder_deliveries_user_created", table_name="reminder_deliveries")
    op.drop_index("ix_reminder_deliveries_user_id", table_name="reminder_deliveries")
    op.drop_table("reminder_deliveries")
