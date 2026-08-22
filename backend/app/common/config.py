from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Anvil"
    app_env: str = "development"
    log_level: str = "INFO"

    database_host: str = "100.95.177.124"
    database_port: int = 5432
    database_name: str = "interview_anvil"
    database_user: str = "postgres"
    database_password: str = "example"
    database_url: str | None = None

    jwt_secret: str = "change-me-to-a-long-random-string"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7
    cookie_name: str = "ia_access_token"
    cookie_secure: bool = False
    cookie_samesite: str = "lax"

    cors_origins: str = "http://localhost:3000"

    code_runner_image: str = "interview-anvil-java-runner:local"
    code_runner_url: str = ""
    code_runner_timeout_seconds: int = 20
    code_runner_memory_mb: int = 256
    code_runner_cpus: float = 1.0
    # Directory the API writes job files into. When the API itself runs in Docker,
    # this must be a bind-mount that the host Docker daemon can also see.
    code_runner_job_dir: str = ""
    # Optional host path for `docker run -v`. Defaults to code_runner_job_dir.
    code_runner_host_job_dir: str = ""

    ollama_base_url: str = "http://100.120.169.81:11434"
    ollama_model: str = "gemma3:4b"
    interview_duration_seconds: int = 45 * 60
    interview_llm_provider: str = "ollama"
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o-mini"
    gemini_api_key: str = ""
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta"
    gemini_model: str = "gemini-2.5-flash"
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "google/gemma-4-26b-a4b-it:free"
    openrouter_referer: str = "https://interviewanvil.local"
    tts_base_url: str = "http://100.120.169.81:8091"
    tts_voice: str = "af_heart"
    tts_language: str = "English"

    mcp_rate_limit_per_minute: int = 60
    mcp_max_tokens_per_user: int = 10

    @field_validator("cookie_samesite")
    @classmethod
    def validate_samesite(cls, value: str) -> str:
        allowed = {"lax", "strict", "none"}
        lowered = value.lower()
        if lowered not in allowed:
            raise ValueError(f"COOKIE_SAMESITE must be one of {allowed}")
        return lowered

    @property
    def sqlalchemy_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        password = self.database_password
        return (
            f"postgresql+psycopg://{self.database_user}:{password}"
            f"@{self.database_host}:{self.database_port}/{self.database_name}"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in {"prod", "production"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
