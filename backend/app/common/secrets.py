"""Small helpers for encrypting user-owned secrets at rest."""

from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy.engine import make_url

from app.common.config import get_settings


class SecretDecryptError(ValueError):
    """Stored ciphertext was written under a different database password."""


def _fernet() -> Fernet:
    # Keyed by the database password: every server that can reach the shared database
    # already has it, so a key saved on one machine reads on all of them with no extra config.
    passphrase = make_url(get_settings().sqlalchemy_database_url).password or ""
    digest = hashlib.sha256(passphrase.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_secret(value: str) -> str:
    return _fernet().encrypt(value.encode("utf-8")).decode("ascii")


def decrypt_secret(token: str) -> str:
    try:
        return _fernet().decrypt(token.encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        raise SecretDecryptError("Stored secret could not be decrypted.") from exc


def can_decrypt(token: str | None) -> bool:
    try:
        decrypt_secret(token or "")
    except SecretDecryptError:
        return False
    return True


def secret_hint(value: str) -> str:
    cleaned = "".join(char for char in value.strip() if char.isalnum())
    if len(cleaned) < 4:
        return "••••"
    return f"••••{cleaned[-4:]}"
