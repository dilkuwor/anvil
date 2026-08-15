from pydantic import BaseModel


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
