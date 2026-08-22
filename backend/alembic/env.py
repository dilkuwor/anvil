from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.common.config import get_settings
from app.common.database import Base
from app.interviews.models import InterviewEvent, InterviewMessage, InterviewSession  # noqa: F401
from app.notes.models import Note  # noqa: F401
from app.learn.models import (  # noqa: F401
    LearningCategory,
    LearningLesson,
    LearningLessonProblem,
    LearningTopic,
    UserLearningProgress,
)
from app.progress.models import Activity, UserProblemProgress  # noqa: F401
from app.problems.models import Problem, ProblemTag, Tag, TestCase  # noqa: F401
from app.submissions.models import Submission, SubmissionTestResult  # noqa: F401
from app.mcp.models import McpAccessLog, McpToken  # noqa: F401
from app.oauth.models import OAuthAuthorizationCode, OAuthClient, OAuthRefreshToken  # noqa: F401
from app.users.models import User  # noqa: F401

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.sqlalchemy_database_url)
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
