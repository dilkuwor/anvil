import pytest

from app.common import secrets
from app.common.config import get_settings


def test_key_saved_on_one_machine_reads_on_another(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "jwt_secret", "machine-a-jwt")
    token = secrets.encrypt_secret("sk-or-abc")
    monkeypatch.setattr(settings, "jwt_secret", "machine-b-jwt")
    assert secrets.decrypt_secret(token) == "sk-or-abc"


def test_different_database_password_is_unreadable(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "database_url", "postgresql+psycopg://u:one@db/x")
    token = secrets.encrypt_secret("sk-x")
    monkeypatch.setattr(settings, "database_url", "postgresql+psycopg://u:two@db/x")
    assert secrets.can_decrypt(token) is False
    with pytest.raises(secrets.SecretDecryptError):
        secrets.decrypt_secret(token)
