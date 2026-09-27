"""Transcribe short recordings through the speech-to-text service next to the reader."""

from __future__ import annotations

import httpx

from app.common.config import get_settings
from app.common.errors import AppError, ServiceUnavailableError
from app.common.logging import get_logger

logger = get_logger(__name__)

MAX_BYTES = 25 * 1024 * 1024
DEFAULT_PROMPT = (
    "System design and coding interview: consistent hashing, sharding, replication, quorum, CAP theorem, "
    "idempotency, rate limiter, load balancer, CDN, Kafka, Redis, PostgreSQL, DynamoDB, LRU cache, Big O, "
    "Dijkstra, trie, heap, backtracking, dynamic programming, Java, Spring Boot."
)


def transcribe(audio: bytes, *, filename: str = "speech.webm", content_type: str = "audio/webm") -> str:
    settings = get_settings()
    if not audio:
        raise AppError("The recording is empty.", status_code=400, code="empty_audio")
    if len(audio) > MAX_BYTES:
        raise AppError("The recording is too long.", status_code=413, code="audio_too_large")
    if not settings.stt_base_url:
        raise ServiceUnavailableError("Voice input is not set up on this server.")

    url = settings.stt_base_url.rstrip("/") + "/transcribe"
    try:
        with httpx.Client(timeout=120.0) as client:
            response = client.post(
                url,
                files={"file": (filename, audio, content_type or "application/octet-stream")},
                data={"prompt": DEFAULT_PROMPT},
            )
    except httpx.HTTPError as exc:
        raise ServiceUnavailableError("Voice input is unavailable right now.") from exc

    if response.status_code == 400:
        raise AppError("Could not understand the recording. Try again.", status_code=400, code="unreadable_audio")
    if response.status_code >= 400:
        logger.warning("stt_failed", status=response.status_code, body=response.text[:300])
        raise ServiceUnavailableError("Voice input is unavailable right now.")
    try:
        text = str(response.json().get("text") or "").strip()
    except ValueError as exc:
        raise ServiceUnavailableError("Voice input returned an unreadable reply.") from exc
    return text
