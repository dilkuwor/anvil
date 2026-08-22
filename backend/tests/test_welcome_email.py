import re
from uuid import UUID

import pytest

WELCOME_SUBJECT = "Welcome to AnvilPrep"
VERIFICATION_SUBJECT = "Verify your AnvilPrep email"

TOKEN_RE = re.compile(r"token=([A-Za-z0-9_\-]+)")


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    from app.auth import verification

    verification.reset_rate_limit()
    yield
    verification.reset_rate_limit()


@pytest.fixture
def captured_emails(monkeypatch):
    """Capture outgoing email at the app.email boundary — no real HTTP ever."""
    sent = []

    def fake_send(*, to: str, subject: str, html: str, text: str) -> None:
        sent.append({"to": to, "subject": subject, "html": html, "text": text})

    monkeypatch.setattr("app.auth.verification.send_email", fake_send)
    return sent


def _extract_token(message: dict) -> str:
    match = TOKEN_RE.search(message["html"]) or TOKEN_RE.search(message["text"])
    assert match is not None, "verification link missing from email"
    return match.group(1)


def _register(client, email="sam@example.com", username="sam", password="supersecret"):
    return client.post(
        "/api/v1/auth/register",
        json={"email": email, "username": username, "password": password},
    )


def _welcomes(captured_emails):
    return [message for message in captured_emails if message["subject"] == WELCOME_SUBJECT]


def _user_by_email(db, email):
    from sqlalchemy import func, select

    from app.users.models import User

    return db.scalar(select(User).where(func.lower(User.email) == email.lower()))


# --- Google sign-in ------------------------------------------------------------


@pytest.fixture
def google_enabled(monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com")
    from app.common.config import get_settings

    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _google_claims(sub: str, email: str):
    return {"sub": sub, "email": email, "email_verified": True}


def _google_sign_in(client, monkeypatch, claims):
    monkeypatch.setattr(
        "app.auth.router.verify_google_id_token", lambda credential, client_id: claims
    )
    return client.post("/api/v1/auth/google", json={"credential": "fake-credential-value"})


def test_new_google_signup_sends_welcome_once(
    client, db, monkeypatch, google_enabled, email_enabled, captured_emails
):
    created = _google_sign_in(
        client, monkeypatch, _google_claims("google-sub-welcome", "fresh.google@gmail.com")
    )
    assert created.status_code == 200
    # Google-only flow: exactly one email, and it is the welcome email.
    assert [m["subject"] for m in captured_emails] == [WELCOME_SUBJECT]
    message = captured_emails[0]
    assert message["to"] == "fresh.google@gmail.com"
    # Branded HTML + plain-text fallback, no verification action.
    assert "Start practicing" in message["html"]
    assert "Your account is ready" in message["text"]
    assert "verify-email?token=" not in message["html"]
    assert "verify-email?token=" not in message["text"]

    user = _user_by_email(db, "fresh.google@gmail.com")
    assert user is not None
    assert user.welcome_email_sent_at is not None

    # A later Google login must not resend it.
    client.post("/api/v1/auth/logout")
    again = _google_sign_in(
        client, monkeypatch, _google_claims("google-sub-welcome", "fresh.google@gmail.com")
    )
    assert again.status_code == 200
    assert len(captured_emails) == 1


def test_google_signup_without_resend_config_still_succeeds(
    client, db, monkeypatch, google_enabled, captured_emails
):
    created = _google_sign_in(
        client, monkeypatch, _google_claims("google-sub-noconfig", "noconfig@gmail.com")
    )
    assert created.status_code == 200
    assert captured_emails == []
    # The once-only marker is kept so enabling Resend later cannot duplicate.
    user = _user_by_email(db, "noconfig@gmail.com")
    assert user is not None
    assert user.welcome_email_sent_at is not None


def test_linking_google_to_existing_account_does_not_send_welcome(
    client, db, monkeypatch, google_enabled, email_enabled, captured_emails
):
    registered = _register(client)
    existing_id = UUID(registered.json()["id"])
    client.post("/api/v1/auth/verify-email", json={"token": _extract_token(captured_emails[0])})
    # Verification already delivered the account's single welcome email.
    assert len(_welcomes(captured_emails)) == 1
    client.post("/api/v1/auth/logout")

    linked = _google_sign_in(client, monkeypatch, _google_claims("google-sub-link", "sam@example.com"))
    assert linked.status_code == 200
    assert linked.json()["id"] == str(existing_id)
    assert len(_welcomes(captured_emails)) == 1


# --- Password sign-up / verification ---------------------------------------------


def test_password_signup_does_not_send_welcome_immediately(
    client, db, email_enabled, captured_emails
):
    response = _register(client)
    assert response.status_code == 201
    assert [m["subject"] for m in captured_emails] == [VERIFICATION_SUBJECT]

    user = _user_by_email(db, "sam@example.com")
    assert user is not None
    assert user.welcome_email_sent_at is None


def test_successful_verification_sends_welcome_once(
    client, db, email_enabled, captured_emails
):
    registered = _register(client)
    user_id = UUID(registered.json()["id"])

    verified = client.post(
        "/api/v1/auth/verify-email", json={"token": _extract_token(captured_emails[0])}
    )
    assert verified.status_code == 200
    assert [m["subject"] for m in captured_emails] == [VERIFICATION_SUBJECT, WELCOME_SUBJECT]

    from sqlalchemy import select

    from app.users.models import User

    user = db.scalar(select(User).where(User.id == user_id))
    assert user is not None
    assert user.welcome_email_sent_at is not None


def test_repeated_verification_does_not_resend_welcome(
    client, db, email_enabled, captured_emails
):
    from app.users.models import User

    registered = _register(client)
    user_id = UUID(registered.json()["id"])
    first_raw = _extract_token(captured_emails[0])

    assert client.post("/api/v1/auth/verify-email", json={"token": first_raw}).status_code == 200
    assert len(_welcomes(captured_emails)) == 1

    # Even consuming a second *valid* token afterwards cannot resend it.
    from sqlalchemy import select

    from app.auth import verification

    user = db.scalar(select(User).where(User.id == user_id))
    assert user is not None
    second_raw = verification.issue_token(db, user)
    again = client.post("/api/v1/auth/verify-email", json={"token": second_raw})
    assert again.status_code == 200
    assert len(_welcomes(captured_emails)) == 1

    # Replaying the spent token keeps failing with no side effects.
    replay = client.post("/api/v1/auth/verify-email", json={"token": first_raw})
    assert replay.status_code == 400
    assert len(_welcomes(captured_emails)) == 1


# --- Best-effort delivery ----------------------------------------------------------


class Boom(Exception):
    pass


def _explode(**kwargs):
    raise Boom("provider down")


def test_failed_delivery_does_not_break_google_signup(
    client, db, monkeypatch, google_enabled, email_enabled, captured_emails
):
    monkeypatch.setattr("app.auth.verification.send_email", _explode)
    created = _google_sign_in(
        client, monkeypatch, _google_claims("google-sub-boom", "boom.google@gmail.com")
    )
    assert created.status_code == 200
    assert client.get("/api/v1/auth/me").json()["email_verified"] is True
    # The durable claim was committed before the failed provider call.
    user = _user_by_email(db, "boom.google@gmail.com")
    assert user is not None
    assert user.welcome_email_sent_at is not None


def test_failed_delivery_does_not_break_registration_or_verification(
    client, db, monkeypatch, email_enabled, captured_emails
):
    from sqlalchemy import select

    from app.auth import verification
    from app.users.models import User

    monkeypatch.setattr("app.auth.verification.send_email", _explode)

    registered = _register(client)
    assert registered.status_code == 201
    user_id = UUID(registered.json()["id"])

    # Registration could not deliver its verification email, so mint a fresh
    # token directly and verify while the provider is still failing.
    user = db.scalar(select(User).where(User.id == user_id))
    assert user is not None
    raw_token = verification.issue_token(db, user)
    verified = client.post("/api/v1/auth/verify-email", json={"token": raw_token})
    assert verified.status_code == 200
    assert client.get("/api/v1/auth/me").json()["email_verified"] is True
