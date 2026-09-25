from __future__ import annotations

from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

Rating = Literal["forgot", "shaky", "good"]
CardKind = Literal["PROBLEM", "LESSON", "DESIGN"]


class StudySettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    timezone: str
    interview_date: date | None
    reminders_enabled: bool
    reminder_time: str
    reminder_days: list[int]
    reminder_email: bool
    email_configured: bool = False


class StudySettingsUpdate(BaseModel):
    timezone: str | None = Field(default=None, max_length=64)
    interview_date: date | None = None
    clear_interview_date: bool = False
    reminders_enabled: bool | None = None
    reminder_time: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    reminder_days: list[int] | None = None
    reminder_email: bool | None = None

    @field_validator("reminder_days")
    @classmethod
    def _days_in_week(cls, value: list[int] | None) -> list[int] | None:
        if value is None:
            return None
        cleaned = sorted({day for day in value if 0 <= day <= 6})
        return cleaned


class ReviewCardOut(BaseModel):
    id: UUID
    kind: CardKind
    ref: str
    box: int
    due_on: date
    title: str
    label: str
    prompt: str
    answer: str
    answer_label: str
    detail: str = ""
    href: str
    note_source_type: str | None = None
    note_source_id: str | None = None
    wants_text: bool = False


class ReviewQueueOut(BaseModel):
    day: date
    cards: list[ReviewCardOut]
    due_total: int
    boxes: dict[int, int]


class RateIn(BaseModel):
    rating: Rating


class RateOut(BaseModel):
    card: ReviewCardOut
    remaining: int
    next_due_on: date
    recall_rate: float | None = None
    recall_reviews: int = 0


class TaskOut(BaseModel):
    id: str
    kind: str
    title: str
    why: str
    minutes: int
    href: str
    action: str
    done: bool
    manual: bool
    optional: bool = False
    ref: str = ""


class TodayOut(BaseModel):
    day: date
    unit_number: int
    unit_title: str
    tasks: list[TaskOut]
    done_count: int
    total: int
    due_reviews: int
    all_done: bool
    finish_line: str
    pacing: str
    readiness: float | None = None
    recall_rate: float | None = None


class ReadinessPoint(BaseModel):
    day: date
    readiness: float
    coverage: float
    retention: float | None


class ReadinessOut(BaseModel):
    readiness: float
    coverage: float
    retention: float | None
    recall_rate: float | None
    recall_reviews: int
    pace: float | None
    cards: int
    coverage_text: str
    retention_text: str
    pace_text: str
    summary: str
    history: list[ReadinessPoint]


class PathProblemOut(BaseModel):
    slug: str
    title: str
    difficulty: str
    solved: bool
    box: int | None = None


class PathLessonOut(BaseModel):
    slug: str
    title: str
    minutes: int
    href: str
    done: bool


class PathDesignOut(BaseModel):
    slug: str
    title: str
    outline_done: bool
    mock_done: bool
    outline_href: str
    mock_href: str


class PathUnitOut(BaseModel):
    number: int
    id: str
    title: str
    why: str = ""
    level: str
    status: Literal["done", "current", "ahead"]
    problems: list[PathProblemOut]
    extra_problems: int
    lessons: list[PathLessonOut]
    design: PathDesignOut
    boss_done: bool
    boss_key: str
    done_items: int
    total_items: int


class PathOut(BaseModel):
    units: list[PathUnitOut]
    current_unit: int
    pacing: str
    interview_date: date | None
    weeks_left: int | None


class ToggleOut(BaseModel):
    item_key: str
    done: bool


class DesignOutlineOut(BaseModel):
    slug: str
    title: str
    prompt: str
    functional_requirements: list[str]
    non_functional_requirements: list[str]
    constraints: list[str]
    outline: str
    done: bool
    note_id: UUID | None = None


class DesignOutlineIn(BaseModel):
    outline: str = Field(max_length=20000)
    done: bool | None = None
