from datetime import datetime

from pydantic import BaseModel

from app.progress.schemas import ActivityDay, TopicProgress


class PublicUserOut(BaseModel):
    username: str
    display_name: str | None = None
    country: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    website_url: str | None = None
    has_avatar: bool = False
    created_at: datetime


class PublicProgressOut(BaseModel):
    total_solved: int
    easy_solved: int
    medium_solved: int
    hard_solved: int
    problems_attempted: int
    total_problems: int
    easy_total: int
    medium_total: int
    hard_total: int
    total_submissions: int
    current_streak: int
    longest_streak: int
    activity_calendar: list[ActivityDay]
    topic_progress: list[TopicProgress]


class PublicProfileOut(BaseModel):
    user: PublicUserOut
    progress: PublicProgressOut
