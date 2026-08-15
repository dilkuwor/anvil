"""interview sessions

Revision ID: 0003_interview_sessions
Revises: 0002_user_profile
Create Date: 2026-08-15

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_interview_sessions"
down_revision: Union[str, Sequence[str], None] = "0002_user_profile"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "interview_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "problem_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("problems.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("phase", sa.String(30), nullable=False, server_default="INTRO"),
        sa.Column("duration_seconds", sa.Integer(), nullable=False, server_default="2700"),
        sa.Column("hints_used", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("run_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("submit_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("accepted", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_run_passed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_run_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_runtime_ms", sa.Integer(), nullable=True),
        sa.Column("last_memory_kb", sa.Integer(), nullable=True),
        sa.Column("last_status", sa.String(40), nullable=True),
        sa.Column("wrong_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("candidate_turns", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("followups_asked", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("feedback", postgresql.JSONB(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_interview_sessions_user_id", "interview_sessions", ["user_id"])
    op.create_index("ix_interview_sessions_problem_id", "interview_sessions", ["problem_id"])

    op.create_table(
        "interview_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("interview_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_interview_messages_session_id", "interview_messages", ["session_id"])

    op.create_table(
        "interview_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("interview_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("type", sa.String(30), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_interview_events_session_id", "interview_events", ["session_id"])


def downgrade() -> None:
    op.drop_index("ix_interview_events_session_id", table_name="interview_events")
    op.drop_table("interview_events")
    op.drop_index("ix_interview_messages_session_id", table_name="interview_messages")
    op.drop_table("interview_messages")
    op.drop_index("ix_interview_sessions_problem_id", table_name="interview_sessions")
    op.drop_index("ix_interview_sessions_user_id", table_name="interview_sessions")
    op.drop_table("interview_sessions")
