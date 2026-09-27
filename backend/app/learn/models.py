import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.database import Base
from app.common.enums import LearningProgressStatus


class LearningCategory(Base):
    __tablename__ = "learning_categories"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    icon: Mapped[str] = mapped_column(String(40), nullable=False, default="book")
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    topics = relationship("LearningTopic", back_populates="category", cascade="all, delete-orphan")


class LearningTopic(Base):
    __tablename__ = "learning_topics"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("learning_categories.id", ondelete="CASCADE"), index=True, nullable=False
    )
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False, default="EASY")
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    roadmap_key: Mapped[str | None] = mapped_column(String(80), unique=True, nullable=True)
    practice_tag: Mapped[str | None] = mapped_column(String(80), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    category = relationship("LearningCategory", back_populates="topics")
    lessons = relationship("LearningLesson", back_populates="topic", cascade="all, delete-orphan")


class LearningLesson(Base):
    __tablename__ = "learning_lessons"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    topic_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("learning_topics.id", ondelete="CASCADE"), index=True, nullable=False
    )
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    short_description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    takeaways: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    interview_questions: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=8)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    topic = relationship("LearningTopic", back_populates="lessons")
    problems = relationship("LearningLessonProblem", back_populates="lesson", cascade="all, delete-orphan")
    checks = relationship("LessonCheck", back_populates="lesson", cascade="all, delete-orphan", order_by="LessonCheck.display_order")
    progress = relationship("UserLearningProgress", back_populates="lesson", cascade="all, delete-orphan")


class LearningLessonProblem(Base):
    __tablename__ = "learning_lesson_problems"
    __table_args__ = (UniqueConstraint("lesson_id", "problem_id", name="uq_learning_lesson_problem"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("learning_lessons.id", ondelete="CASCADE"), index=True, nullable=False
    )
    problem_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("problems.id", ondelete="CASCADE"), index=True, nullable=False
    )
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    lesson = relationship("LearningLesson", back_populates="problems")
    problem = relationship("Problem")


class UserLearningProgress(Base):
    __tablename__ = "user_learning_progress"
    __table_args__ = (UniqueConstraint("user_id", "lesson_id", name="uq_user_learning_lesson"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("learning_lessons.id", ondelete="CASCADE"), index=True, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=LearningProgressStatus.NOT_STARTED.value
    )
    progress_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_accessed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Knowledge-check outcomes. ``checked_at`` is when every question was answered correctly once;
    # ``mastered_at`` comes from the mastery policy over the lesson's review cards.
    checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    mastered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    needs_refresh: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")

    lesson = relationship("LearningLesson", back_populates="progress")


class LessonCheck(Base):
    """One knowledge-check question. Content, shared by every learner; the answer never leaves the server."""

    __tablename__ = "lesson_checks"
    __table_args__ = (UniqueConstraint("lesson_id", "key", name="uq_lesson_checks_lesson_key"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("learning_lessons.id", ondelete="CASCADE"), index=True, nullable=False
    )
    key: Mapped[str] = mapped_column(String(80), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)  # choice | spot_mistake | short_answer
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    answer_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    model_answer: Mapped[str] = mapped_column(Text, nullable=False, default="")
    explanation: Mapped[str] = mapped_column(Text, nullable=False, default="")
    section: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    concept: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    mistake: Mapped[str | None] = mapped_column(String(120), nullable=True)

    lesson = relationship("LearningLesson", back_populates="checks")


class CheckAttempt(Base):
    """Raw learning events: every answer, with confidence and the rating the scheduler derived."""

    __tablename__ = "check_attempts"
    __table_args__ = (Index("ix_check_attempts_user_check", "user_id", "check_id"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    check_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("lesson_checks.id", ondelete="CASCADE"), nullable=False
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("learning_lessons.id", ondelete="CASCADE"), index=True, nullable=False
    )
    source: Mapped[str] = mapped_column(String(10), nullable=False)  # lesson | review
    response: Mapped[str] = mapped_column(Text, nullable=False, default="")
    correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    confidence: Mapped[str] = mapped_column(String(10), nullable=False)  # sure | unsure
    rating: Mapped[str | None] = mapped_column(String(10), nullable=True)
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
