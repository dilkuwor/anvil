from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class RelatedProblemOut(BaseModel):
    id: UUID
    title: str
    slug: str
    difficulty: str
    status: str


class CatalogLesson(BaseModel):
    slug: str
    title: str


class CatalogTopic(BaseModel):
    slug: str
    title: str
    lessons: list[CatalogLesson]


class CatalogCategory(BaseModel):
    slug: str
    title: str
    topics: list[CatalogTopic]


class LearningCategoryCard(BaseModel):
    id: UUID
    slug: str
    title: str
    description: str
    icon: str
    display_order: int
    topic_count: int
    lesson_count: int
    completed_lessons: int


class LearningTopicSummary(BaseModel):
    id: UUID
    slug: str
    title: str
    description: str
    difficulty: str
    estimated_minutes: int
    lesson_count: int
    completed_lessons: int
    percent: int
    status: str
    href: str


LearnState = Literal["not_started", "learning", "checked", "mastered"]


class LearningLessonSummary(BaseModel):
    id: UUID
    slug: str
    title: str
    short_description: str
    estimated_minutes: int
    status: str
    learn_state: LearnState = "not_started"
    needs_refresh: bool = False
    href: str


class LessonCheckOut(BaseModel):
    """A question as the client sees it: never the correct option or the explanation."""

    id: UUID
    key: str
    kind: Literal["choice", "spot_mistake", "short_answer"]
    prompt: str
    options: list[str]
    section: str
    concept: str
    # Only for short_answer, which the learner grades against it after answering.
    model_answer: str | None = None


class LessonCheckStateOut(BaseModel):
    total: int
    checked: int
    correct_ids: list[UUID]
    attempted_ids: list[UUID]


class LessonReviewOut(BaseModel):
    cards: int
    reviews: int
    next_due_on: date | None
    last_reviewed_on: date | None
    mastered_at: datetime | None


class AnswerCheckIn(BaseModel):
    choice: int | None = None
    text: str | None = Field(default=None, max_length=2000)
    # short_answer only: the learner's own verdict after comparing with the model answer.
    correct: bool | None = None
    confidence: Literal["sure", "unsure"] = "unsure"
    time_ms: int | None = Field(default=None, ge=0, le=3_600_000)


class AnswerCheckOut(BaseModel):
    check_id: UUID
    correct: bool
    correct_index: int | None
    model_answer: str | None
    explanation: str
    section: str
    checked: int
    total: int
    just_checked: bool
    learn_state: LearnState


class LearningCategoryDetail(BaseModel):
    id: UUID
    slug: str
    title: str
    description: str
    icon: str
    lesson_count: int
    completed_lessons: int
    percent: int
    topics: list[LearningTopicSummary]


class LearningTopicDetail(BaseModel):
    id: UUID
    slug: str
    title: str
    description: str
    difficulty: str
    estimated_minutes: int
    category_slug: str
    category_title: str
    lesson_count: int
    completed_lessons: int
    percent: int
    status: str
    lessons: list[LearningLessonSummary]
    related_problems: list[RelatedProblemOut]
    practice_tag: str | None = None


class LearningLessonDetail(BaseModel):
    id: UUID
    slug: str
    title: str
    short_description: str
    content: str
    takeaways: list[str]
    interview_questions: list[str]
    estimated_minutes: int
    status: str
    category_slug: str
    category_title: str
    topic_slug: str
    topic_title: str
    previous: LearningLessonSummary | None = None
    next: LearningLessonSummary | None = None
    related_problems: list[RelatedProblemOut]
    learn_state: LearnState = "not_started"
    needs_refresh: bool = False
    checks: list[LessonCheckOut] = []
    check_state: LessonCheckStateOut | None = None
    review: LessonReviewOut | None = None


class LearningSearchHit(BaseModel):
    type: str
    title: str
    subtitle: str
    href: str
    difficulty: str | None = None


class LearningSearchResponse(BaseModel):
    query: str
    items: list[LearningSearchHit]


class LearningProgressSummary(BaseModel):
    completed_lessons: int
    in_progress_lessons: int
    total_lessons: int
    percent: int
    categories: list[LearningCategoryCard]


class RoadmapLearnLink(BaseModel):
    topic: LearningTopicSummary | None = None
    practice_tag: str | None = None
    mock_problem_slug: str | None = None


class TopicAskRequest(BaseModel):
    question: str | None = Field(default=None, max_length=500)


class TopicAskResponse(BaseModel):
    topic_slug: str
    answer: str


class LessonAskMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=8000)


class LessonAskRequest(BaseModel):
    question: str | None = Field(default=None, max_length=2000)
    conversation: list[LessonAskMessage] = Field(default_factory=list, max_length=24)


class LessonTutorRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    conversation: list[LessonAskMessage] = Field(default_factory=list, max_length=24)


class LessonAskResponse(BaseModel):
    lesson_slug: str
    answer: str
