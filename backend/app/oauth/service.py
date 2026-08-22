from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode, urlparse, urlunparse
from uuid import UUID

import jwt
from fastapi import Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.common.config import get_settings
from app.common.errors import AppError, NotFoundError
from app.oauth.models import OAuthAuthorizationCode, OAuthClient, OAuthRefreshToken
from app.oauth.schemas import ConsentPreviewOut, ConsentRequest, OAuthClientCreate, OAuthClientOut, OAuthEndpointsOut
from app.users.models import User

SCOPE = "mcp:read"
CLIENT_PREFIX = "apc_"
CODE_PREFIX = "ia_ac_"
REFRESH_PREFIX = "ia_rt_"
MCP_TOKEN_TYP = "mcp_at"


class OAuthError(Exception):
    def __init__(self, error: str, description: str, status_code: int = 400):
        super().__init__(description)
        self.error = error
        self.description = description
        self.status_code = status_code


def public_base(request: Request | None = None) -> str:
    settings = get_settings()
    if settings.public_base_url.strip():
        return settings.public_base_url.strip().rstrip("/")
    if request is not None:
        proto = (request.headers.get("x-forwarded-proto") or request.url.scheme).split(",")[0].strip()
        host = (request.headers.get("x-forwarded-host") or request.headers.get("host") or "").split(",")[0].strip()
        if host:
            if settings.is_production and proto == "http":
                proto = "https"
            return f"{proto}://{host}".rstrip("/")
    return "https://anvilprep.dev" if settings.is_production else "http://localhost:3000"


def mcp_resource(request: Request | None = None) -> str:
    return f"{public_base(request)}/mcp"


def endpoints(request: Request | None = None) -> OAuthEndpointsOut:
    base = public_base(request)
    return OAuthEndpointsOut(
        mcp_url=f"{base}/mcp",
        authorization_endpoint=f"{base}/oauth/authorize",
        token_endpoint=f"{base}/oauth/token",
        registration_endpoint=f"{base}/oauth/register",
        revocation_endpoint=f"{base}/oauth/revoke",
        scopes=SCOPE,
        token_auth_method="none",
    )


def authorization_server_metadata(request: Request) -> dict:
    urls = endpoints(request)
    return {
        "issuer": public_base(request),
        "authorization_endpoint": urls.authorization_endpoint,
        "token_endpoint": urls.token_endpoint,
        "registration_endpoint": urls.registration_endpoint,
        "revocation_endpoint": urls.revocation_endpoint,
        "scopes_supported": [SCOPE],
        "response_types_supported": ["code"],
        "response_modes_supported": ["query"],
        "grant_types_supported": ["authorization_code", "refresh_token"],
        "code_challenge_methods_supported": ["S256"],
        "token_endpoint_auth_methods_supported": ["none"],
        "authorization_response_iss_parameter_supported": True,
    }


def protected_resource_metadata(request: Request) -> dict:
    resource = mcp_resource(request)
    return {
        "resource": resource,
        "authorization_servers": [public_base(request)],
        "bearer_methods_supported": ["header"],
        "scopes_supported": [SCOPE],
    }


def www_authenticate(request: Request) -> str:
    metadata = f"{public_base(request)}/.well-known/oauth-protected-resource"
    resource = mcp_resource(request)
    return f'Bearer realm="AnvilPrep", resource="{resource}", resource_metadata="{metadata}"'


def hash_secret(raw: str) -> str:
    secret = get_settings().jwt_secret.encode("utf-8")
    return hmac.new(secret, raw.encode("utf-8"), hashlib.sha256).hexdigest()


def list_clients(db: Session, user_id: UUID) -> list[OAuthClientOut]:
    rows = db.scalars(
        select(OAuthClient)
        .where(OAuthClient.user_id == user_id, OAuthClient.revoked_at.is_(None))
        .order_by(OAuthClient.created_at.desc())
    ).all()
    return [OAuthClientOut.model_validate(row) for row in rows]


def create_client(db: Session, user_id: UUID, payload: OAuthClientCreate) -> OAuthClientOut:
    settings = get_settings()
    active = db.scalar(
        select(func.count())
        .select_from(OAuthClient)
        .where(OAuthClient.user_id == user_id, OAuthClient.revoked_at.is_(None))
    ) or 0
    if active >= settings.oauth_max_clients_per_user:
        raise AppError(
            f"You already have {settings.oauth_max_clients_per_user} connector clients. Revoke one first.",
            status_code=422,
            code="oauth_client_limit",
        )
    uris = [_normalize_redirect(item) for item in payload.redirect_uris]
    row = OAuthClient(
        client_id=_new_client_id(),
        user_id=user_id,
        name=payload.name.strip()[:80] or "Grok",
        token_endpoint_auth_method="none",
        allow_any_https_redirect=payload.allow_any_https_redirect,
        redirect_uris=uris,
        scopes=SCOPE,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return OAuthClientOut.model_validate(row)


def revoke_client(db: Session, user_id: UUID, client_row_id: UUID) -> None:
    row = db.scalar(select(OAuthClient).where(OAuthClient.id == client_row_id, OAuthClient.user_id == user_id))
    if row is None or row.revoked_at is not None:
        raise NotFoundError("OAuth client not found.")
    row.revoked_at = datetime.now(UTC)
    db.add(row)
    db.commit()


def register_dynamic_client(db: Session, body: dict) -> dict:
    name = str(body.get("client_name") or "MCP connector").strip()[:80] or "MCP connector"
    raw_uris = body.get("redirect_uris") or []
    if not isinstance(raw_uris, list) or not raw_uris:
        raise OAuthError("invalid_client_metadata", "redirect_uris is required.")
    uris = [_normalize_redirect(str(item)) for item in raw_uris]
    row = OAuthClient(
        client_id=_new_client_id(),
        user_id=None,
        name=name,
        token_endpoint_auth_method="none",
        allow_any_https_redirect=False,
        redirect_uris=uris,
        scopes=SCOPE,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "client_id": row.client_id,
        "client_id_issued_at": int(row.created_at.replace(tzinfo=UTC).timestamp()) if row.created_at.tzinfo else int(row.created_at.timestamp()),
        "client_name": row.name,
        "redirect_uris": row.redirect_uris,
        "grant_types": ["authorization_code", "refresh_token"],
        "response_types": ["code"],
        "token_endpoint_auth_method": "none",
        "scope": SCOPE,
    }


def preview_consent(db: Session, user: User, params: dict) -> ConsentPreviewOut:
    req = _parse_auth_request(params)
    client = _active_client(db, req.client_id)
    _assert_redirect(client, req.redirect_uri)
    return ConsentPreviewOut(
        client_id=client.client_id,
        client_name=client.name,
        redirect_uri=req.redirect_uri,
        scope=SCOPE,
        username=user.username,
    )


def decide_consent(db: Session, user: User, payload: ConsentRequest, request: Request | None = None) -> str:
    client = _active_client(db, payload.client_id)
    redirect = _normalize_redirect(payload.redirect_uri)
    _assert_redirect(client, redirect)
    if payload.response_type != "code":
        raise AppError("response_type must be code.", status_code=400, code="invalid_request")
    if payload.code_challenge_method.upper() != "S256":
        raise AppError("code_challenge_method must be S256.", status_code=400, code="invalid_request")
    issuer = public_base(request)
    if not payload.allow:
        return _redirect(redirect, {"error": "access_denied", "state": payload.state, "iss": issuer})
    settings = get_settings()
    raw = f"{CODE_PREFIX}{secrets.token_urlsafe(32)}"
    row = OAuthAuthorizationCode(
        code_hash=hash_secret(raw),
        client_id=client.client_id,
        user_id=user.id,
        redirect_uri=redirect,
        code_challenge=payload.code_challenge,
        code_challenge_method="S256",
        scope=SCOPE,
        expires_at=datetime.now(UTC) + timedelta(seconds=settings.oauth_code_ttl_seconds),
    )
    db.add(row)
    db.commit()
    return _redirect(redirect, {"code": raw, "state": payload.state, "iss": issuer})


def issue_token(db: Session, request: Request, form: dict) -> dict:
    grant = str(form.get("grant_type") or "")
    if grant == "authorization_code":
        return _token_from_code(db, request, form)
    if grant == "refresh_token":
        return _token_from_refresh(db, request, form)
    raise OAuthError("unsupported_grant_type", "Use authorization_code or refresh_token.")


def revoke_token(db: Session, form: dict) -> None:
    raw = str(form.get("token") or "")
    if not raw:
        return
    now = datetime.now(UTC)
    if raw.startswith(REFRESH_PREFIX):
        row = db.scalar(select(OAuthRefreshToken).where(OAuthRefreshToken.token_hash == hash_secret(raw)))
        if row is not None and row.revoked_at is None:
            row.revoked_at = now
            db.add(row)
            db.commit()


def decode_mcp_access_token(raw: str) -> UUID | None:
    if raw.startswith("ia_mcp_") or raw.startswith(CODE_PREFIX) or raw.startswith(REFRESH_PREFIX):
        return None
    settings = get_settings()
    try:
        payload = jwt.decode(
            raw,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            options={"require": ["sub", "exp", "typ"], "verify_aud": False},
        )
    except Exception:
        return None
    if payload.get("typ") != MCP_TOKEN_TYP:
        return None
    aud = payload.get("aud")
    if isinstance(aud, str) and not aud.endswith("/mcp"):
        return None
    try:
        return UUID(str(payload.get("sub")))
    except (TypeError, ValueError):
        return None


def _token_from_code(db: Session, request: Request, form: dict) -> dict:
    client_id = str(form.get("client_id") or "")
    code = str(form.get("code") or "")
    redirect_uri = str(form.get("redirect_uri") or "")
    verifier = str(form.get("code_verifier") or "")
    if not client_id or not code or not redirect_uri or not verifier:
        raise OAuthError("invalid_request", "client_id, code, redirect_uri, and code_verifier are required.")
    client = _active_client(db, client_id, as_oauth=True)
    row = db.scalar(select(OAuthAuthorizationCode).where(OAuthAuthorizationCode.code_hash == hash_secret(code)))
    now = datetime.now(UTC)
    if row is None or row.consumed_at is not None:
        raise OAuthError("invalid_grant", "Authorization code is invalid or already used.")
    exp = row.expires_at.replace(tzinfo=UTC) if row.expires_at.tzinfo is None else row.expires_at
    if exp < now:
        raise OAuthError("invalid_grant", "Authorization code has expired.")
    if row.client_id != client.client_id:
        raise OAuthError("invalid_grant", "Authorization code was issued to a different client.")
    if row.redirect_uri != _normalize_redirect(redirect_uri):
        raise OAuthError("invalid_grant", "redirect_uri does not match.")
    if not _pkce_ok(verifier, row.code_challenge):
        raise OAuthError("invalid_grant", "PKCE verification failed.")
    row.consumed_at = now
    db.add(row)
    return _mint_tokens(db, request, client, row.user_id, row.scope)


def _token_from_refresh(db: Session, request: Request, form: dict) -> dict:
    client_id = str(form.get("client_id") or "")
    refresh = str(form.get("refresh_token") or "")
    if not client_id or not refresh:
        raise OAuthError("invalid_request", "client_id and refresh_token are required.")
    client = _active_client(db, client_id, as_oauth=True)
    row = db.scalar(select(OAuthRefreshToken).where(OAuthRefreshToken.token_hash == hash_secret(refresh)))
    now = datetime.now(UTC)
    if row is None or row.revoked_at is not None:
        raise OAuthError("invalid_grant", "Refresh token is invalid.")
    exp = row.expires_at.replace(tzinfo=UTC) if row.expires_at.tzinfo is None else row.expires_at
    if exp < now:
        raise OAuthError("invalid_grant", "Refresh token has expired.")
    if row.client_id != client.client_id:
        raise OAuthError("invalid_grant", "Refresh token was issued to a different client.")
    row.revoked_at = now
    db.add(row)
    return _mint_tokens(db, request, client, row.user_id, row.scope)


def _mint_tokens(db: Session, request: Request, client: OAuthClient, user_id: UUID, scope: str) -> dict:
    settings = get_settings()
    now = datetime.now(UTC)
    access_ttl = settings.oauth_access_ttl_seconds
    refresh_raw = f"{REFRESH_PREFIX}{secrets.token_urlsafe(32)}"
    db.add(
        OAuthRefreshToken(
            token_hash=hash_secret(refresh_raw),
            client_id=client.client_id,
            user_id=user_id,
            scope=scope,
            expires_at=now + timedelta(seconds=settings.oauth_refresh_ttl_seconds),
        )
    )
    db.commit()
    access = jwt.encode(
        {
            "sub": str(user_id),
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(seconds=access_ttl)).timestamp()),
            "iss": public_base(request),
            "aud": mcp_resource(request),
            "scope": scope,
            "client_id": client.client_id,
            "typ": MCP_TOKEN_TYP,
        },
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    return {
        "access_token": access,
        "token_type": "Bearer",
        "expires_in": access_ttl,
        "refresh_token": refresh_raw,
        "scope": scope,
    }


def _parse_auth_request(params: dict) -> ConsentRequest:
    return ConsentRequest(
        client_id=str(params.get("client_id") or ""),
        redirect_uri=str(params.get("redirect_uri") or ""),
        state=str(params.get("state") or ""),
        scope=str(params.get("scope") or SCOPE),
        code_challenge=str(params.get("code_challenge") or ""),
        code_challenge_method=str(params.get("code_challenge_method") or "S256"),
        response_type=str(params.get("response_type") or "code"),
        allow=True,
    )


def _active_client(db: Session, client_id: str, *, as_oauth: bool = False) -> OAuthClient:
    row = db.scalar(select(OAuthClient).where(OAuthClient.client_id == client_id, OAuthClient.revoked_at.is_(None)))
    if row is None:
        if as_oauth:
            raise OAuthError("invalid_client", "Unknown OAuth client.", status_code=401)
        raise AppError("Unknown OAuth client.", status_code=400, code="invalid_client")
    return row


def _assert_redirect(client: OAuthClient, redirect_uri: str) -> None:
    uri = _normalize_redirect(redirect_uri)
    allowed = {_normalize_redirect(item) for item in (client.redirect_uris or [])}
    if uri in allowed:
        return
    if client.allow_any_https_redirect and _is_safe_redirect(uri):
        return
    raise AppError("This redirect_uri is not registered for the client.", status_code=400, code="invalid_redirect")


def _normalize_redirect(value: str) -> str:
    raw = (value or "").strip()
    if not raw:
        raise AppError("redirect_uri is required.", status_code=400, code="invalid_request")
    parsed = urlparse(raw)
    if parsed.scheme not in {"https", "http"} or not parsed.netloc:
        raise AppError("redirect_uri must be an absolute http(s) URL.", status_code=400, code="invalid_request")
    if parsed.scheme == "http" and not _is_local(parsed.hostname or ""):
        raise AppError("http redirect_uri is only allowed on localhost.", status_code=400, code="invalid_request")
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path or "/", parsed.params, parsed.query, ""))


def _is_safe_redirect(uri: str) -> bool:
    parsed = urlparse(uri)
    if parsed.scheme == "https":
        return True
    return parsed.scheme == "http" and _is_local(parsed.hostname or "")


def _is_local(host: str) -> bool:
    return host in {"localhost", "127.0.0.1", "::1"}


def _pkce_ok(verifier: str, challenge: str) -> bool:
    if len(verifier) < 43 or len(verifier) > 128:
        return False
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    computed = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
    return hmac.compare_digest(computed, challenge)


def _redirect(redirect_uri: str, params: dict) -> str:
    parsed = urlparse(redirect_uri)
    query = parsed.query
    extra = urlencode({key: value for key, value in params.items() if value is not None})
    joined = f"{query}&{extra}" if query else extra
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, joined, parsed.fragment))


def _new_client_id() -> str:
    return f"{CLIENT_PREFIX}{secrets.token_urlsafe(18)}"
