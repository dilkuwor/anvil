"""SQLAlchemy models for scheduled cron jobs and their execution history."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Index, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.database import Base


class CronJob(Base):
    """Registry and distributed lease lock for scheduled jobs."""

    __tablename__ = "cron_jobs"

    name: Mapped[str] = mapped_column(String(64), primary_key=True)
    interval_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=10, server_default="10")
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    last_duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    runs = relationship("CronJobRun", back_populates="job", cascade="all, delete-orphan", order_by="desc(CronJobRun.started_at)")


class CronJobRun(Base):
    """Historical audit log for every execution tick of a scheduled job."""

    __tablename__ = "cron_job_runs"
    __table_args__ = (
        Index("ix_cron_job_runs_job_started", "job_name", "started_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_name: Mapped[str] = mapped_column(
        String(64), ForeignKey("cron_jobs.name", ondelete="CASCADE"), nullable=False, index=True
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="RUNNING")
    items_processed: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    items_sent: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    details: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    job = relationship("CronJob", back_populates="runs")
