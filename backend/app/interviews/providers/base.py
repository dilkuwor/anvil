"""Provider-agnostic LLM interface for the mock interview agent."""

from __future__ import annotations

import json
import re
from abc import ABC, abstractmethod

_JSON_BLOCK = re.compile(r"\{.*\}", re.DOTALL)


class LLMProvider(ABC):
    """Chat + JSON completion. The agent never imports a concrete vendor."""

    name: str

    def describe(self) -> dict[str, str | None]:
        """Public connection details for Settings. Never include secrets."""
        return {"provider": getattr(self, "name", None), "model": None, "endpoint": None}

    def ping(self) -> str:
        """Cheap connectivity check used by Settings → Test connection."""
        return self.complete(
            "You are a connection test. Reply with the single word pong and nothing else.",
            [],
            "ping",
        )

    @abstractmethod
    def complete(self, system: str, transcript: list[dict[str, str]], user_turn: str) -> str:
        """Return a plain interviewer utterance."""

    @abstractmethod
    def complete_json(self, system: str, user_turn: str) -> dict:
        """Return a parsed JSON object for evaluation."""


def parse_json_object(raw: str) -> dict:
    match = _JSON_BLOCK.search(raw or "")
    if not match:
        raise ValueError("Model response was not JSON.")
    data = json.loads(match.group(0))
    if not isinstance(data, dict):
        raise ValueError("JSON must be an object.")
    return data
