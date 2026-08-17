from __future__ import annotations

import httpx

from app.common.config import get_settings
from app.common.errors import AppError, ServiceUnavailableError

MAX_TTS_CHARS = 6000


def synthesize(text: str) -> tuple[bytes, str]:
    cleaned = " ".join((text or "").split()).strip()
    if not cleaned:
        raise AppError("Nothing to read.", status_code=422, code="empty_tts")
    if len(cleaned) > MAX_TTS_CHARS:
        cleaned = cleaned[: MAX_TTS_CHARS - 1].rsplit(" ", 1)[0] + "."

    settings = get_settings()
    url = settings.tts_base_url.rstrip("/") + "/speak"
    payload: dict[str, str] = {"text": cleaned}
    if settings.tts_voice:
        payload["voice"] = settings.tts_voice

    try:
        with httpx.Client(timeout=180.0) as client:
            response = client.post(url, json=payload)
    except httpx.HTTPError as exc:
        raise ServiceUnavailableError("The reader is unavailable right now.") from exc

    if response.status_code >= 400:
        raise ServiceUnavailableError("The reader could not generate audio.")
    audio = response.content
    if not audio:
        raise ServiceUnavailableError("The reader returned empty audio.")
    content_type = response.headers.get("content-type") or "audio/wav"
    if ";" in content_type:
        content_type = content_type.split(";", 1)[0].strip()
    return audio, content_type
