import re
from datetime import UTC, datetime, timedelta
from uuid import UUID

import pytest

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


# --- Registration -------------------------------------------------------------


def test_registration_creates_unverified_account(client, db):
    response = _register(client)
    assert response.status_code == 201
    body = response.json()
    assert body["email_verified"] is False

    from sqlalchemy import select

    from app.users.models import User

    user = db.scalar(select(User).where(User.id == UUID(body["id"])))
    assert user is not None
    assert user.email_verified is False
    assert user.password_hash is not None


def test_registration_sends_verification_email(client, db, email_enabled, captured_emails):
    response = _register(client)
    assert response.status_code == 201

    # Sending was invoked locally; no external Resend HTTP call happened.
    assert len(captured_emails) == 1
    message = captured_emails[0]
    assert message["to"] == "sam@example.com"
    assert message["subject"] == "Verify your AnvilPrep email"
    assert "Verify my email" in message["html"]
    assert "Welcome to AnvilPrep" in message["text"]
    # Link points at the AnvilPrep frontend.
    assert "http://localhost:3000/verify-email?token=" in message["text"]

    raw_token = _extract_token(message)

    from sqlalchemy import select

    from app.auth.models import EmailVerificationToken

    row = db.scalar(select(EmailVerificationToken))
    assert row is not None
    assert row.used_at is None
    # SQLite returns naive datetimes; normalize before comparing.
    expires_at = row.expires_at if row.expires_at.tzinfo else row.expires_at.replace(tzinfo=UTC)
    assert expires_at > datetime.now(UTC)
    # Only a hash is stored, never the raw token.
    assert row.token_hash != raw_token
    assert raw_token not in row.token_hash
    # Raw token must not appear anywhere in the API response.
    assert raw_token not in response.text


def test_registration_without_resend_config_still_succeeds(client, db, captured_emails):
    response = _register(client)
    assert response.status_code == 201
    assert captured_emails == []
    assert client.get("/api/v1/auth/me").json()["username"] == "sam"

    from sqlalchemy import func, select

    from app.auth.models import EmailVerificationToken

    assert (db.scalar(select(func.count()).select_from(EmailVerificationToken)) or 0) == 0


def test_failed_delivery_does_not_break_registration(client, monkeypatch, email_enabled):
    class Boom(Exception):
        pass

    def explode(**kwargs):
        raise Boom("provider down")

    monkeypatch.setattr("app.auth.verification.send_email", explode)
    response = _register(client)
    assert response.status_code == 201
    assert client.get("/api/v1/auth/me").json()["username"] == "sam"


# --- Verification endpoint ----------------------------------------------------


def test_valid_token_verifies_email(client, email_enabled, captured_emails):
    _register(client)
    raw_token = _extract_token(captured_emails[0])

    response = client.post("/api/v1/auth/verify-email", json={"token": raw_token})
    assert response.status_code == 200
    assert raw_token not in response.text
    assert client.get("/api/v1/auth/me").json()["email_verified"] is True


def test_invalid_token_fails(client):
    response = client.post("/api/v1/auth/verify-email", json={"token": "ia_evt_totally-made-up"})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_verification_token"


def test_expired_token_fails(client, db, email_enabled, captured_emails):
    _register(client)

    from sqlalchemy import select

    from app.auth.models import EmailVerificationToken

    row = db.scalar(select(EmailVerificationToken))
    assert row is not None
    row.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    db.add(row)
    db.commit()

    raw_token = _extract_token(captured_emails[0])
    response = client.post("/api/v1/auth/verify-email", json={"token": raw_token})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_verification_token"


def test_reused_token_fails(client, db, email_enabled, captured_emails):
    from sqlalchemy import func, select

    from app.auth.models import EmailVerificationToken
    from app.users.models import User

    _register(client)
    raw_token = _extract_token(captured_emails[0])
    first = client.post("/api/v1/auth/verify-email", json={"token": raw_token})
    assert first.status_code == 200

    row = db.scalar(select(EmailVerificationToken))
    assert row is not None
    assert row.used_at is not None

    second = client.post("/api/v1/auth/verify-email", json={"token": raw_token})
    assert second.status_code == 400

    user = db.scalar(select(User).where(func.lower(User.email) == "sam@example.com"))
    assert user is not None
    assert user.email_verified is True


def test_verify_email_rejects_empty_token(client):
    response = client.post("/api/v1/auth/verify-email", json={"token": "x"})
    assert response.status_code == 400


# --- Resend endpoint ------------------------------------------------------------


def test_resend_requires_authentication(client):
    assert client.post("/api/v1/auth/resend-verification").status_code == 401


def test_resend_invalidates_previous_token(client, email_enabled, captured_emails):
    _register(client)
    first_token = _extract_token(captured_emails[0])

    client.post("/api/v1/auth/logout")
    login = client.post(
        "/api/v1/auth/login",
        json={"username": "sam", "password": "supersecret"},
    )
    assert login.status_code == 200

    resend = client.post("/api/v1/auth/resend-verification")
    assert resend.status_code == 200
    assert len(captured_emails) == 2
    second_token = _extract_token(captured_emails[1])
    assert second_token != first_token

    # Old token invalidated by the new issuance.
    stale = client.post("/api/v1/auth/verify-email", json={"token": first_token})
    assert stale.status_code == 400
    fresh = client.post("/api/v1/auth/verify-email", json={"token": second_token})
    assert fresh.status_code == 200
    assert client.get("/api/v1/auth/me").json()["email_verified"] is True


def test_resend_rejected_when_already_verified(client, email_enabled, captured_emails):
    _register(client)
    client.post("/api/v1/auth/verify-email", json={"token": _extract_token(captured_emails[0])})

    again = client.post("/api/v1/auth/resend-verification")
    assert again.status_code == 409
    assert again.json()["error"]["code"] == "email_already_verified"
    # Registration verification + the one-time welcome; nothing further.
    subjects = [message["subject"] for message in captured_emails]
    assert subjects == ["Verify your AnvilPrep email", "Welcome to AnvilPrep"]


def test_resend_is_rate_limited(client, email_enabled, captured_emails):
    _register(client)
    client.post("/api/v1/auth/logout")
    client.post(
        "/api/v1/auth/login",
        json={"username": "sam", "password": "supersecret"},
    )

    statuses = [client.post("/api/v1/auth/resend-verification").status_code for _ in range(6)]
    assert statuses[:5] == [200] * 5
    assert statuses[5] == 429
    # 1 registration email + 5 successful resends; the 6th resend was blocked.
    assert len(captured_emails) == 6


# --- Google sign-in integration ---------------------------------------------------


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


def test_google_login_links_verified_password_account(
    client, db, monkeypatch, google_enabled, email_enabled, captured_emails
):
    registered = _register(client)
    existing_id = UUID(registered.json()["id"])
    client.post("/api/v1/auth/verify-email", json={"token": _extract_token(captured_emails[0])})
    client.post("/api/v1/auth/logout")

    linked = _google_sign_in(client, monkeypatch, _google_claims("google-sub-link", "Sam@Example.com"))
    assert linked.status_code == 200
    assert linked.json()["id"] == str(existing_id)
    assert linked.json()["username"] == "sam"

    from sqlalchemy import select

    from app.users.models import User

    user = db.scalar(select(User).where(User.id == existing_id))
    assert user is not None
    assert user.oauth_provider == "google"
    assert user.oauth_subject == "google-sub-link"
    assert user.password_hash is not None
    assert user.email_verified is True

    # Both sign-in methods keep working on the linked account.
    client.post("/api/v1/auth/logout")
    password_login = client.post(
        "/api/v1/auth/login",
        json={"username": "sam", "password": "supersecret"},
    )
    assert password_login.status_code == 200


def test_google_login_does_not_link_unverified_password_account(
    client, db, monkeypatch, google_enabled
):
    registered = _register(client)
    existing_id = UUID(registered.json()["id"])
    client.post("/api/v1/auth/logout")

    response = _google_sign_in(client, monkeypatch, _google_claims("google-sub-x", "sam@example.com"))
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "email_not_verified"

    # Not silently logged into the account, nothing linked.
    assert client.get("/api/v1/auth/me").json() is None

    from sqlalchemy import select

    from app.users.models import User

    user = db.scalar(select(User).where(User.id == existing_id))
    assert user is not None
    assert user.oauth_provider is None
    assert user.oauth_subject is None
    assert user.password_hash is not None


def test_google_rebinding_protection_remains_intact(
    client, db, monkeypatch, google_enabled, email_enabled, captured_emails
):
    registered = _register(client)
    existing_id = UUID(registered.json()["id"])
    client.post("/api/v1/auth/verify-email", json={"token": _extract_token(captured_emails[0])})

    original = _google_sign_in(client, monkeypatch, _google_claims("google-sub-original", "sam@example.com"))
    assert original.status_code == 200
    client.post("/api/v1/auth/logout")

    attacker = _google_sign_in(client, monkeypatch, _google_claims("google-sub-attacker", "sam@example.com"))
    assert attacker.status_code == 409
    assert client.get("/api/v1/auth/me").json() is None

    from sqlalchemy import select

    from app.users.models import User

    user = db.scalar(select(User).where(User.id == existing_id))
    assert user is not None
    assert user.oauth_provider == "google"
    assert user.oauth_subject == "google-sub-original"


def test_existing_google_account_can_log_in_normally(client, db, monkeypatch, google_enabled):
    created = _google_sign_in(client, monkeypatch, _google_claims("google-sub-only", "only.google@gmail.com"))
    assert created.status_code == 200

    client.post("/api/v1/auth/logout")
    again = _google_sign_in(client, monkeypatch, _google_claims("google-sub-only", "only.google@gmail.com"))
    assert again.status_code == 200
    assert again.json()["id"] == created.json()["id"]
    me = client.get("/api/v1/auth/me")
    assert me.json() is not None
    assert me.json()["email_verified"] is True


# --- Password authentication remains unchanged --------------------------------------


def test_username_password_login_unchanged_while_unverified(client):
    _register(client)
    client.post("/api/v1/auth/logout")

    login = client.post(
        "/api/v1/auth/login",
        json={"username": "sam", "password": "supersecret"},
    )
    assert login.status_code == 200
    body = login.json()
    assert body["username"] == "sam"
    assert body["email_verified"] is False

    bad = client.post(
        "/api/v1/auth/login",
        json={"username": "sam", "password": "wrong-password"},
    )
    assert bad.status_code == 401


def test_duplicate_email_error_unchanged(client):
    payload = {"email": "sam@example.com", "username": "sam", "password": "supersecret"}
    assert client.post("/api/v1/auth/register", json=payload).status_code == 201
    client.post("/api/v1/auth/logout")
    payload["username"] = "other"
    conflict = client.post("/api/v1/auth/register", json=payload)
    assert conflict.status_code == 409
