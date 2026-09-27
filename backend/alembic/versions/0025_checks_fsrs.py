"""knowledge checks, attempts, FSRS state on review cards, lesson check/mastery stamps

Revision ID: 0025_checks_fsrs
Revises: 0024_study_readiness
Create Date: 2026-09-27

Existing review cards keep their box and due date. Their FSRS memory state is seeded from
the box interval (stability = the box's Leitner interval, which is the same definition FSRS
uses for stability: the interval at which recall is 90%). Nothing is dropped.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0025_checks_fsrs"
down_revision: Union[str, Sequence[str], None] = "0024_study_readiness"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BOX_DAYS = {1: 1, 2: 3, 3: 7, 4: 21, 5: 60}


def upgrade() -> None:
    op.add_column("review_cards", sa.Column("stability", sa.Float(), nullable=True))
    op.add_column("review_cards", sa.Column("difficulty", sa.Float(), nullable=True))
    op.add_column("review_cards", sa.Column("state", sa.Integer(), nullable=True))
    op.add_column("review_cards", sa.Column("step", sa.Integer(), nullable=True))
    op.add_column("review_cards", sa.Column("lapses", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("review_cards", sa.Column("last_review", sa.DateTime(timezone=True), nullable=True))
    for box, days in BOX_DAYS.items():
        op.execute(
            sa.text(
                "UPDATE review_cards SET stability = :days, difficulty = 5.0, state = 2, step = 0, "
                "last_review = COALESCE(last_reviewed_on, created_at) "
                "WHERE box = :box AND reviews > 0"
            ).bindparams(days=float(days), box=box)
        )

    op.add_column("user_learning_progress", sa.Column("checked_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("user_learning_progress", sa.Column("mastered_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "user_learning_progress",
        sa.Column("needs_refresh", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    op.create_table(
        "lesson_checks",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("lesson_id", sa.Uuid(), sa.ForeignKey("learning_lessons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("key", sa.String(80), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("options", sa.JSON(), nullable=False),
        sa.Column("answer_index", sa.Integer(), nullable=True),
        sa.Column("model_answer", sa.Text(), nullable=False, server_default=""),
        sa.Column("explanation", sa.Text(), nullable=False, server_default=""),
        sa.Column("section", sa.String(120), nullable=False, server_default=""),
        sa.Column("concept", sa.String(120), nullable=False, server_default=""),
        sa.Column("mistake", sa.String(120), nullable=True),
        sa.UniqueConstraint("lesson_id", "key", name="uq_lesson_checks_lesson_key"),
    )
    op.create_index("ix_lesson_checks_lesson_id", "lesson_checks", ["lesson_id"])

    op.create_table(
        "check_attempts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("check_id", sa.Uuid(), sa.ForeignKey("lesson_checks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lesson_id", sa.Uuid(), sa.ForeignKey("learning_lessons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source", sa.String(10), nullable=False),
        sa.Column("response", sa.Text(), nullable=False, server_default=""),
        sa.Column("correct", sa.Boolean(), nullable=False),
        sa.Column("confidence", sa.String(10), nullable=False),
        sa.Column("rating", sa.String(10), nullable=True),
        sa.Column("attempt_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("time_ms", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_check_attempts_user_id", "check_attempts", ["user_id"])
    op.create_index("ix_check_attempts_lesson_id", "check_attempts", ["lesson_id"])
    op.create_index("ix_check_attempts_user_check", "check_attempts", ["user_id", "check_id"])


def downgrade() -> None:
    op.drop_table("check_attempts")
    op.drop_table("lesson_checks")
    for column in ("needs_refresh", "mastered_at", "checked_at"):
        op.drop_column("user_learning_progress", column)
    for column in ("last_review", "lapses", "step", "state", "difficulty", "stability"):
        op.drop_column("review_cards", column)
