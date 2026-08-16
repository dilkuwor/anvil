from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.problems.schemas import ProblemListItem


class ProblemListCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str = Field(default="", max_length=400)


class ProblemListUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=400)


class ProblemListAddProblems(BaseModel):
    problem_ids: list[UUID] = Field(min_length=1, max_length=100)


class ProblemListCard(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str
    problem_count: int
    solved_count: int
    remaining_count: int
    percent: int
    updated_at: datetime
    problem_ids: list[UUID]


class ProblemListDetail(ProblemListCard):
    items: list[ProblemListItem]
    created_at: datetime
