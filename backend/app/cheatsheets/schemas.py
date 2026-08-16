from uuid import UUID

from pydantic import BaseModel


class CheatSheetCard(BaseModel):
    id: UUID
    slug: str
    title: str
    description: str
    section_count: int
    estimated_minutes: int
    href: str


class CheatSheetBlock(BaseModel):
    kind: str
    title: str
    body: str
    items: dict | list | None = None


class CheatSheetSectionOut(BaseModel):
    slug: str
    title: str
    blocks: list[CheatSheetBlock]


class CheatSheetDetail(BaseModel):
    id: UUID
    slug: str
    title: str
    description: str
    estimated_minutes: int
    section_count: int
    sections: list[CheatSheetSectionOut]
