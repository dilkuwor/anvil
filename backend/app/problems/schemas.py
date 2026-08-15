from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str


class ExampleOut(BaseModel):
    input: str
    output: str
    explanation: str = ""


class VisibleTestCaseOut(BaseModel):
    id: UUID
    input: str
    expected_output: str
    execution_order: int


class ProblemListItem(BaseModel):
    id: UUID
    title: str
    slug: str
    difficulty: str
    tags: list[TagOut]
    status: str
    acceptance_hint: str | None = None


class ProblemListResponse(BaseModel):
    items: list[ProblemListItem]
    total: int
    page: int
    page_size: int


class ProblemDetail(BaseModel):
    id: UUID
    title: str
    slug: str
    description: str
    difficulty: str
    constraints: str
    input_format: str
    output_format: str
    explanation: str
    hints: list[str]
    examples: list[ExampleOut]
    time_complexity: str
    space_complexity: str
    starter_code: str
    function_signature: dict
    time_limit_ms: int
    memory_limit_kb: int
    tags: list[TagOut]
    visible_tests: list[VisibleTestCaseOut]
    status: str
    created_at: datetime


class RunRequest(BaseModel):
    source_code: str = Field(min_length=1, max_length=100_000)


class SubmitRequest(BaseModel):
    source_code: str = Field(min_length=1, max_length=100_000)
    language: str = "JAVA"
