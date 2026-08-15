from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.common.database import get_db
from app.common.deps import get_current_user
from app.common.errors import NotFoundError
from app.problems.models import Problem, TestCase
from app.submissions.models import Submission, SubmissionTestResult
from app.submissions.schemas import (
    SubmissionDetail,
    SubmissionListResponse,
    SubmissionSummary,
    TestResultOut,
)
from app.users.models import User

router = APIRouter(prefix="/api/v1/submissions", tags=["submissions"])


@router.get("", response_model=SubmissionListResponse)
def list_submissions(
    problem_id: UUID | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubmissionListResponse:
    query = (
        select(Submission, Problem.title, Problem.slug)
        .join(Problem, Problem.id == Submission.problem_id)
        .where(Submission.user_id == current_user.id)
    )
    if problem_id:
        query = query.where(Submission.problem_id == problem_id)

    query = query.order_by(Submission.created_at.desc())
    count_query = select(func.count()).select_from(query.order_by(None).subquery())
    total = db.scalar(count_query) or 0
    rows = db.execute(query.offset((page - 1) * page_size).limit(page_size)).all()

    items = [
        SubmissionSummary(
            id=submission.id,
            problem_id=submission.problem_id,
            problem_title=title,
            problem_slug=slug,
            language=submission.language,
            status=submission.status,
            runtime_ms=submission.runtime_ms,
            memory_kb=submission.memory_kb,
            passed_count=submission.passed_count,
            total_count=submission.total_count,
            created_at=submission.created_at,
        )
        for submission, title, slug in rows
    ]
    return SubmissionListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{submission_id}", response_model=SubmissionDetail)
def get_submission(
    submission_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubmissionDetail:
    row = db.execute(
        select(Submission, Problem.title, Problem.slug)
        .join(Problem, Problem.id == Submission.problem_id)
        .options(selectinload(Submission.test_results))
        .where(Submission.id == submission_id, Submission.user_id == current_user.id)
    ).first()
    if row is None:
        raise NotFoundError("Submission not found.")

    submission, title, slug = row
    test_case_ids = [result.test_case_id for result in submission.test_results]
    hidden_map: dict[UUID, bool] = {}
    if test_case_ids:
        hidden_map = {
            case.id: case.is_hidden
            for case in db.scalars(select(TestCase).where(TestCase.id.in_(test_case_ids)))
        }

    return SubmissionDetail(
        id=submission.id,
        problem_id=submission.problem_id,
        problem_title=title,
        problem_slug=slug,
        language=submission.language,
        status=submission.status,
        runtime_ms=submission.runtime_ms,
        memory_kb=submission.memory_kb,
        passed_count=submission.passed_count,
        total_count=submission.total_count,
        created_at=submission.created_at,
        source_code=submission.source_code,
        compile_output=submission.compile_output,
        test_results=[_to_result_out(result, hidden_map.get(result.test_case_id, False)) for result in submission.test_results],
    )


def _to_result_out(result: SubmissionTestResult, hidden: bool) -> TestResultOut:
    return TestResultOut(
        test_case_id=result.test_case_id,
        status=result.status,
        hidden=hidden,
        input=None if hidden else None,
        expected_output=None if hidden else result.expected_output,
        actual_output=None if hidden else result.actual_output,
        runtime_ms=result.runtime_ms,
        error_message=None if hidden else result.error_message,
    )
