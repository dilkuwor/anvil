"""Study path, spaced review and daily plan.

Everything the study feature stores lives in these four tables. It never edits the older
tables: solved problems come from ``user_problem_progress``, finished lessons from
``user_learning_progress`` and mock interviews from ``interview_sessions``.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Index, Integer, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.database import Base


class StudySettings(Base):
    """One row per user: interview date, time zone and reminder choices."""

    __tablename__ = "study_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="UTC", server_default="UTC")
    interview_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    reminders_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    reminder_time: Mapped[str] = mapped_column(String(5), nullable=False, default="08:30", server_default="08:30")
    # Weekdays as Monday=0 .. Sunday=6.
    reminder_days: Mapped[list] = mapped_column(JSON, nullable=False, default=lambda: [0, 1, 2, 3, 4])
    reminder_email: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    last_reminder_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class ReviewCard(Base):
    """A Leitner card: one per solved problem, finished lesson or outlined design question."""

    __tablename__ = "review_cards"
    __table_args__ = (
        UniqueConstraint("user_id", "kind", "ref", name="uq_review_cards_user_kind_ref"),
        Index("ix_review_cards_user_due", "user_id", "due_on"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    ref: Mapped[str] = mapped_column(String(120), nullable=False)
    box: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    due_on: Mapped[date] = mapped_column(Date, nullable=False)
    reviews: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    last_rating: Mapped[str | None] = mapped_column(String(10), nullable=True)
    last_reviewed_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class StudyCompletion(Base):
    """Path items the user marks done by hand: design outlines, mocks and unit bosses."""

    __tablename__ = "study_completions"
    __table_args__ = (UniqueConstraint("user_id", "item_key", name="uq_study_completions_user_item"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    item_key: Mapped[str] = mapped_column(String(160), nullable=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class StudyDay(Base):
    """The plan picked for one day, so Today does not change under the user's feet."""

    __tablename__ = "study_days"
    __table_args__ = (UniqueConstraint("user_id", "day", name="uq_study_days_user_day"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    day: Mapped[date] = mapped_column(Date, nullable=False)
    # Task ids in order, e.g. ["review", "problem:lc-61", "lesson:caching", "story:lc-206"].
    plan: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    # Task ids the user ticked by hand.
    done: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    # Ratings given that day, for the observed recall rate.
    reviews_done: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    reviews_good: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    # Daily readiness snapshot (0..1), so the trend line grows on its own.
    coverage: Mapped[float | None] = mapped_column(Float, nullable=True)
    retention: Mapped[float | None] = mapped_column(Float, nullable=True)
    readiness: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
