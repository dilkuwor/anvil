from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.common.database import get_db
from app.oauth import service
from app.oauth.service import OAuthError

router = APIRouter(tags=["oauth"])


@router.get("/.well-known/oauth-authorization-server")
@router.get("/.well-known/oauth-authorization-server/mcp")
def oauth_as_metadata(request: Request) -> dict:
    return service.authorization_server_metadata(request)


@router.get("/.well-known/oauth-protected-resource")
@router.get("/.well-known/oauth-protected-resource/mcp")
def oauth_resource_metadata(request: Request) -> dict:
    return service.protected_resource_metadata(request)


@router.post("/oauth/register")
def oauth_register(body: dict, db: Session = Depends(get_db)) -> JSONResponse:
    try:
        created = service.register_dynamic_client(db, body)
    except OAuthError as exc:
        return _oauth_error(exc)
    except Exception as exc:
        return _oauth_error(OAuthError("invalid_client_metadata", str(exc)))
    return JSONResponse(created, status_code=201)


@router.post("/oauth/token")
async def oauth_token(request: Request, db: Session = Depends(get_db)) -> JSONResponse:
    form = await _form_or_json(request)
    try:
        payload = service.issue_token(db, request, form)
    except OAuthError as exc:
        return _oauth_error(exc)
    return JSONResponse(payload)


@router.post("/oauth/revoke")
async def oauth_revoke(request: Request, db: Session = Depends(get_db)) -> JSONResponse:
    form = await _form_or_json(request)
    service.revoke_token(db, form)
    return JSONResponse({"revoked": True})


async def _form_or_json(request: Request) -> dict:
    content_type = (request.headers.get("content-type") or "").lower()
    if "application/json" in content_type:
        data = await request.json()
        return data if isinstance(data, dict) else {}
    form = await request.form()
    return {str(key): str(value) for key, value in form.items()}


def _oauth_error(exc: OAuthError) -> JSONResponse:
    headers = {}
    if exc.error == "invalid_client":
        headers["WWW-Authenticate"] = "Bearer"
    return JSONResponse(
        {"error": exc.error, "error_description": exc.description},
        status_code=exc.status_code,
        headers=headers or None,
    )
