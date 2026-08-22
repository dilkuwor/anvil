import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, LargeBinary, String, Text, UniqueConstraint, Uuid, false, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.database import Base
from app.common.enums import UserRole


class UserLlmKey(Base):
    __tablename__ = "user_llm_keys"
    __table_args__ = (UniqueConstraint("user_id", "provider", name="uq_user_llm_key_provider"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    api_key_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    api_key_hint: Mapped[str] = mapped_column(String(16), nullable=False)
    model: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user = relationship("User", back_populates="llm_keys")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index(
            "uq_users_oauth_provider_subject",
            "oauth_provider",
            "oauth_subject",
            unique=True,
            postgresql_where=text("oauth_provider IS NOT NULL AND oauth_subject IS NOT NULL"),
            sqlite_where=text("oauth_provider IS NOT NULL AND oauth_subject IS NOT NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    oauth_provider: Mapped[str | None] = mapped_column(String(40), nullable=True)
    oauth_subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default=UserRole.USER.value)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=false())
    # Durable once-only marker for the welcome email; NULL means not sent yet.
    welcome_email_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    github_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    website_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    country: Mapped[str | None] = mapped_column(String(80), nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    llm_provider: Mapped[str | None] = mapped_column(String(40), nullable=True)
    llm_api_key_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    llm_api_key_hint: Mapped[str | None] = mapped_column(String(16), nullable=True)
    avatar_bytes: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    avatar_content_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    submissions = relationship("Submission", back_populates="user")
    progress = relationship("UserProblemProgress", back_populates="user")
    activity = relationship("Activity", back_populates="user")
    llm_keys = relationship("UserLlmKey", back_populates="user", cascade="all, delete-orphan", lazy="selectin")

    @property
    def has_avatar(self) -> bool:
        return self.avatar_bytes is not None

    def llm_key_for(self, provider: str | None) -> UserLlmKey | None:
        if not provider:
            return None
        return next((row for row in self.llm_keys if row.provider == provider), None)

    @property
    def has_llm_api_key(self) -> bool:
        return self.llm_key_for(self.llm_provider) is not None

    @property
    def llm_api_key_hint(self) -> str | None:
        row = self.llm_key_for(self.llm_provider)
        return row.api_key_hint if row else None
