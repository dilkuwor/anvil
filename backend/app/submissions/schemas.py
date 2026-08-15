from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TestResultOut(BaseModel):
    test_case_id: UUID | str | None = None
    status: str
    hidden: bool = False
    input: str | None = None
    expected_output: str | None = None
    actual_output: str | None = None
    runtime_ms: int | None = None
    error_message: str | None = None


class ExecutionResult(BaseModel):
    submission_id: UUID | None = None
    status: str
    runtime_ms: int | None = None
    memory_kb: int | None = None
    passed: int
    total: int
    compile_output: str | None = None
    test_results: list[TestResultOut] = Field(default_factory=list)


class SubmissionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    problem_id: UUID
    problem_title: str
    problem_slug: str
    language: str
    status: str
    runtime_ms: int | None
    memory_kb: int | None
    passed_count: int
    total_count: int
    created_at: datetime


class SubmissionDetail(SubmissionSummary):
    source_code: str
    compile_output: str | None
    test_results: list[TestResultOut]


class SubmissionListResponse(BaseModel):
    items: list[SubmissionSummary]
    total: int
    page: int
    page_size: int
