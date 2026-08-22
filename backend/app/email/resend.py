"""Resend HTTP client. The only place that talks to the email provider."""

from __future__ import annotations

from typing import Any

import httpx
import structlog

from app.common.config import get_settings

logger = structlog.get_logger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"
_TIMEOUT_SECONDS = 10.0


class EmailSendError(Exception):
    """The provider rejected or could not be reached for a send."""


def is_configured() -> bool:
    """True when RESEND_API_KEY and EMAIL_FROM are present."""
    settings = get_settings()
    return bool(settings.resend_api_key.strip() and settings.email_from.strip())


def send_email(*, to: str, subject: str, html: str, text: str) -> None:
    """Send one email via the Resend REST API.

    Raises :class:`EmailSendError` when Resend is not configured, rejects the
    payload, or cannot be reached. Callers decide whether that fails a request;
    registration deliberately treats delivery as best-effort.
    """
    settings = get_settings()
    api_key = settings.resend_api_key.strip()
    sender = settings.email_from.strip()
    if not api_key or not sender:
        raise EmailSendError("Email sending is not configured.")

    payload: dict[str, Any] = {
        "from": sender,
        "to": [to],
        "subject": subject,
        "html": html,
        "text": text,
    }
    try:
        with httpx.Client(timeout=_TIMEOUT_SECONDS) as client:
            response = client.post(
                RESEND_API_URL,
                json=payload,
                headers={"Authorization": f"Bearer {api_key}"},
            )
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        # Never include the API key; the response body may name the rejected address.
        logger.warning(
            "email_send_rejected",
            status=exc.response.status_code,
            subject=subject,
        )
        raise EmailSendError("The email provider rejected the message.") from exc
    except httpx.HTTPError as exc:
        logger.warning("email_send_failed", error=type(exc).__name__, subject=subject)
        raise EmailSendError("The email provider could not be reached.") from exc
