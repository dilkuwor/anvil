from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    username: str
    role: str
    is_active: bool
    created_at: datetime
    linkedin_url: str | None = None
    github_url: str | None = None
    website_url: str | None = None
    country: str | None = None
    display_name: str | None = None
    has_avatar: bool = False


class UpdateProfileRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    display_name: str | None = Field(default=None, max_length=80)
    linkedin_url: str | None = Field(default=None, max_length=500)
    github_url: str | None = Field(default=None, max_length=500)
    website_url: str | None = Field(default=None, max_length=500)
    country: str | None = Field(default=None, max_length=80)

    @field_validator("linkedin_url", "github_url", "website_url", "country", "display_name", mode="before")
    @classmethod
    def empty_to_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value.strip() if isinstance(value, str) else value

    @field_validator("linkedin_url", "github_url", "website_url")
    @classmethod
    def validate_http_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not (value.startswith("https://") or value.startswith("http://")):
            raise ValueError("Enter a valid URL starting with http:// or https://")
        return value
