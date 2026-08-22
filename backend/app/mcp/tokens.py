from __future__ import annotations

import hmac
import secrets
from datetime import UTC, datetime
from hashlib import sha256
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.common.config import get_settings
from app.common.errors import AppError, NotFoundError
from app.mcp.models import McpAccessLog, McpToken
from app.mcp.schemas import McpAccessOut, McpTokenCreated, McpTokenOut

TOKEN_PREFIX = "ia_mcp_"
SCOPE_READ = "mcp:read"


def hash_token(raw: str) -> str:
    secret = get_settings().jwt_secret.encode("utf-8")
    return hmac.new(secret, raw.encode("utf-8"), sha256).hexdigest()


def generate_token() -> str:
    return f"{TOKEN_PREFIX}{secrets.token_urlsafe(32)}"


def display_prefix(raw: str) -> str:
    return raw[:12]


def create_token(db: Session, user_id: UUID, name: str) -> McpTokenCreated:
    settings = get_settings()
    active = db.scalar(
        select(func.count())
        .select_from(McpToken)
        .where(McpToken.user_id == user_id, McpToken.revoked_at.is_(None))
    ) or 0
    if active >= settings.mcp_max_tokens_per_user:
        raise AppError(
            f"You already have {settings.mcp_max_tokens_per_user} MCP tokens. Revoke one first.",
            status_code=422,
            code="mcp_token_limit",
        )
    raw = generate_token()
    row = McpToken(
        user_id=user_id,
        name=name.strip()[:80] or "MCP token",
        token_prefix=display_prefix(raw),
        token_hash=hash_token(raw),
        scopes=SCOPE_READ,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return McpTokenCreated(token=raw, **McpTokenOut.model_validate(row).model_dump())


def list_tokens(db: Session, user_id: UUID) -> list[McpTokenOut]:
    rows = db.scalars(
        select(McpToken)
        .where(McpToken.user_id == user_id, McpToken.revoked_at.is_(None))
        .order_by(McpToken.created_at.desc())
    ).all()
    return [McpTokenOut.model_validate(row) for row in rows]


def revoke_token(db: Session, user_id: UUID, token_id: UUID) -> None:
    row = db.scalar(select(McpToken).where(McpToken.id == token_id, McpToken.user_id == user_id))
    if row is None or row.revoked_at is not None:
        raise NotFoundError("MCP token not found.")
    row.revoked_at = datetime.now(UTC)
    db.add(row)
    db.commit()


def resolve_token(db: Session, raw: str) -> McpToken | None:
    if not raw.startswith(TOKEN_PREFIX):
        return None
    row = db.scalar(select(McpToken).where(McpToken.token_hash == hash_token(raw), McpToken.revoked_at.is_(None)))
    if row is None:
        return None
    row.last_used_at = datetime.now(UTC)
    db.add(row)
    return row


def record_access(
    db: Session,
    user_id: UUID,
    token: McpToken | None,
    method: str,
    name: str,
    status: str,
) -> None:
    db.add(
        McpAccessLog(
            user_id=user_id,
            token_id=token.id if token is not None else None,
            method=method[:80],
            name=name[:200],
            status=status[:40],
        )
    )


def list_access(db: Session, user_id: UUID, limit: int = 50) -> list[McpAccessOut]:
    rows = db.execute(
        select(McpAccessLog, McpToken.token_prefix)
        .outerjoin(McpToken, McpToken.id == McpAccessLog.token_id)
        .where(McpAccessLog.user_id == user_id)
        .order_by(McpAccessLog.created_at.desc())
        .limit(limit)
    ).all()
    return [
        McpAccessOut(
            id=log.id,
            method=log.method,
            name=log.name,
            status=log.status,
            token_prefix=prefix,
            created_at=log.created_at,
        )
        for log, prefix in rows
    ]
