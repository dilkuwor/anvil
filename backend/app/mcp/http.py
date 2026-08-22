from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, Request, Response
from fastapi.encoders import jsonable_encoder
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.common.database import get_db
from app.common.errors import UnauthorizedError
from app.common.logging import get_logger
from app.mcp import protocol, rate_limit
from app.mcp.models import McpToken
from app.mcp.protocol import SERVER_NAME, SERVER_VERSION
from app.mcp.tokens import resolve_token
from app.oauth.service import decode_mcp_access_token, www_authenticate
from app.users.models import User

logger = get_logger(__name__)
router = APIRouter(tags=["mcp"])


def _bearer(request: Request) -> str | None:
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        token = header.removeprefix("Bearer ").strip()
        return token or None
    return None


def _mcp_unauthorized(request: Request, message: str) -> UnauthorizedError:
    return UnauthorizedError(message, headers={"WWW-Authenticate": www_authenticate(request)})


def get_mcp_principal(request: Request, db: Session = Depends(get_db)) -> tuple[User, McpToken | None]:
    raw = _bearer(request)
    if not raw:
        raise _mcp_unauthorized(request, "MCP authentication required.")
    token = resolve_token(db, raw)
    if token is not None:
        user = db.get(User, token.user_id)
        if user is None or not user.is_active:
            raise _mcp_unauthorized(request, "Invalid or revoked MCP token.")
        rate_limit.check(token.id)
        return user, token
    user_id = decode_mcp_access_token(raw)
    if user_id is None:
        raise _mcp_unauthorized(request, "Invalid or expired MCP credentials.")
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise _mcp_unauthorized(request, "Invalid or expired MCP credentials.")
    rate_limit.check(user.id)
    return user, None


@router.get("/mcp")
@router.get("/mcp/")
def mcp_probe() -> dict:
    return {
        "ok": True,
        "name": SERVER_NAME,
        "version": SERVER_VERSION,
        "transport": "streamable-http",
        "auth": "bearer",
    }


@router.post("/mcp")
@router.post("/mcp/")
async def mcp_post(
    request: Request,
    db: Session = Depends(get_db),
    principal: tuple[User, McpToken | None] = Depends(get_mcp_principal),
) -> Response:
    user, token = principal
    try:
        payload = await request.json()
    except json.JSONDecodeError:
        return _respond(request, {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Parse error"}})

    if isinstance(payload, list):
        replies = []
        for item in payload:
            if not isinstance(item, dict):
                replies.append({"jsonrpc": "2.0", "id": None, "error": {"code": -32600, "message": "Invalid Request"}})
                continue
            reply = _safe_dispatch(db, user, token, item)
            if reply is not None:
                replies.append(reply)
        db.commit()
        if not replies:
            return Response(status_code=202)
        return _respond(request, replies)

    if not isinstance(payload, dict):
        return _respond(
            request,
            {"jsonrpc": "2.0", "id": None, "error": {"code": -32600, "message": "Invalid Request"}},
        )

    reply = _safe_dispatch(db, user, token, payload)
    db.commit()
    if reply is None:
        return Response(status_code=202)
    return _respond(request, reply)


def _safe_dispatch(db: Session, user: User, token: McpToken | None, message: dict) -> dict | None:
    try:
        return protocol.dispatch(db, user, token, message)
    except Exception:
        logger.exception("mcp_dispatch_failed")
        rpc_id = message.get("id") if isinstance(message, dict) else None
        return {"jsonrpc": "2.0", "id": rpc_id, "error": {"code": -32603, "message": "Internal error"}}


def _respond(request: Request, payload: Any) -> Response:
    accept = (request.headers.get("accept") or "").lower()
    data = json.dumps(jsonable_encoder(payload), ensure_ascii=False)
    if "text/event-stream" in accept and "application/json" not in accept:
        return PlainTextResponse(
            content=f"event: message\ndata: {data}\n\n",
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
    return Response(content=data, media_type="application/json")
