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


class LearningLessonSummary(BaseModel):
    id: UUID
    slug: str
    title: str
    short_description: str
    estimated_minutes: int
    status: str
    href: str


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
