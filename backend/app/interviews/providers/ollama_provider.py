"""Ollama backend for LLMProvider."""

from __future__ import annotations

from app.common.config import get_settings
from app.interviews import ollama
from app.interviews.providers.base import LLMProvider


class OllamaProvider(LLMProvider):
    name = "ollama"

    def describe(self) -> dict[str, str | None]:
        settings = get_settings()
        return {"provider": self.name, "model": settings.ollama_model, "endpoint": settings.ollama_base_url}

    def complete(self, system: str, transcript: list[dict[str, str]], user_turn: str) -> str:
        return ollama.interviewer_reply(system, transcript, user_turn)

    def complete_json(self, system: str, user_turn: str) -> dict:
        return ollama.evaluate_interview(system, user_turn)
