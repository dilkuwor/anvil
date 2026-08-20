import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.database import Base
from app.common.enums import NoteKind, NoteSourceType


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    source_type: Mapped[str] = mapped_column(String(32), nullable=False, default=NoteSourceType.LESSON.value, index=True)
    source_id: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    source_title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    source_href: Mapped[str] = mapped_column(String(400), nullable=False, default="")
    kind: Mapped[str] = mapped_column(String(20), nullable=False, default=NoteKind.MANUAL.value)
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    body: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
