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
    assert client.get("/api/v1/auth/me").status_code == 401

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
    response = client.get("/api/v1/problems")
    assert response.status_code == 401
