from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

ContextKind = Literal["general", "lesson", "problem", "design"]
Mode = Literal["ask", "teach"]


class BuddyContextIn(BaseModel):
    kind: ContextKind = "general"
    id: str = Field(default="", max_length=200)
    title: str = Field(default="", max_length=200)
    # Live extras the page knows but the database does not, such as the editor contents.
    code: str | None = Field(default=None, max_length=20000)


class BuddySendIn(BaseModel):
    thread_id: UUID | None = None
    content: str = Field(min_length=1, max_length=4000)
    mode: Mode = "ask"
    context: BuddyContextIn = Field(default_factory=BuddyContextIn)


class BuddyMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    role: Literal["user", "assistant"]
    content: str
    mode: str
    created_at: datetime


class BuddyThreadOut(BaseModel):
    id: UUID
    context_kind: str
    context_id: str
    context_title: str
    title: str
    preview: str
    message_count: int
    created_at: datetime
    updated_at: datetime


class BuddyThreadDetail(BuddyThreadOut):
    messages: list[BuddyMessageOut]
