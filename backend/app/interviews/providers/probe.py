"""Probe the user's saved interview LLM without exposing secrets."""

from __future__ import annotations

import time
from typing import Any

import httpx

from app.common.config import get_settings
from app.interviews.providers import PAID_PROVIDERS, get_llm_provider_for_user, normalize_provider_name
from app.interviews.providers.errors import format_provider_http_error, redact

PROVIDER_LABELS = {
    "ollama": "Ollama",
    "openai": "OpenAI",
    "gemini": "Google Gemini",
    "openrouter": "OpenRouter",
}


def probe_llm_for_user(user: Any) -> dict[str, Any]:
    settings = get_settings()
    selected = getattr(user, "llm_provider", None) if user is not None else None
    resolved = normalize_provider_name(selected) or (settings.interview_llm_provider or "ollama").strip().lower()
    key_row = user.llm_key_for(resolved) if user is not None else None
    model_override = ((key_row.model or "").strip() or None) if key_row is not None else None
    platform_model = _platform_model(resolved, settings)

    provider = get_llm_provider_for_user(user)
    meta = provider.describe()
    model = (meta.get("model") or "").strip()
    endpoint = _public_endpoint(meta.get("endpoint"))
    custom_model = bool(model_override and model_override != platform_model)

    result: dict[str, Any] = {
        "ok": False,
        "provider": resolved,
        "provider_label": PROVIDER_LABELS.get(resolved, resolved),
        "using_platform_default": not selected,
        "model": model,
        "model_source": "custom" if custom_model else "platform_default",
        "using_user_key": key_row is not None,
        "key_required": resolved in PAID_PROVIDERS,
        "endpoint": endpoint,
        "latency_ms": None,
        "reply": None,
        "error": None,
    }

    started = time.perf_counter()
    try:
        reply = provider.ping()
        result["ok"] = True
        result["latency_ms"] = _elapsed_ms(started)
        result["reply"] = (reply or "").strip()[:160] or None
    except Exception as exc:
        result["latency_ms"] = _elapsed_ms(started)
        result["error"] = _friendly_error(exc)
    return result


def _elapsed_ms(started: float) -> int:
    return max(0, int((time.perf_counter() - started) * 1000))


def _public_endpoint(raw: str | None) -> str | None:
    value = (raw or "").strip()
    if not value:
        return None
    return value.split("?", 1)[0].rstrip("/")


def _platform_model(provider: str, settings: Any) -> str:
    if provider == "openai":
        return settings.openai_model
    if provider == "gemini":
        return settings.gemini_model.strip() or "gemini-2.5-flash"
    if provider == "openrouter":
        return settings.openrouter_model
    return settings.ollama_model


def _friendly_error(exc: Exception) -> str:
    if isinstance(exc, httpx.HTTPStatusError):
        try:
            body = exc.response.json()
        except Exception:
            body = None
        return format_provider_http_error(exc.response.status_code, body)
    if isinstance(exc, httpx.TimeoutException):
        return "The provider timed out."
    if isinstance(exc, httpx.TransportError):
        return "Could not reach the provider."
    return redact(str(exc) or exc.__class__.__name__)[:320]
