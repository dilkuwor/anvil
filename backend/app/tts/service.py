from __future__ import annotations

import hashlib
import os
import tempfile
import time
from pathlib import Path

import httpx

from app.common.config import get_settings
from app.common.errors import AppError, ServiceUnavailableError
from app.common.logging import get_logger

MAX_TTS_CHARS = 6000

logger = get_logger(__name__)

_EXTENSIONS = {
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/wave": "wav",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/ogg": "ogg",
    "audio/opus": "opus",
    "audio/flac": "flac",
    "audio/aac": "aac",
    "audio/webm": "webm",
}
_CONTENT_TYPES = {ext: mime for mime, ext in reversed(list(_EXTENSIONS.items()))}


def cache_dir() -> Path | None:
    """Where synthesized audio is stored, or None when caching is off."""
    settings = get_settings()
    if settings.tts_cache_days <= 0:
        return None
    raw = settings.tts_cache_dir.strip()
    return Path(raw) if raw else Path(tempfile.gettempdir()) / "anvil-tts"


def _cache_key(text: str, voice: str) -> str:
    return hashlib.sha256(f"{voice}\n{text}".encode()).hexdigest()


def _cache_lookup(folder: Path, key: str) -> tuple[bytes, str] | None:
    for ext, mime in _CONTENT_TYPES.items():
        path = folder / f"{key}.{ext}"
        if path.is_file():
            try:
                data = path.read_bytes()
                os.utime(path, None)  # keep recently played audio out of the prune
            except OSError:
                return None
            return (data, mime) if data else None
    return None


def _cache_store(folder: Path, key: str, audio: bytes, content_type: str) -> None:
    ext = _EXTENSIONS.get(content_type)
    if not ext:
        return
    try:
        folder.mkdir(parents=True, exist_ok=True)
        tmp = folder / f"{key}.{ext}.{os.getpid()}.tmp"
        tmp.write_bytes(audio)
        os.replace(tmp, folder / f"{key}.{ext}")
    except OSError as exc:
        logger.warning("tts_cache_write_failed", error=type(exc).__name__)


def prune_cache(now: float | None = None) -> int:
    """Delete cached audio that has not been played for TTS_CACHE_DAYS. Returns the count."""
    folder = cache_dir()
    if folder is None or not folder.is_dir():
        return 0
    cutoff = (now or time.time()) - get_settings().tts_cache_days * 86400
    removed = 0
    for path in folder.iterdir():
        try:
            if path.is_file() and (path.suffix == ".tmp" or path.stat().st_mtime < cutoff):
                path.unlink()
                removed += 1
        except OSError:
            continue
    if removed:
        logger.info("tts_cache_pruned", removed=removed)
    return removed


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
    folder = cache_dir()
    key = _cache_key(cleaned, settings.tts_voice)
    if folder is not None:
        cached = _cache_lookup(folder, key)
        if cached is not None:
            return cached

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
    if folder is not None:
        _cache_store(folder, key, audio, content_type)
    return audio, content_type
