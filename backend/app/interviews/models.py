import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Uuid, func
from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.database import Base
from app.common.enums import InterviewPhase


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    problem_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("problems.id", ondelete="CASCADE"), index=True, nullable=False
    )
    phase: Mapped[str] = mapped_column(String(30), nullable=False, default=InterviewPhase.INTRO.value)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=2700)
    hints_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    run_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    submit_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    accepted: Mapped[bool] = mapped_column(Integer, nullable=False, default=0)
    last_run_passed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_run_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_runtime_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_memory_kb: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_status: Mapped[str | None] = mapped_column(String(40), nullable=True)
    wrong_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    candidate_turns: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    followups_asked: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    feedback: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    messages = relationship("InterviewMessage", back_populates="session", cascade="all, delete-orphan")
    events = relationship("InterviewEvent", back_populates="session", cascade="all, delete-orphan")


class InterviewMessage(Base):
    __tablename__ = "interview_messages"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    session = relationship("InterviewSession", back_populates="messages")


class InterviewEvent(Base):
    __tablename__ = "interview_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    session = relationship("InterviewSession", back_populates="events")
