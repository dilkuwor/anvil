def test_register_login_me_logout(client):
    register = client.post(
        "/api/v1/auth/register",
        json={"email": "sam@example.com", "username": "sam", "password": "supersecret"},
    )
    assert register.status_code == 201
    body = register.json()
    assert body["email"] == "sam@example.com"
    assert body["username"] == "sam"
    assert "password" not in body
    assert "password_hash" not in body

    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["username"] == "sam"

    client.post("/api/v1/auth/logout")
    logged_out = client.get("/api/v1/auth/me")
    assert logged_out.status_code == 200
    assert logged_out.json() is None

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "sam@example.com", "password": "supersecret"},
    )
    assert login.status_code == 200
    assert client.get("/api/v1/auth/me").json()["email"] == "sam@example.com"


def test_login_rejects_bad_password(client):
    client.post(
        "/api/v1/auth/register",
        json={"email": "sam@example.com", "username": "sam", "password": "supersecret"},
    )
    client.post("/api/v1/auth/logout")
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "sam@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401
    assert "password" not in response.text.lower() or "Invalid" in response.json()["error"]["message"]


def test_duplicate_email(client):
    payload = {"email": "sam@example.com", "username": "sam", "password": "supersecret"}
    assert client.post("/api/v1/auth/register", json=payload).status_code == 201
    client.post("/api/v1/auth/logout")
    payload["username"] = "other"
    assert client.post("/api/v1/auth/register", json=payload).status_code == 409


def test_protected_route_requires_auth(client):
    response = client.get("/api/v1/progress")
    assert response.status_code == 401


def test_update_profile(auth_client):
    updated = auth_client.patch(
        "/api/v1/auth/me",
        json={
            "username": "forger2",
            "display_name": "Forger Two",
            "linkedin_url": "https://www.linkedin.com/in/forger",
            "github_url": "https://github.com/forger",
            "website_url": "https://forger.dev",
            "country": "Portugal",
        },
    )
    assert updated.status_code == 200
    body = updated.json()
    assert body["username"] == "forger2"
    assert body["display_name"] == "Forger Two"
    assert body["has_avatar"] is False
    assert body["linkedin_url"] == "https://www.linkedin.com/in/forger"
    assert body["country"] == "Portugal"
    assert auth_client.get("/api/v1/auth/me").json()["github_url"] == "https://github.com/forger"

    invalid = auth_client.patch(
        "/api/v1/auth/me",
        json={"username": "forger2", "linkedin_url": "linkedin.com/in/forger"},
    )
    assert invalid.status_code == 422


def test_upload_and_delete_avatar(auth_client):
    png = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc``\x00\x00\x00\x04\x00\x01"
        b"\xf6\x178U\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    uploaded = auth_client.put(
        "/api/v1/auth/me/avatar",
        files={"file": ("avatar.png", png, "image/png")},
    )
    assert uploaded.status_code == 200
    assert uploaded.json()["has_avatar"] is True
    assert "avatar_bytes" not in uploaded.json()

    image = auth_client.get("/api/v1/auth/me/avatar")
    assert image.status_code == 200
    assert image.headers["content-type"] == "image/png"
    assert image.content == png

    rejected = auth_client.put(
        "/api/v1/auth/me/avatar",
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )
    assert rejected.status_code == 422

    removed = auth_client.delete("/api/v1/auth/me/avatar")
    assert removed.status_code == 200
    assert removed.json()["has_avatar"] is False
    assert auth_client.get("/api/v1/auth/me/avatar").status_code == 404
