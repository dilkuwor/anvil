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


def chat(
    messages: list[dict[str, str]],
    *,
    timeout: float = 60.0,
    num_predict: int = 220,
    max_chars: int = 900,
    attempts: int = 3,
) -> str:
    settings = get_settings()
    url = f"{settings.ollama_base_url.rstrip('/')}/api/chat"
    payload = {
        "model": settings.ollama_model,
        "messages": messages,
        "stream": False,
        "options": {"temperature": 0.45, "num_predict": num_predict},
    }
    last_error: Exception | None = None
    tries = max(1, attempts)
    with httpx.Client(timeout=timeout) as client:
        for attempt in range(tries):
            try:
                response = client.post(url, json=payload)
                if response.status_code >= 500 and attempt < tries - 1:
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
                return _clean_reply(content, max_chars=max_chars)
            except (httpx.TimeoutException, httpx.TransportError, ValueError) as exc:
                last_error = exc
                if attempt == tries - 1:
                    break
                logger.warning("ollama_retry", error=str(exc), attempt=attempt + 1)
    if last_error:
        raise last_error
    raise RuntimeError("Ollama request failed.")


def tutor_reply(
    system: str,
    user_turn: str,
    conversation: list[dict[str, str]] | None = None,
) -> str:
    messages = _tutor_messages(system, user_turn, conversation)
    try:
        return chat(messages, timeout=75.0, num_predict=700, max_chars=4500)
    except Exception as exc:
        logger.warning("ollama_tutor_failed", error=str(exc))
        raise


def tutor_reply_stream(
    system: str,
    user_turn: str,
    conversation: list[dict[str, str]] | None = None,
):
    messages = _tutor_messages(system, user_turn, conversation)
    try:
        yield from chat_stream(messages, timeout=90.0, num_predict=700)
    except Exception as exc:
        logger.warning("ollama_tutor_stream_failed", error=str(exc))
        raise


def chat_stream(
    messages: list[dict[str, str]],
    *,
    timeout: float = 90.0,
    num_predict: int = 700,
):
    settings = get_settings()
    url = f"{settings.ollama_base_url.rstrip('/')}/api/chat"
    payload = {
        "model": settings.ollama_model,
        "messages": messages,
        "stream": True,
        "options": {"temperature": 0.45, "num_predict": num_predict},
    }
    with httpx.Client(timeout=timeout) as client:
        with client.stream("POST", url, json=payload) as response:
            if response.status_code >= 400:
                response.read()
                response.raise_for_status()
            for line in response.iter_lines():
                if not line:
                    continue
                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    continue
                delta = ((data.get("message") or {}).get("content") or "")
                if delta:
                    yield delta
                if data.get("done"):
                    break


def _tutor_messages(
    system: str,
    user_turn: str,
    conversation: list[dict[str, str]] | None,
) -> list[dict[str, str]]:
    history = _sanitize_history(conversation or [])
    return [{"role": "system", "content": system}, *history, {"role": "user", "content": user_turn}]


def _sanitize_history(conversation: list[dict[str, str]]) -> list[dict[str, str]]:
    cleaned: list[dict[str, str]] = []
    for item in conversation[-12:]:
        role = (item.get("role") or "").strip().lower()
        content = (item.get("content") or "").strip()
        if role not in {"user", "assistant"} or not content:
            continue
        cleaned.append({"role": role, "content": content[:4000]})
    return cleaned


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


def _clean_reply(text: str, max_chars: int = 900) -> str:
    cleaned = text.strip().strip('"').strip()
    cleaned = re.sub(r"^\s*(interviewer|assistant)\s*:\s*", "", cleaned, flags=re.I)
    if max_chars and len(cleaned) > max_chars:
        cleaned = cleaned[: max_chars - 1].rsplit(" ", 1)[0] + "…"
    return cleaned
