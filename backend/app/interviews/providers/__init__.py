"""LLM providers for MockInterviewAgent.

MockInterviewAgent
        ↓
    LLMProvider
   ↙    ↓     ↘      ↘
Ollama OpenAI Gemini OpenRouter
"""

from app.common.config import get_settings
from app.interviews.providers.base import LLMProvider, parse_json_object
from app.interviews.providers.gemini_provider import GeminiProvider
from app.interviews.providers.ollama_provider import OllamaProvider
from app.interviews.providers.openai_provider import OpenAIProvider
from app.interviews.providers.openrouter_provider import OpenRouterProvider

_PROVIDERS: dict[str, type[LLMProvider]] = {
    OllamaProvider.name: OllamaProvider,
    OpenAIProvider.name: OpenAIProvider,
    GeminiProvider.name: GeminiProvider,
    OpenRouterProvider.name: OpenRouterProvider,
}

PAID_PROVIDERS = frozenset({OpenAIProvider.name, GeminiProvider.name, OpenRouterProvider.name})


def normalize_provider_name(name: str | None) -> str | None:
    if name is None:
        return None
    key = name.strip().lower()
    if key in {"", "default", "platform"}:
        return None
    if key not in _PROVIDERS:
        supported = ", ".join(sorted(_PROVIDERS))
        raise ValueError(f"Unsupported provider {key!r}. Expected one of: {supported}.")
    return key


def get_llm_provider(name: str | None = None, *, api_key: str | None = None, model: str | None = None) -> LLMProvider:
    key = normalize_provider_name(name) or (get_settings().interview_llm_provider or "ollama").strip().lower()
    try:
        provider_cls = _PROVIDERS[key]
    except KeyError as exc:
        supported = ", ".join(sorted(_PROVIDERS))
        raise ValueError(f"Unsupported INTERVIEW_LLM_PROVIDER {key!r}. Expected one of: {supported}.") from exc
    if key in PAID_PROVIDERS:
        return provider_cls(api_key=api_key, model=model)
    return provider_cls()


UNREADABLE_KEY_MESSAGE = (
    "The saved API key cannot be decrypted. Paste the key again in Settings and save. "
    "This usually happens after JWT_SECRET changes on the server."
)


def get_llm_provider_for_user(user) -> LLMProvider:
    from app.common.errors import AppError
    from app.common.secrets import SecretDecryptError, decrypt_secret

    name = getattr(user, "llm_provider", None) if user is not None else None
    resolved = normalize_provider_name(name) or (get_settings().interview_llm_provider or "ollama").strip().lower()
    api_key = None
    model = None
    if user is not None:
        row = user.llm_key_for(resolved)
        if row is not None:
            try:
                api_key = decrypt_secret(row.api_key_encrypted)
            except SecretDecryptError as exc:
                raise AppError(UNREADABLE_KEY_MESSAGE, status_code=409, code="llm_key_undecryptable") from exc
            model = (row.model or "").strip() or None
    return get_llm_provider(name, api_key=api_key, model=model)


__all__ = [
    "LLMProvider",
    "OllamaProvider",
    "OpenAIProvider",
    "GeminiProvider",
    "OpenRouterProvider",
    "PAID_PROVIDERS",
    "get_llm_provider",
    "get_llm_provider_for_user",
    "normalize_provider_name",
    "parse_json_object",
]
