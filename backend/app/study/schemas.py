from __future__ import annotations

from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

Rating = Literal["forgot", "shaky", "good"]
CardKind = Literal["PROBLEM", "LESSON", "DESIGN", "CHECK", "PATTERN"]
Confidence = Literal["sure", "unsure"]


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
    # Knowledge-check cards: the question's options; the correct one is only returned after answering.
    check_kind: str | None = None
    options: list[str] = []
    section: str | None = None


class ReviewQueueOut(BaseModel):
    day: date
    cards: list[ReviewCardOut]
    due_total: int
    boxes: dict[int, int]
    # A quiz: every question card in a chosen scope, due or not, rather than the day's due cards.
    practice: bool = False
    scope_title: str | None = None


class RateIn(BaseModel):
    rating: Rating


class RateOut(BaseModel):
    card: ReviewCardOut
    remaining: int
    next_due_on: date
    recall_rate: float | None = None
    recall_reviews: int = 0


class AnswerCardIn(BaseModel):
    choice: int = Field(ge=0)
    confidence: Confidence = "unsure"
    time_ms: int | None = Field(default=None, ge=0, le=3_600_000)


class AnswerCardOut(RateOut):
    correct: bool
    correct_index: int
    explanation: str
    learn_state: str
    needs_refresh: bool = False


class DrillItem(BaseModel):
    problem_id: UUID
    slug: str
    difficulty: str
    statement: str
    example_input: str = ""
    example_output: str = ""
    options: list[str]
    due: bool = False


class DrillOut(BaseModel):
    items: list[DrillItem]
    drilled_today: int
    families: list[str]


class DrillAnswerIn(BaseModel):
    choice: int = Field(ge=0)
    confidence: Confidence = "unsure"
    time_ms: int | None = Field(default=None, ge=0, le=3_600_000)


class DrillAnswerOut(BaseModel):
    correct: bool
    correct_index: int
    family: str
    family_hint: str
    pattern: str
    trigger: str
    summary: str
    title: str
    href: str
    next_due_on: date
    box: int


class MemoryDay(BaseModel):
    day: date
    due: int


class MemoryLesson(BaseModel):
    slug: str
    title: str
    category: str
    href: str
    learn_state: str
    needs_refresh: bool
    cards: int
    reviews: int
    next_due_on: date | None
    last_reviewed_on: date | None


class WeakSpot(BaseModel):
    concept: str
    misses: int
    lesson_title: str
    href: str


class ProgressItem(BaseModel):
    """One thing a learner can know: a lesson today, a coding problem later. Same shape for both."""

    kind: str  # lesson | problem
    slug: str
    title: str
    href: str
    topic: str
    topic_slug: str
    learn_state: str
    needs_refresh: bool
    questions: int
    first_try_correct: int
    first_try_total: int
    cards: int
    reviews: int
    last_reviewed_on: date | None
    next_due_on: date | None
    quiz_scope: str | None


class ProgressGroup(BaseModel):
    category: str
    slug: str
    items: list[ProgressItem]
    checked: int
    total: int
    quiz_scope: str | None


class SureButWrong(BaseModel):
    kind: str  # question
    prompt: str
    item_title: str
    href: str
    when: date
    times: int


class ProgressOut(BaseModel):
    groups: list[ProgressGroup]
    sure_but_wrong: list[SureButWrong]


class MemoryOut(BaseModel):
    week: list[MemoryDay]
    lessons: list[MemoryLesson]
    weak: list[WeakSpot]
    due_today: int


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
