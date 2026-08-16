from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.common.enums import ProgressStatus
from app.common.errors import NotFoundError
from app.problems.models import Problem, Tag
from app.progress.models import UserProblemProgress


def list_problems(
    db: Session,
    *,
    user_id: UUID | None,
    search: str | None,
    difficulty: str | None,
    tag: str | None,
    status: str | None,
    sort: str,
    page: int,
    page_size: int,
) -> tuple[list[Problem], int, dict[UUID, str]]:
    query = (
        select(Problem)
        .options(selectinload(Problem.tags))
        .where(Problem.is_active.is_(True))
    )

    if search:
        like = f"%{search.strip()}%"
        query = query.where(or_(Problem.title.ilike(like), Problem.slug.ilike(like)))

    if difficulty:
        query = query.where(Problem.difficulty == difficulty.upper())

    if tag:
        query = query.join(Problem.tags).where(or_(Tag.slug == tag, Tag.name.ilike(tag)))

    if user_id is not None:
        progress_subq = (
            select(UserProblemProgress.problem_id, UserProblemProgress.status)
            .where(UserProblemProgress.user_id == user_id)
            .subquery()
        )
        query = query.outerjoin(progress_subq, progress_subq.c.problem_id == Problem.id)
        if status:
            wanted = status.upper()
            if wanted == ProgressStatus.NOT_STARTED:
                query = query.where(
                    or_(progress_subq.c.status.is_(None), progress_subq.c.status == ProgressStatus.NOT_STARTED)
                )
            else:
                query = query.where(progress_subq.c.status == wanted)
    elif status and status.upper() not in {ProgressStatus.NOT_STARTED.value, ""}:
        return [], 0, {}

    sort_map = {
        "title": Problem.title.asc(),
        "-title": Problem.title.desc(),
        "difficulty": Problem.difficulty.asc(),
        "-difficulty": Problem.difficulty.desc(),
        "newest": Problem.created_at.desc(),
        "oldest": Problem.created_at.asc(),
    }
    query = query.order_by(sort_map.get(sort, Problem.title.asc()), Problem.id.asc())

    count_query = select(func.count()).select_from(query.order_by(None).subquery())
    total = db.scalar(count_query) or 0

    items = db.scalars(query.offset((page - 1) * page_size).limit(page_size)).unique().all()
    problem_ids = [item.id for item in items]
    statuses: dict[UUID, str] = {}
    if problem_ids and user_id is not None:
        rows = db.execute(
            select(UserProblemProgress.problem_id, UserProblemProgress.status).where(
                UserProblemProgress.user_id == user_id,
                UserProblemProgress.problem_id.in_(problem_ids),
            )
        )
        statuses = {row.problem_id: row.status for row in rows}
    return items, total, statuses


def get_problem_by_slug(db: Session, slug: str) -> Problem:
    problem = db.scalar(
        select(Problem)
        .options(selectinload(Problem.tags), selectinload(Problem.test_cases))
        .where(Problem.slug == slug, Problem.is_active.is_(True))
    )
    if problem is None:
        raise NotFoundError("Problem not found.")
    return problem


def get_problem_by_id(db: Session, problem_id: UUID) -> Problem:
    problem = db.scalar(
        select(Problem)
        .options(selectinload(Problem.tags), selectinload(Problem.test_cases))
        .where(Problem.id == problem_id, Problem.is_active.is_(True))
    )
    if problem is None:
        raise NotFoundError("Problem not found.")
    return problem


def get_user_status(db: Session, user_id: UUID | None, problem_id: UUID) -> str:
    if user_id is None:
        return ProgressStatus.NOT_STARTED.value
    row = db.scalar(
        select(UserProblemProgress.status).where(
            UserProblemProgress.user_id == user_id,
            UserProblemProgress.problem_id == problem_id,
        )
    )
    return row or ProgressStatus.NOT_STARTED.value


def list_tags(db: Session) -> list[Tag]:
    return list(db.scalars(select(Tag).order_by(Tag.name.asc())).all())
