from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.common.enums import NoteKind, NoteSourceType


class NoteCreate(BaseModel):
    source_type: NoteSourceType
    source_id: str = Field(min_length=1, max_length=200)
    kind: NoteKind = NoteKind.MANUAL
    title: str = Field(default="", max_length=200)
    body: str = Field(min_length=1, max_length=20000)


class NoteUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    body: str | None = Field(default=None, min_length=1, max_length=20000)


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    source_type: str
    source_id: str
    source_title: str
    source_href: str
    kind: str
    title: str
    body: str
    created_at: datetime
    updated_at: datetime
