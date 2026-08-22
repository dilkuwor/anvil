import base64
import hashlib
import secrets
from urllib.parse import parse_qs, urlparse

from app.oauth.service import SCOPE


def _pkce() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(48)
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
    return verifier, challenge


def test_oauth_metadata_is_public(client):
    as_meta = client.get("/.well-known/oauth-authorization-server")
    assert as_meta.status_code == 200
    body = as_meta.json()
    assert body["authorization_endpoint"].endswith("/oauth/authorize")
    assert body["token_endpoint"].endswith("/oauth/token")
    assert "S256" in body["code_challenge_methods_supported"]
    assert "none" in body["token_endpoint_auth_methods_supported"]

    resource = client.get("/.well-known/oauth-protected-resource")
    assert resource.status_code == 200
    assert resource.json()["resource"].endswith("/mcp")


def test_mcp_401_advertises_oauth_metadata(client):
    response = client.post("/mcp", json={"jsonrpc": "2.0", "id": 1, "method": "initialize"})
    assert response.status_code == 401
    header = response.headers.get("www-authenticate") or ""
    assert "resource_metadata=" in header
    assert "oauth-protected-resource" in header


def test_oauth_pkce_code_flow_then_mcp(auth_client):
    created = auth_client.post("/api/v1/oauth/clients", json={"name": "Grok", "allow_any_https_redirect": True})
    assert created.status_code == 201
    client_id = created.json()["client_id"]
    assert client_id.startswith("apc_")

    verifier, challenge = _pkce()
    redirect_uri = "https://grok.com/connectors/oauth/callback"
    preview = auth_client.get(
        "/api/v1/oauth/consent",
        params={
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "state": "xyz",
            "scope": SCOPE,
        },
    )
    assert preview.status_code == 200
    assert preview.json()["client_name"] == "Grok"

    allowed = auth_client.post(
        "/api/v1/oauth/consent",
        json={
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "state": "xyz",
            "allow": True,
        },
    )
    assert allowed.status_code == 200
    redirect_to = allowed.json()["redirect_to"]
    parsed = urlparse(redirect_to)
    query = parse_qs(parsed.query)
    assert query["state"] == ["xyz"]
    code = query["code"][0]
    assert code.startswith("ia_ac_")

    token = auth_client.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "client_id": client_id,
            "code": code,
            "redirect_uri": redirect_uri,
            "code_verifier": verifier,
        },
    )
    assert token.status_code == 200, token.text
    access = token.json()["access_token"]
    assert token.json()["token_type"] == "Bearer"
    assert token.json()["scope"] == SCOPE
    assert token.json()["refresh_token"].startswith("ia_rt_")

    init = auth_client.post(
        "/mcp",
        headers={"Authorization": f"Bearer {access}", "Accept": "application/json"},
        json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {"protocolVersion": "2025-03-26", "capabilities": {}, "clientInfo": {"name": "grok", "version": "1"}},
        },
    )
    assert init.status_code == 200
    assert init.json()["result"]["serverInfo"]["name"] == "AnvilPrep"

    reused = auth_client.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "client_id": client_id,
            "code": code,
            "redirect_uri": redirect_uri,
            "code_verifier": verifier,
        },
    )
    assert reused.status_code == 400
    assert reused.json()["error"] == "invalid_grant"


def test_oauth_rejects_bad_pkce_and_session_jwt(auth_client):
    created = auth_client.post("/api/v1/oauth/clients", json={"name": "Grok"})
    client_id = created.json()["client_id"]
    verifier, challenge = _pkce()
    redirect_uri = "http://localhost:9999/callback"
    allowed = auth_client.post(
        "/api/v1/oauth/consent",
        json={
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "allow": True,
        },
    )
    code = parse_qs(urlparse(allowed.json()["redirect_to"]).query)["code"][0]
    bad = auth_client.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "client_id": client_id,
            "code": code,
            "redirect_uri": redirect_uri,
            "code_verifier": secrets.token_urlsafe(48),
        },
    )
    assert bad.status_code == 400
    assert bad.json()["error"] == "invalid_grant"

    jwt = auth_client.cookies.get("ia_access_token")
    denied = auth_client.post(
        "/mcp",
        headers={"Authorization": f"Bearer {jwt}"},
        json={"jsonrpc": "2.0", "id": 1, "method": "initialize"},
    )
    assert denied.status_code == 401


def test_dynamic_client_registration_pins_redirect(auth_client, client):
    registered = client.post(
        "/oauth/register",
        json={
            "client_name": "Grok",
            "redirect_uris": ["https://grok.com/oauth/callback"],
            "token_endpoint_auth_method": "none",
        },
    )
    assert registered.status_code == 201
    client_id = registered.json()["client_id"]
    verifier, challenge = _pkce()
    blocked = auth_client.post(
        "/api/v1/oauth/consent",
        json={
            "client_id": client_id,
            "redirect_uri": "https://evil.example/steal",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "allow": True,
        },
    )
    assert blocked.status_code == 400
