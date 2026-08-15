"""Ollama client. Gemma only writes interviewer lines — never judges correctness."""

from __future__ import annotations

import json
import re
import time
from typing import Any

import httpx

from app.common.config import get_settings
from app.common.logging import get_logger

logger = get_logger(__name__)

_JSON_BLOCK = re.compile(r"\{.*\}", re.DOTALL)


def chat(messages: list[dict[str, str]], *, timeout: float = 60.0) -> str:
    settings = get_settings()
    url = f"{settings.ollama_base_url.rstrip('/')}/api/chat"
    payload = {
        "model": settings.ollama_model,
        "messages": messages,
        "stream": False,
        "options": {"temperature": 0.45, "num_predict": 220},
    }
    last_error: Exception | None = None
    with httpx.Client(timeout=timeout) as client:
        for attempt in range(3):
            try:
                response = client.post(url, json=payload)
                if response.status_code >= 500 and attempt < 2:
                    logger.warning(
                        "ollama_retry",
                        status=response.status_code,
                        attempt=attempt + 1,
                        body=response.text[:300],
                    )
                    time.sleep(1.5 * (attempt + 1))
                    continue
                response.raise_for_status()
                data = response.json()
                content = ((data.get("message") or {}).get("content") or "").strip()
                if not content:
                    raise ValueError("Empty interviewer response.")
                return _clean_reply(content)
            except (httpx.TimeoutException, httpx.TransportError, ValueError) as exc:
                last_error = exc
                if attempt == 2:
                    break
                logger.warning("ollama_retry", error=str(exc), attempt=attempt + 1)
    if last_error:
        raise last_error
    raise RuntimeError("Ollama request failed.")


def interviewer_reply(system: str, transcript: list[dict[str, str]], user_turn: str) -> str:
    messages = [{"role": "system", "content": system}, *transcript, {"role": "user", "content": user_turn}]
    try:
        return chat(messages)
    except Exception as exc:
        logger.warning("ollama_interviewer_failed", error=str(exc))
        raise


def evaluate_interview(system: str, user_turn: str) -> dict[str, Any]:
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_turn},
    ]
    try:
        raw = chat(messages, timeout=60.0)
        return parse_feedback_json(raw)
    except Exception as exc:
        logger.warning("ollama_feedback_failed", error=str(exc))
        raise


def parse_feedback_json(raw: str) -> dict[str, Any]:
    match = _JSON_BLOCK.search(raw)
    if not match:
        raise ValueError("Feedback was not JSON.")
    data = json.loads(match.group(0))
    if not isinstance(data, dict):
        raise ValueError("Feedback JSON must be an object.")
    return data


def _clean_reply(text: str) -> str:
    cleaned = text.strip().strip('"').strip()
    cleaned = re.sub(r"^\s*(interviewer|assistant)\s*:\s*", "", cleaned, flags=re.I)
    if len(cleaned) > 900:
        cleaned = cleaned[:897].rsplit(" ", 1)[0] + "…"
    return cleaned
