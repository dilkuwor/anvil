"""study path, review cards, daily plan and reminder settings

Revision ID: 0023_study_path
Revises: 0022_solution_alternatives
Create Date: 2026-09-25

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0023_study_path"
down_revision: Union[str, Sequence[str], None] = "0022_solution_alternatives"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "study_settings",
        sa.Column("user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("timezone", sa.String(64), nullable=False, server_default="UTC"),
        sa.Column("interview_date", sa.Date(), nullable=True),
        sa.Column("reminders_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("reminder_time", sa.String(5), nullable=False, server_default="08:30"),
        sa.Column("reminder_days", sa.JSON(), nullable=False),
        sa.Column("reminder_email", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("last_reminder_on", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "review_cards",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("ref", sa.String(120), nullable=False),
        sa.Column("box", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("due_on", sa.Date(), nullable=False),
        sa.Column("reviews", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_rating", sa.String(10), nullable=True),
        sa.Column("last_reviewed_on", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("user_id", "kind", "ref", name="uq_review_cards_user_kind_ref"),
    )
    op.create_index("ix_review_cards_user_id", "review_cards", ["user_id"])
    op.create_index("ix_review_cards_user_due", "review_cards", ["user_id", "due_on"])

    op.create_table(
        "study_completions",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("item_key", sa.String(160), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("user_id", "item_key", name="uq_study_completions_user_item"),
    )
    op.create_index("ix_study_completions_user_id", "study_completions", ["user_id"])

    op.create_table(
        "study_days",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("plan", sa.JSON(), nullable=False),
        sa.Column("done", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("user_id", "day", name="uq_study_days_user_day"),
    )
    op.create_index("ix_study_days_user_id", "study_days", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_study_days_user_id", table_name="study_days")
    op.drop_table("study_days")
    op.drop_index("ix_study_completions_user_id", table_name="study_completions")
    op.drop_table("study_completions")
    op.drop_index("ix_review_cards_user_due", table_name="review_cards")
    op.drop_index("ix_review_cards_user_id", table_name="review_cards")
    op.drop_table("review_cards")
    op.drop_table("study_settings")
