import os
import sys
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("JWT_SECRET", "test-secret-not-for-production")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")

from app.common.database import Base, get_db  # noqa: E402
from app.common.config import get_settings  # noqa: E402
from app.main import app  # noqa: E402
from app.interviews.models import InterviewEvent, InterviewMessage, InterviewSession  # noqa: E402
from app.learn.models import (  # noqa: E402
    LearningCategory,
    LearningLesson,
    LearningLessonProblem,
    LearningTopic,
    UserLearningProgress,
)
from app.problems.models import Problem, ProblemTag, Tag, TestCase  # noqa: E402
from app.progress.models import Activity, UserProblemProgress  # noqa: E402
from app.submissions.models import Submission, SubmissionTestResult  # noqa: E402
from app.users.models import User  # noqa: E402

get_settings.cache_clear()

engine = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    future=True,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


@pytest.fixture(autouse=True)
def _create_schema() -> Generator[None, None, None]:
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db() -> Generator[Session, None, None]:
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db: Session) -> Generator[TestClient, None, None]:
    def _override() -> Generator[Session, None, None]:
        yield db

    app.dependency_overrides[get_db] = _override
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def auth_client(client: TestClient) -> TestClient:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "forge@example.com", "username": "forger", "password": "anvilpass"},
    )
    assert response.status_code == 201
    return client
