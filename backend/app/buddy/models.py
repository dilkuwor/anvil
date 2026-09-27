import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.database import Base

CONTEXT_KINDS = ("general", "lesson", "problem", "design")
MODES = ("ask", "teach")


class BuddyThread(Base):
    """One conversation. Threads are tied to the page they started on so they can be reopened there."""

    __tablename__ = "buddy_threads"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    context_kind: Mapped[str] = mapped_column(String(20), nullable=False, default="general", index=True)
    context_id: Mapped[str] = mapped_column(String(200), nullable=False, default="", index=True)
    context_title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    messages = relationship(
        "BuddyMessage",
        back_populates="thread",
        cascade="all, delete-orphan",
        order_by="BuddyMessage.created_at",
    )


class BuddyMessage(Base):
    __tablename__ = "buddy_messages"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("buddy_threads.id", ondelete="CASCADE"), index=True, nullable=False
    )
    role: Mapped[str] = mapped_column(String(12), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    mode: Mapped[str] = mapped_column(String(12), nullable=False, default="ask")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    thread = relationship("BuddyThread", back_populates="messages")
