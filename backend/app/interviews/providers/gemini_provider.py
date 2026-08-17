"""Google Gemini generateContent backend for LLMProvider."""

from __future__ import annotations

import httpx

from app.common.config import get_settings
from app.common.logging import get_logger
from app.interviews.providers.base import LLMProvider, parse_json_object

logger = get_logger(__name__)


class GeminiProvider(LLMProvider):
    name = "gemini"

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = (api_key or "").strip() or None

    def complete(self, system: str, transcript: list[dict[str, str]], user_turn: str) -> str:
        contents = _to_gemini_contents([*transcript, {"role": "user", "content": user_turn}])
        return self._generate(system, contents)

    def complete_json(self, system: str, user_turn: str) -> dict:
        raw = self._generate(
            system,
            _to_gemini_contents([{"role": "user", "content": user_turn}]),
            json_mode=True,
        )
        return parse_json_object(raw)

    def _generate(self, system: str, contents: list[dict], *, json_mode: bool = False) -> str:
        settings = get_settings()
        api_key = self.api_key or (settings.gemini_api_key or "").strip()
        if not api_key:
            raise RuntimeError("A Gemini API key is required. Add one in Settings.")
        model = settings.gemini_model.strip() or "gemini-2.5-flash"
        url = f"{settings.gemini_base_url.rstrip('/')}/models/{model}:generateContent"
        generation: dict = {"temperature": 0.45}
        if json_mode:
            generation["responseMimeType"] = "application/json"
        payload = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": contents,
            "generationConfig": generation,
        }
        with httpx.Client(timeout=60.0) as client:
            response = client.post(url, params={"key": api_key}, json=payload)
            response.raise_for_status()
            data = response.json()
        try:
            parts = data["candidates"][0]["content"]["parts"]
            text = "".join(str(part.get("text") or "") for part in parts).strip()
        except (KeyError, IndexError, TypeError) as exc:
            logger.warning("gemini_bad_payload", error=str(exc))
            raise ValueError("Gemini response missing message content.") from exc
        if not text:
            raise ValueError("Empty Gemini response.")
        return text


def _to_gemini_contents(messages: list[dict[str, str]]) -> list[dict]:
    contents: list[dict] = []
    for item in messages:
        role = (item.get("role") or "user").strip().lower()
        text = (item.get("content") or "").strip()
        if not text:
            continue
        gemini_role = "model" if role in {"assistant", "model"} else "user"
        if contents and contents[-1]["role"] == gemini_role:
            contents[-1]["parts"][0]["text"] += "\n" + text
            continue
        contents.append({"role": gemini_role, "parts": [{"text": text}]})
    if not contents:
        contents.append({"role": "user", "parts": [{"text": "Continue."}]})
    return contents
