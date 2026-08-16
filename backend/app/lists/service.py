from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.common.enums import ProgressStatus
from app.common.errors import AppError, ConflictError, ForbiddenError, NotFoundError
from app.lists.models import ProblemList, ProblemListItem
from app.lists.schemas import ProblemListCard, ProblemListDetail
from app.problems.models import Problem
from app.problems.schemas import ProblemListItem as ProblemOut
from app.problems.schemas import TagOut
from app.progress.models import UserProblemProgress


def list_for_user(db: Session, user_id: UUID) -> list[ProblemListCard]:
    lists = db.scalars(
        select(ProblemList)
        .options(selectinload(ProblemList.items))
        .where(ProblemList.user_id == user_id)
        .order_by(ProblemList.updated_at.desc())
    ).all()
    statuses = _status_map(db, user_id, [item.problem_id for row in lists for item in row.items])
    return [_to_card(row, statuses) for row in lists]


def get_for_user(db: Session, user_id: UUID, list_id: UUID) -> ProblemListDetail:
    row = _owned_list(db, user_id, list_id, with_problems=True)
    statuses = _status_map(db, user_id, [item.problem_id for item in row.items])
    items = [
        ProblemOut(
            id=entry.problem.id,
            title=entry.problem.title,
            slug=entry.problem.slug,
            difficulty=entry.problem.difficulty,
            tags=[TagOut.model_validate(tag) for tag in entry.problem.tags],
            status=statuses.get(entry.problem_id, ProgressStatus.NOT_STARTED.value),
        )
        for entry in sorted(row.items, key=lambda item: item.created_at)
        if entry.problem is not None and entry.problem.is_active
    ]
    card = _to_card(row, statuses)
    return ProblemListDetail(**card.model_dump(), items=items, created_at=row.created_at)


def create_list(db: Session, user_id: UUID, name: str, description: str) -> ProblemListCard:
    cleaned = _clean_name(name)
    _ensure_unique_name(db, user_id, cleaned)
    row = ProblemList(user_id=user_id, name=cleaned, description=description.strip(), updated_at=_now())
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_card(row, {})


def update_list(db: Session, user_id: UUID, list_id: UUID, name: str | None, description: str | None) -> ProblemListCard:
    row = _owned_list(db, user_id, list_id)
    if name is not None:
        cleaned = _clean_name(name)
        _ensure_unique_name(db, user_id, cleaned, exclude_id=row.id)
        row.name = cleaned
    if description is not None:
        row.description = description.strip()
    row.updated_at = _now()
    db.commit()
    db.refresh(row)
    statuses = _status_map(db, user_id, [item.problem_id for item in row.items])
    return _to_card(row, statuses)


def delete_list(db: Session, user_id: UUID, list_id: UUID) -> None:
    row = _owned_list(db, user_id, list_id)
    db.delete(row)
    db.commit()


def add_problems(db: Session, user_id: UUID, list_id: UUID, problem_ids: list[UUID]) -> ProblemListDetail:
    row = _owned_list(db, user_id, list_id, with_problems=True)
    existing = {item.problem_id for item in row.items}
    added = False
    for problem_id in problem_ids:
        if problem_id in existing:
            continue
        problem = db.get(Problem, problem_id)
        if problem is None or not problem.is_active:
            raise NotFoundError("Problem not found.")
        db.add(ProblemListItem(list_id=row.id, problem_id=problem_id, created_at=_now()))
        existing.add(problem_id)
        added = True
    if added:
        row.updated_at = _now()
        db.commit()
    return get_for_user(db, user_id, list_id)


def remove_problem(db: Session, user_id: UUID, list_id: UUID, problem_id: UUID) -> ProblemListDetail:
    row = _owned_list(db, user_id, list_id, with_problems=True)
    item = next((entry for entry in row.items if entry.problem_id == problem_id), None)
    if item is None:
        raise NotFoundError("That problem is not in this list.")
    db.delete(item)
    row.updated_at = _now()
    db.commit()
    return get_for_user(db, user_id, list_id)


def _owned_list(db: Session, user_id: UUID, list_id: UUID, *, with_problems: bool = False) -> ProblemList:
    query = select(ProblemList).where(ProblemList.id == list_id)
    if with_problems:
        query = query.options(selectinload(ProblemList.items).selectinload(ProblemListItem.problem).selectinload(Problem.tags))
    else:
        query = query.options(selectinload(ProblemList.items))
    row = db.scalar(query)
    if row is None:
        raise NotFoundError("List not found.")
    if row.user_id != user_id:
        raise ForbiddenError("You do not have access to this list.")
    return row


def _ensure_unique_name(db: Session, user_id: UUID, name: str, exclude_id: UUID | None = None) -> None:
    query = select(ProblemList).where(
        ProblemList.user_id == user_id,
        func.lower(ProblemList.name) == name.lower(),
    )
    if exclude_id is not None:
        query = query.where(ProblemList.id != exclude_id)
    if db.scalar(query) is not None:
        raise ConflictError("You already have a list with that name.")


def _clean_name(name: str) -> str:
    cleaned = name.strip()
    if not cleaned:
        raise AppError("List name is required.", status_code=422, code="validation_error")
    return cleaned


def _status_map(db: Session, user_id: UUID, problem_ids: list[UUID]) -> dict[UUID, str]:
    if not problem_ids:
        return {}
    rows = db.execute(
        select(UserProblemProgress.problem_id, UserProblemProgress.status).where(
            UserProblemProgress.user_id == user_id,
            UserProblemProgress.problem_id.in_(problem_ids),
        )
    )
    return {problem_id: status for problem_id, status in rows}


def _to_card(row: ProblemList, statuses: dict[UUID, str]) -> ProblemListCard:
    ids = [item.problem_id for item in row.items]
    solved = sum(1 for problem_id in ids if statuses.get(problem_id) == ProgressStatus.SOLVED.value)
    total = len(ids)
    remaining = max(total - solved, 0)
    percent = round((100 * solved) / total) if total else 0
    return ProblemListCard(
        id=row.id,
        name=row.name,
        description=row.description,
        problem_count=total,
        solved_count=solved,
        remaining_count=remaining,
        percent=percent,
        updated_at=row.updated_at,
        problem_ids=ids,
    )


def _now() -> datetime:
    return datetime.now(timezone.utc)
