from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class McpTokenCreate(BaseModel):
    name: str = Field(default="MCP token", min_length=1, max_length=80)


class McpTokenOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    token_prefix: str
    scopes: str
    last_used_at: datetime | None = None
    created_at: datetime


class McpTokenCreated(McpTokenOut):
    token: str


class McpAccessOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    method: str
    name: str
    status: str
    token_prefix: str | None = None
    created_at: datetime
