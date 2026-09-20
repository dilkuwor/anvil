"""problem solutions

Revision ID: 0021_problem_solutions
Revises: 0020_welcome_email
Create Date: 2026-09-20

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0021_problem_solutions"
down_revision: Union[str, Sequence[str], None] = "0020_welcome_email"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "problem_solutions",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("problem_id", sa.Uuid(as_uuid=True), sa.ForeignKey("problems.id", ondelete="CASCADE"), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("pattern", sa.String(120), nullable=False, server_default=""),
        sa.Column("trigger", sa.Text(), nullable=False, server_default=""),
        sa.Column("walkthrough", sa.JSON(), nullable=False),
        sa.Column("mistakes", sa.JSON(), nullable=False),
        sa.Column("edge_cases", sa.JSON(), nullable=False),
        sa.Column("interview_script", sa.JSON(), nullable=False),
        sa.Column("follow_ups", sa.JSON(), nullable=False),
        sa.Column("related_slugs", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_problem_solutions_problem_id", "problem_solutions", ["problem_id"], unique=True)
    op.create_table(
        "problem_solution_approaches",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "solution_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("problem_solutions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("idea", sa.Text(), nullable=False, server_default=""),
        sa.Column("steps", sa.JSON(), nullable=False),
        sa.Column("language", sa.String(20), nullable=False, server_default="JAVA"),
        sa.Column("code", sa.Text(), nullable=False, server_default=""),
        sa.Column("time_complexity", sa.String(100), nullable=False, server_default=""),
        sa.Column("time_why", sa.Text(), nullable=False, server_default=""),
        sa.Column("space_complexity", sa.String(100), nullable=False, server_default=""),
        sa.Column("space_why", sa.Text(), nullable=False, server_default=""),
        sa.Column("when_to_use", sa.Text(), nullable=False, server_default=""),
        sa.Column("is_optimal", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.UniqueConstraint("solution_id", "position", name="uq_solution_approach_position"),
    )
    op.create_index("ix_problem_solution_approaches_solution_id", "problem_solution_approaches", ["solution_id"])


def downgrade() -> None:
    op.drop_index("ix_problem_solution_approaches_solution_id", table_name="problem_solution_approaches")
    op.drop_table("problem_solution_approaches")
    op.drop_index("ix_problem_solutions_problem_id", table_name="problem_solutions")
    op.drop_table("problem_solutions")
