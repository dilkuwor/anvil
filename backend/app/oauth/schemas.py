from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class OAuthClientCreate(BaseModel):
    name: str = Field(default="Grok", min_length=1, max_length=80)
    redirect_uris: list[str] = Field(default_factory=list, max_length=20)
    allow_any_https_redirect: bool = True


class OAuthClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    client_id: str
    name: str
    token_endpoint_auth_method: str
    allow_any_https_redirect: bool
    redirect_uris: list[str]
    scopes: str
    created_at: datetime


class OAuthEndpointsOut(BaseModel):
    mcp_url: str
    authorization_endpoint: str
    token_endpoint: str
    registration_endpoint: str
    revocation_endpoint: str
    scopes: str
    token_auth_method: str


class ConsentPreviewOut(BaseModel):
    client_id: str
    client_name: str
    redirect_uri: str
    scope: str
    username: str


class ConsentRequest(BaseModel):
    client_id: str = Field(min_length=1, max_length=80)
    redirect_uri: str = Field(min_length=1, max_length=500)
    state: str = Field(default="", max_length=512)
    scope: str = Field(default="mcp:read", max_length=80)
    code_challenge: str = Field(min_length=43, max_length=128)
    code_challenge_method: str = Field(default="S256", max_length=16)
    response_type: str = Field(default="code", max_length=16)
    allow: bool = True


class ConsentRedirectOut(BaseModel):
    redirect_to: str
