from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=128)


class LlmKeyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    provider: str
    hint: str = Field(validation_alias="api_key_hint", serialization_alias="hint")
    model: str | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

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
    llm_provider: str | None = None
    has_llm_api_key: bool = False
    llm_api_key_hint: str | None = None
    llm_keys: list[LlmKeyOut] = Field(default_factory=list)


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


class LlmProbeOut(BaseModel):
    ok: bool
    provider: str
    provider_label: str
    using_platform_default: bool
    model: str
    model_source: str
    using_user_key: bool
    key_required: bool
    endpoint: str | None = None
    latency_ms: int | None = None
    reply: str | None = None
    error: str | None = None


class UpdateLlmSettingsRequest(BaseModel):
    provider: str | None = Field(default=None, max_length=40)
    api_key: str | None = Field(default=None, min_length=8, max_length=512)
    model: str | None = Field(default=None, max_length=200)
    clear_api_key: bool = False

    @field_validator("provider", "api_key", "model", mode="before")
    @classmethod
    def empty_to_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value.strip() if isinstance(value, str) else value
