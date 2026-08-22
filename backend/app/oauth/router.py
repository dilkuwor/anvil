from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.common.database import get_db
from app.common.deps import get_current_user
from app.oauth import service
from app.oauth.schemas import (
    ConsentPreviewOut,
    ConsentRedirectOut,
    ConsentRequest,
    OAuthClientCreate,
    OAuthClientOut,
    OAuthEndpointsOut,
)
from app.users.models import User

router = APIRouter(prefix="/api/v1/oauth", tags=["oauth"])


@router.get("/endpoints", response_model=OAuthEndpointsOut)
def oauth_endpoints(request: Request) -> OAuthEndpointsOut:
    return service.endpoints(request)


@router.get("/clients", response_model=list[OAuthClientOut])
def list_oauth_clients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[OAuthClientOut]:
    return service.list_clients(db, current_user.id)


@router.post("/clients", response_model=OAuthClientOut, status_code=201)
def create_oauth_client(
    payload: OAuthClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OAuthClientOut:
    return service.create_client(db, current_user.id, payload)


@router.delete("/clients/{client_id}", status_code=204)
def delete_oauth_client(
    client_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    service.revoke_client(db, current_user.id, client_id)
    return Response(status_code=204)


@router.get("/consent", response_model=ConsentPreviewOut)
def preview_consent(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConsentPreviewOut:
    params = dict(request.query_params)
    return service.preview_consent(db, current_user, params)


@router.post("/consent", response_model=ConsentRedirectOut)
def decide_consent(
    payload: ConsentRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConsentRedirectOut:
    return ConsentRedirectOut(redirect_to=service.decide_consent(db, current_user, payload, request))
