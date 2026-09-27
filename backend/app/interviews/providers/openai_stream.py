"""Server-sent event streaming for OpenAI-compatible chat completions."""

from __future__ import annotations

import json
from collections.abc import Iterator

import httpx

from app.interviews.providers.errors import raise_if_provider_error
from app.interviews.providers.thinking import strip_thinking


def stream_chat_completions(
    url: str,
    headers: dict[str, str],
    payload: dict,
    *,
    timeout: float = 120.0,
) -> Iterator[str]:
    """Yield content deltas from a `stream: true` chat completion."""
    body = {**payload, "stream": True}
    with httpx.Client(timeout=timeout) as client:
        with client.stream("POST", url, json=body, headers=headers) as response:
            if response.status_code >= 400:
                response.read()
                raise_if_provider_error(response)
            yield from strip_thinking(_content_deltas(response.iter_lines()))


def _content_deltas(lines) -> Iterator[str]:
    for line in lines:
        if not line or not line.startswith("data:"):
            continue
        data = line[5:].strip()
        if data == "[DONE]":
            break
        try:
            event = json.loads(data)
        except json.JSONDecodeError:
            continue
        if isinstance(event, dict) and event.get("error"):
            message = (
                event["error"].get("message")
                if isinstance(event["error"], dict)
                else str(event["error"])
            )
            raise RuntimeError(message or "The provider returned an error.")
        try:
            delta = event["choices"][0]["delta"].get("content") or ""
        except (KeyError, IndexError, TypeError, AttributeError):
            continue
        if delta:
            yield delta
