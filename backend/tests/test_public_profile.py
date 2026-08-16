def test_public_profile_does_not_require_auth(auth_client, client):
    listed = client.get("/api/v1/users/forger")
    assert listed.status_code == 200
    body = listed.json()
    assert body["user"]["username"] == "forger"
    assert "email" not in body["user"]
    assert "role" not in body["user"]
    assert "id" not in body["user"]
    assert "recommendations" not in body["progress"]
    assert "readiness" not in body["progress"]
    assert "recent_events" not in body["progress"]
    assert body["progress"]["total_solved"] == 0


def test_public_profile_is_case_insensitive(client, auth_client):
    response = client.get("/api/v1/users/Forger")
    assert response.status_code == 200
    assert response.json()["user"]["username"] == "forger"


def test_public_profile_missing_user(client):
    assert client.get("/api/v1/users/nobody-here").status_code == 404


def test_public_avatar_missing(client, auth_client):
    assert client.get("/api/v1/users/forger/avatar").status_code == 404
