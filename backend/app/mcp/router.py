from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.common.database import get_db
from app.common.deps import get_current_user
from app.mcp.schemas import McpAccessOut, McpTokenCreate, McpTokenCreated, McpTokenOut
from app.mcp.tokens import create_token, list_access, list_tokens, revoke_token
from app.users.models import User

router = APIRouter(prefix="/api/v1/mcp", tags=["mcp"])


@router.post("/tokens", response_model=McpTokenCreated, status_code=201)
def create_mcp_token(
    payload: McpTokenCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> McpTokenCreated:
    return create_token(db, current_user.id, payload.name)


@router.get("/tokens", response_model=list[McpTokenOut])
def list_mcp_tokens(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[McpTokenOut]:
    return list_tokens(db, current_user.id)


@router.delete("/tokens/{token_id}", status_code=204)
def delete_mcp_token(
    token_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    revoke_token(db, current_user.id, token_id)
    return Response(status_code=204)


@router.get("/access", response_model=list[McpAccessOut])
def list_mcp_access(
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[McpAccessOut]:
    return list_access(db, current_user.id, limit=limit)
