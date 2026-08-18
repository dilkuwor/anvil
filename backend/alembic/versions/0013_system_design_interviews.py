"""system design interview sessions

Revision ID: 0013_system_design_interviews
Revises: 0012_user_llm_key_model
Create Date: 2026-08-18

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0013_system_design_interviews"
down_revision: Union[str, Sequence[str], None] = "0012_user_llm_key_model"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "interview_sessions",
        "problem_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )
    op.add_column(
        "interview_sessions",
        sa.Column("kind", sa.String(30), nullable=False, server_default="CODING"),
    )
    op.add_column("interview_sessions", sa.Column("scenario_slug", sa.String(80), nullable=True))
    op.add_column("interview_sessions", sa.Column("scenario", postgresql.JSONB(), nullable=True))
    op.add_column("interview_sessions", sa.Column("architecture", postgresql.JSONB(), nullable=True))
    op.add_column(
        "interview_sessions",
        sa.Column("phase_turns", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_interview_sessions_scenario_slug", "interview_sessions", ["scenario_slug"])
    op.create_index("ix_interview_sessions_kind", "interview_sessions", ["kind"])


def downgrade() -> None:
    op.drop_index("ix_interview_sessions_kind", table_name="interview_sessions")
    op.drop_index("ix_interview_sessions_scenario_slug", table_name="interview_sessions")
    op.drop_column("interview_sessions", "phase_turns")
    op.drop_column("interview_sessions", "architecture")
    op.drop_column("interview_sessions", "scenario")
    op.drop_column("interview_sessions", "scenario_slug")
    op.drop_column("interview_sessions", "kind")
    op.alter_column(
        "interview_sessions",
        "problem_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
