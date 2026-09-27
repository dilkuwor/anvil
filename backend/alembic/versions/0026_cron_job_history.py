"""cron jobs and execution history

Revision ID: 0026_cron_job_history
Revises: 0025_checks_fsrs
Create Date: 2026-09-27

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0026_cron_job_history"
down_revision: Union[str, Sequence[str], None] = "0025_checks_fsrs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cron_jobs",
        sa.Column("name", sa.String(length=64), primary_key=True, nullable=False),
        sa.Column("interval_minutes", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_status", sa.String(length=20), nullable=True),
        sa.Column("last_duration_ms", sa.Integer(), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "cron_job_runs",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("job_name", sa.String(length=64), sa.ForeignKey("cron_jobs.name", ondelete="CASCADE"), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="RUNNING"),
        sa.Column("items_processed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("items_sent", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_cron_job_runs_job_name", "cron_job_runs", ["job_name"])
    op.create_index("ix_cron_job_runs_job_started", "cron_job_runs", ["job_name", "started_at"])


def downgrade() -> None:
    op.drop_index("ix_cron_job_runs_job_started", table_name="cron_job_runs")
    op.drop_index("ix_cron_job_runs_job_name", table_name="cron_job_runs")
    op.drop_table("cron_job_runs")
    op.drop_table("cron_jobs")
