"""user custom problem lists

Revision ID: 0008_problem_lists
Revises: 0007_preview_interviews
Create Date: 2026-08-16

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0008_problem_lists"
down_revision: Union[str, Sequence[str], None] = "0007_preview_interviews"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "problem_lists",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("user_id", "name", name="uq_problem_list_user_name"),
    )
    op.create_index("ix_problem_lists_user_id", "problem_lists", ["user_id"])

    op.create_table(
        "problem_list_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "list_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("problem_lists.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "problem_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("problems.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("list_id", "problem_id", name="uq_problem_list_item"),
    )
    op.create_index("ix_problem_list_items_list_id", "problem_list_items", ["list_id"])
    op.create_index("ix_problem_list_items_problem_id", "problem_list_items", ["problem_id"])


def downgrade() -> None:
    op.drop_index("ix_problem_list_items_problem_id", table_name="problem_list_items")
    op.drop_index("ix_problem_list_items_list_id", table_name="problem_list_items")
    op.drop_table("problem_list_items")
    op.drop_index("ix_problem_lists_user_id", table_name="problem_lists")
    op.drop_table("problem_lists")
