from uuid import uuid4

from app.common.security import create_access_token, decode_access_token, hash_password, verify_password
from app.execution.harness import sanitize_source


def test_password_hash_is_not_plaintext():
    hashed = hash_password("anvilpass")
    assert hashed != "anvilpass"
    assert verify_password("anvilpass", hashed)
    assert not verify_password("wrong", hashed)


def test_jwt_roundtrip():
    user_id = uuid4()
    token = create_access_token(user_id)
    assert decode_access_token(token) == user_id


def test_sanitize_strips_package():
    source = "package evil;\nclass Solution {\n}\n"
    cleaned = sanitize_source(source)
    assert "package " not in cleaned
    assert "class Solution" in cleaned
