from uuid import UUID

from pydantic import BaseModel


class TagRef(BaseModel):
    id: UUID
    name: str
    slug: str


class ActivityDay(BaseModel):
    date: str
    problems_solved: int
    submissions: int
    practice_minutes: int
    runs: int


class RecentEvent(BaseModel):
    problem_title: str
    problem_slug: str
    difficulty: str
    status: str
    submission_status: str
    created_at: str


class TopicProgress(BaseModel):
    name: str
    slug: str
    solved: int
    total: int
    percent: int


class RecommendedProblem(BaseModel):
    id: UUID
    title: str
    slug: str
    difficulty: str
    status: str
    tags: list[TagRef]


class ReadinessFactor(BaseModel):
    key: str
    label: str
    percent: int


class ReadinessTopic(BaseModel):
    name: str
    slug: str
    percent: int


class InterviewReadiness(BaseModel):
    overall: int
    blurb: str
    factors: list[ReadinessFactor]
    topics: list[ReadinessTopic]


class ProgressSummary(BaseModel):
    total_solved: int
    easy_solved: int
    medium_solved: int
    hard_solved: int
    problems_attempted: int
    problems_attempting: int = 0
    total_problems: int = 0
    easy_total: int = 0
    medium_total: int = 0
    hard_total: int = 0
    today_solved: int = 0
    total_submissions: int
    accepted_submissions: int
    current_streak: int
    longest_streak: int
    recent_activity: list[ActivityDay]
    recent_events: list[RecentEvent] = []
    activity_calendar: list[ActivityDay] = []
    topic_progress: list[TopicProgress] = []
    recommendations: list[RecommendedProblem] = []
    readiness: InterviewReadiness | None = None
