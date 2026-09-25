"""readiness snapshot and review counters on study_days

Revision ID: 0024_study_readiness
Revises: 0023_study_path
Create Date: 2026-09-25

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0024_study_readiness"
down_revision: Union[str, Sequence[str], None] = "0023_study_path"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("study_days", sa.Column("reviews_done", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("study_days", sa.Column("reviews_good", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("study_days", sa.Column("coverage", sa.Float(), nullable=True))
    op.add_column("study_days", sa.Column("retention", sa.Float(), nullable=True))
    op.add_column("study_days", sa.Column("readiness", sa.Float(), nullable=True))


def downgrade() -> None:
    for column in ("readiness", "retention", "coverage", "reviews_good", "reviews_done"):
        op.drop_column("study_days", column)
