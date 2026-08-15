"""Import every ORM model so SQLAlchemy relationship strings resolve."""

from app.interviews.models import InterviewEvent, InterviewMessage, InterviewSession
from app.learn.models import (
    LearningCategory,
    LearningLesson,
    LearningLessonProblem,
    LearningTopic,
    UserLearningProgress,
)
from app.problems.models import Problem, ProblemTag, Tag, TestCase
from app.progress.models import Activity, UserProblemProgress
from app.submissions.models import Submission, SubmissionTestResult
from app.users.models import User

__all__ = [
    "Activity",
    "InterviewEvent",
    "InterviewMessage",
    "InterviewSession",
    "LearningCategory",
    "LearningLesson",
    "LearningLessonProblem",
    "LearningTopic",
    "UserLearningProgress",
    "Problem",
    "ProblemTag",
    "Submission",
    "SubmissionTestResult",
    "Tag",
    "TestCase",
    "User",
    "UserProblemProgress",
]
