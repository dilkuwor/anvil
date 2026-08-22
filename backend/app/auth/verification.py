"""Email verification tokens and flows.

Security properties:
- Raw tokens are generated with ``secrets`` (CSPRNG) and exist only in the
  verification email link; the database stores an HMAC-SHA256 digest keyed with
  the server secret.
- Tokens expire after ``EMAIL_VERIFICATION_TOKEN_HOURS`` (default 24h).
- Tokens are single-use: consuming sets ``used_at`` and issuing a new token
  invalidates all previously active ones for the user.
- Raw tokens are never logged or returned in API responses/errors.
"""

from __future__ import annotations

import hmac
import secrets
import threading
import time
from collections import defaultdict, deque
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from urllib.parse import quote

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.auth.models import EmailVerificationToken
from app.common.config import get_settings
from app.common.errors import AppError, RateLimitError
from app.common.logging import get_logger
from app.email.resend import EmailSendError, is_configured, send_email
from app.email.templates import verification_email, welcome_email
from app.users.models import User

logger = get_logger(__name__)

INVALID_TOKEN_MESSAGE = "This verification link is invalid or has expired."

_lock = threading.Lock()
_sends: dict[str, deque[float]] = defaultdict(deque)


class EmailNotConfiguredError(AppError):
    def __init__(self) -> None:
        super().__init__(
            "Email sending is not configured.",
            status_code=503,
            code="email_not_configured",
        )


def is_email_configured() -> bool:
    """True when RESEND_API_KEY and EMAIL_FROM are present."""
    return is_configured()


def reset_rate_limit() -> None:
    """Test helper."""
    with _lock:
        _sends.clear()


def _check_rate_limit(user_id: str) -> None:
    settings = get_settings()
    limit = settings.email_verification_max_per_hour
    if limit <= 0:
        return
    now = time.monotonic()
    window = 3600.0
    with _lock:
        bucket = _sends[user_id]
        while bucket and now - bucket[0] > window:
            bucket.popleft()
        if len(bucket) >= limit:
            raise RateLimitError("Too many verification emails requested. Try again later.")
        bucket.append(now)


def _hash_token(raw: str) -> str:
    secret = get_settings().jwt_secret.encode("utf-8")
    return hmac.new(secret, raw.encode("utf-8"), sha256).hexdigest()


def generate_raw_token() -> str:
    return f"ia_evt_{secrets.token_urlsafe(32)}"


def frontend_base_url() -> str:
    settings = get_settings()
    if settings.frontend_base_url.strip():
        return settings.frontend_base_url.strip().rstrip("/")
    if settings.is_production:
        return "https://anvilprep.dev"
    return "http://localhost:3000"


def verification_link(raw_token: str) -> str:
    return f"{frontend_base_url()}/verify-email?token={quote(raw_token)}"


def invalidate_active_tokens(db: Session, user_id) -> None:
    rows = db.scalars(
        select(EmailVerificationToken).where(
            EmailVerificationToken.user_id == user_id,
            EmailVerificationToken.used_at.is_(None),
            EmailVerificationToken.expires_at > datetime.now(UTC),
        )
    ).all()
    now = datetime.now(UTC)
    for row in rows:
        row.used_at = now
        db.add(row)


def issue_token(db: Session, user: User) -> str:
    """Invalidate previous active tokens and create a fresh one.

    Commits the new row so the raw token can be emailed safely afterwards;
    a failed delivery still leaves a usable token behind.
    """
    invalidate_active_tokens(db, user.id)
    raw = generate_raw_token()
    settings = get_settings()
    db.add(
        EmailVerificationToken(
            user_id=user.id,
            token_hash=_hash_token(raw),
            expires_at=datetime.now(UTC) + timedelta(hours=settings.email_verification_token_hours),
        )
    )
    db.commit()
    return raw


def send_verification_email(user: User, raw_token: str) -> None:
    """Build the verification email and hand it to the provider."""
    if not is_configured():
        raise EmailNotConfiguredError()
    content = verification_email(verification_link(raw_token), get_settings().email_verification_token_hours)
    try:
        send_email(to=user.email, subject=content.subject, html=content.html, text=content.text)
    except EmailSendError as exc:
        raise AppError(
            "Could not send the verification email. Try again shortly.",
            status_code=503,
            code="verification_email_failed",
        ) from exc


def request_new_verification_email(db: Session, user: User) -> None:
    """Rate-limited resend flow used by the authenticated endpoint."""
    if user.email_verified:
        raise AppError("Your email address is already verified.", status_code=409, code="email_already_verified")
    _check_rate_limit(str(user.id))
    raw = issue_token(db, user)
    send_verification_email(user, raw)
    logger.info("verification_email_resent", user_id=str(user.id))


def verify_token(db: Session, raw_token: str) -> User:
    """Consume a one-time token: validate hash, expiry, unused status."""
    if not raw_token or len(raw_token) > 255:
        raise AppError(INVALID_TOKEN_MESSAGE, status_code=400, code="invalid_verification_token")
    row = db.scalar(
        select(EmailVerificationToken).where(
            EmailVerificationToken.token_hash == _hash_token(raw_token),
            EmailVerificationToken.used_at.is_(None),
            EmailVerificationToken.expires_at > datetime.now(UTC),
        )
    )
    # Invalid, expired, already-used, and unknown tokens all collapse into the
    # same generic error so nothing about token state leaks.
    if row is None:
        raise AppError(INVALID_TOKEN_MESSAGE, status_code=400, code="invalid_verification_token")
    user = db.get(User, row.user_id)
    if user is None:
        raise AppError(INVALID_TOKEN_MESSAGE, status_code=400, code="invalid_verification_token")

    now = datetime.now(UTC)
    row.used_at = now
    user.email_verified = True
    db.add(row)
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("email_verified", user_id=str(user.id))
    # The password sign-up path sends the welcome email only after the address
    # is verified (Google-created accounts are verified at creation and send
    # it from the sign-in flow).
    send_welcome_email_once(db, user)
    return user


def send_welcome_email_once(db: Session, user: User) -> None:
    """Send the one-time welcome email; safe to call repeatedly.

    A durable ``welcome_email_sent_at`` claim is committed *before* the
    provider call, so repeated verifications, logins, retries, or concurrent
    flows can never send it twice. Delivery is best-effort: failures are
    logged without sensitive data and never propagated.
    """
    claimed = db.execute(
        update(User)
        .where(User.id == user.id, User.welcome_email_sent_at.is_(None))
        .values(welcome_email_sent_at=datetime.now(UTC))
    )
    db.commit()
    if claimed.rowcount != 1:
        return  # already sent by this or a competing flow
    if not is_configured():
        # Keep the claim: later logins must not resend the welcome email.
        logger.info("welcome_email_skipped_unconfigured", user_id=str(user.id))
        return
    try:
        content = welcome_email(frontend_base_url())
        send_email(to=user.email, subject=content.subject, html=content.html, text=content.text)
        logger.info("welcome_email_sent", user_id=str(user.id))
    except Exception as exc:  # noqa: BLE001 — best-effort delivery
        logger.warning("welcome_email_send_failed", user_id=str(user.id), error=type(exc).__name__)
