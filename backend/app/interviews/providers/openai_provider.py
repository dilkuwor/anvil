"""OpenAI-compatible Chat Completions backend for LLMProvider."""

from __future__ import annotations

import httpx

from app.common.config import get_settings
from app.common.logging import get_logger
from app.interviews.providers.base import LLMProvider, parse_json_object

logger = get_logger(__name__)


class OpenAIProvider(LLMProvider):
    name = "openai"

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = (api_key or "").strip() or None

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
        api_key = self.api_key or (settings.openai_api_key or "").strip()
        if not api_key:
            raise RuntimeError("An OpenAI API key is required. Add one in Settings.")
        url = settings.openai_base_url.rstrip("/") + "/chat/completions"
        payload: dict = {
            "model": settings.openai_model,
            "messages": messages,
            "temperature": 0.45,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        with httpx.Client(timeout=60.0) as client:
            response = client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            logger.warning("openai_bad_payload", error=str(exc))
            raise ValueError("OpenAI response missing message content.") from exc
        text = (content or "").strip()
        if not text:
            raise ValueError("Empty OpenAI response.")
        return text
