from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.common.database import get_db
from app.common.deps import get_current_user
from app.lists import service
from app.lists.schemas import (
    ProblemListAddProblems,
    ProblemListCard,
    ProblemListCreate,
    ProblemListDetail,
    ProblemListUpdate,
)
from app.users.models import User

router = APIRouter(prefix="/api/v1/problem-lists", tags=["problem-lists"])


@router.get("", response_model=list[ProblemListCard])
def list_problem_lists(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ProblemListCard]:
    return service.list_for_user(db, current_user.id)


@router.post("", response_model=ProblemListCard, status_code=201)
def create_problem_list(
    payload: ProblemListCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProblemListCard:
    return service.create_list(db, current_user.id, payload.name, payload.description)


@router.get("/{list_id}", response_model=ProblemListDetail)
def get_problem_list(
    list_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProblemListDetail:
    return service.get_for_user(db, current_user.id, list_id)


@router.patch("/{list_id}", response_model=ProblemListCard)
def update_problem_list(
    list_id: UUID,
    payload: ProblemListUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProblemListCard:
    return service.update_list(db, current_user.id, list_id, payload.name, payload.description)


@router.delete("/{list_id}", status_code=204)
def delete_problem_list(
    list_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    service.delete_list(db, current_user.id, list_id)
    return Response(status_code=204)


@router.post("/{list_id}/problems", response_model=ProblemListDetail)
def add_problems_to_list(
    list_id: UUID,
    payload: ProblemListAddProblems,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProblemListDetail:
    return service.add_problems(db, current_user.id, list_id, payload.problem_ids)


@router.delete("/{list_id}/problems/{problem_id}", response_model=ProblemListDetail)
def remove_problem_from_list(
    list_id: UUID,
    problem_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProblemListDetail:
    return service.remove_problem(db, current_user.id, list_id, problem_id)
