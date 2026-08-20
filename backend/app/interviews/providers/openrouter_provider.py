"""OpenRouter OpenAI-compatible Chat Completions backend for LLMProvider."""

from __future__ import annotations

import httpx

from app.common.config import get_settings
from app.common.logging import get_logger
from app.interviews.providers.base import LLMProvider, parse_json_object
from app.interviews.providers.errors import raise_if_provider_error

logger = get_logger(__name__)


class OpenRouterProvider(LLMProvider):
    name = "openrouter"

    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        self.api_key = (api_key or "").strip() or None
        self.model = (model or "").strip() or None

    def describe(self) -> dict[str, str | None]:
        settings = get_settings()
        return {
            "provider": self.name,
            "model": self.model or settings.openrouter_model,
            "endpoint": settings.openrouter_base_url,
        }

    def complete(self, system: str, transcript: list[dict[str, str]], user_turn: str) -> str:
        messages = [{"role": "system", "content": system}, *transcript, {"role": "user", "content": user_turn}]
        return self._chat(messages)

    def complete_json(self, system: str, user_turn: str) -> dict:
        raw = self._chat(
            [{"role": "system", "content": system}, {"role": "user", "content": user_turn}],
            json_mode=True,
        )
        return parse_json_object(raw)

    def _chat(self, messages: list[dict[str, str]], *, json_mode: bool = False) -> str:
        settings = get_settings()
        api_key = self.api_key or (settings.openrouter_api_key or "").strip()
        if not api_key:
            raise RuntimeError("An OpenRouter API key is required. Add one in Settings.")
        url = settings.openrouter_base_url.rstrip("/") + "/chat/completions"
        payload: dict = {
            "model": self.model or settings.openrouter_model,
            "messages": messages,
            "temperature": 0.45,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": settings.openrouter_referer,
            "X-Title": "Anvil",
        }
        with httpx.Client(timeout=60.0) as client:
            response = client.post(url, json=payload, headers=headers)
            data = raise_if_provider_error(response)
        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            logger.warning("openrouter_bad_payload", error=str(exc))
            raise ValueError("OpenRouter response missing message content.") from exc
        text = (content or "").strip()
        if not text:
            raise ValueError("Empty OpenRouter response.")
        return text
