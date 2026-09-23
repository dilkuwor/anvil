"""alternative algorithms on a solution approach

Revision ID: 0022_solution_alternatives
Revises: 0021_problem_solutions
Create Date: 2026-09-23

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0022_solution_alternatives"
down_revision: Union[str, Sequence[str], None] = "0021_problem_solutions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "problem_solution_approaches",
        sa.Column("is_alternative", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("problem_solution_approaches", "is_alternative")
