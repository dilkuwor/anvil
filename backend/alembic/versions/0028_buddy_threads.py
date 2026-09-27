"""buddy conversation threads and messages

Revision ID: 0028_buddy_threads
Revises: 0027_reminder_deliveries
Create Date: 2026-09-28

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0028_buddy_threads"
down_revision: Union[str, Sequence[str], None] = "0027_reminder_deliveries"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "buddy_threads",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("context_kind", sa.String(20), nullable=False, server_default="general"),
        sa.Column("context_id", sa.String(200), nullable=False, server_default=""),
        sa.Column("context_title", sa.String(200), nullable=False, server_default=""),
        sa.Column("title", sa.String(200), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_buddy_threads_user_id", "buddy_threads", ["user_id"])
    op.create_index("ix_buddy_threads_context_kind", "buddy_threads", ["context_kind"])
    op.create_index("ix_buddy_threads_context_id", "buddy_threads", ["context_id"])

    op.create_table(
        "buddy_messages",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("thread_id", sa.Uuid(), sa.ForeignKey("buddy_threads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(12), nullable=False),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("mode", sa.String(12), nullable=False, server_default="ask"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_buddy_messages_thread_id", "buddy_messages", ["thread_id"])


def downgrade() -> None:
    op.drop_index("ix_buddy_messages_thread_id", table_name="buddy_messages")
    op.drop_table("buddy_messages")
    op.drop_index("ix_buddy_threads_context_id", table_name="buddy_threads")
    op.drop_index("ix_buddy_threads_context_kind", table_name="buddy_threads")
    op.drop_index("ix_buddy_threads_user_id", table_name="buddy_threads")
    op.drop_table("buddy_threads")
