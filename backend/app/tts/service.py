from __future__ import annotations

import httpx

from app.common.config import get_settings
from app.common.errors import AppError, ServiceUnavailableError
from app.common.logging import get_logger

MAX_TTS_CHARS = 6000

logger = get_logger(__name__)


def _response_detail(response: httpx.Response) -> str:
    try:
        body = response.json()
    except ValueError:
        return (response.text or "").strip()[:300]
    if isinstance(body, dict):
        detail = body.get("detail") or body.get("error") or body.get("message")
        if isinstance(detail, str):
            return detail.strip()[:300]
    return (response.text or "").strip()[:300]


def _unknown_voice(response: httpx.Response) -> bool:
    if response.status_code < 400:
        return False
    return "unknown voice" in _response_detail(response).lower()


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
            if _unknown_voice(response) and "voice" in payload:
                logger.warning("tts_unknown_voice", voice=payload["voice"], detail=_response_detail(response))
                response = client.post(url, json={"text": cleaned})
    except httpx.HTTPError as exc:
        raise ServiceUnavailableError("The reader is unavailable right now.") from exc

    if response.status_code >= 400:
        logger.warning("tts_speak_failed", status=response.status_code, detail=_response_detail(response))
        raise ServiceUnavailableError("The reader could not generate audio.")
    audio = response.content
    if not audio:
        raise ServiceUnavailableError("The reader returned empty audio.")
    content_type = response.headers.get("content-type") or "audio/wav"
    if ";" in content_type:
        content_type = content_type.split(";", 1)[0].strip()
    return audio, content_type
