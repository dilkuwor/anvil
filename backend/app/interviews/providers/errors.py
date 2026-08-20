"""Turn vendor HTTP error payloads into a short, secret-free message."""

from __future__ import annotations

import re
from typing import Any

import httpx

_SECRET = re.compile(r"(sk-[a-zA-Z0-9_-]{8,}|AIza[a-zA-Z0-9_-]{8,}|sk-or-[a-zA-Z0-9_-]{8,})")
_GENERIC = {
    "provider returned error",
    "error",
    "internal server error",
    "internal error",
    "bad request",
}


def raise_if_provider_error(response: httpx.Response) -> dict:
    try:
        data = response.json()
    except Exception:
        data = None
    has_error = isinstance(data, dict) and bool(data.get("error"))
    if response.is_success and not has_error:
        if not isinstance(data, dict):
            raise ValueError("Provider response was not JSON.")
        return data
    message = format_provider_http_error(response.status_code, data)
    raise RuntimeError(message or f"The provider returned HTTP {response.status_code}.")


def format_provider_http_error(status: int, body: Any) -> str:
    message, raw = _extract(body)
    generic = not message or message.lower() in _GENERIC
    if raw and (generic or raw.lower() != message.lower()):
        text = raw if generic else f"{message} {raw}"
    else:
        text = message
    text = redact(text or "").strip()

    if status == 429:
        if text and ("rate" in text.lower() or "limit" in text.lower() or "quota" in text.lower()):
            return text[:320]
        extra = f" {text}" if text else ""
        return f"The provider rate-limited this request.{extra}".strip()[:320]
    if status in {401, 403}:
        return text[:320] if text and not generic else "The API key was rejected. Check the key for this provider."
    if status == 404:
        return text[:320] if text and not generic else "The model or endpoint was not found. Check the model name."
    if text:
        if generic:
            return f"The provider returned HTTP {status}."
        return text[:320]
    return f"The provider returned HTTP {status}."


def redact(text: str) -> str:
    return _SECRET.sub("…", text)


def _extract(body: Any) -> tuple[str | None, str | None]:
    if not isinstance(body, dict):
        return None, None
    error = body.get("error")
    message = None
    raw = None
    if isinstance(error, dict):
        message = error.get("message")
        metadata = error.get("metadata")
        if isinstance(metadata, dict):
            raw = metadata.get("raw")
    elif isinstance(error, str):
        message = error
    message = message.strip() if isinstance(message, str) and message.strip() else None
    raw = raw.strip() if isinstance(raw, str) and raw.strip() else None
    return message, raw
