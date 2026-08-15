"""Import every ORM model so SQLAlchemy relationship strings resolve."""

from app.problems.models import Problem, ProblemTag, Tag, TestCase
from app.progress.models import Activity, UserProblemProgress
from app.submissions.models import Submission, SubmissionTestResult
from app.users.models import User

__all__ = [
    "Activity",
    "Problem",
    "ProblemTag",
    "Submission",
    "SubmissionTestResult",
    "Tag",
    "TestCase",
    "User",
    "UserProblemProgress",
]
