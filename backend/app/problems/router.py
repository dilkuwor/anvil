from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.common.database import get_db
from app.common.deps import get_current_user, get_optional_user
from app.common.enums import ProgressStatus
from app.execution.service import run_code, submit_code
from app.problems import service
from app.problems.schemas import (
    ProblemDetail,
    ProblemListItem,
    ProblemListResponse,
    ProblemSolutionOut,
    RelatedProblemOut,
    RunRequest,
    SolutionApproachOut,
    SubmitRequest,
    TagOut,
    VisibleTestCaseOut,
)
from app.submissions.schemas import ExecutionResult
from app.users.models import User

router = APIRouter(prefix="/api/v1", tags=["problems"])


@router.get("/problems", response_model=ProblemListResponse)
def list_problems(
    q: str | None = Query(default=None, description="Search by title"),
    difficulty: str | None = Query(default=None),
    tag: str | None = Query(default=None),
    status: str | None = Query(default=None),
    slugs: str | None = Query(default=None, description="Comma-separated slugs to restrict the list to"),
    sort: str = Query(default="title"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> ProblemListResponse:
    items, total, statuses = service.list_problems(
        db,
        user_id=current_user.id if current_user else None,
        search=q,
        difficulty=difficulty,
        tag=tag,
        status=status,
        slugs=[item.strip() for item in slugs.split(",") if item.strip()] if slugs is not None else None,
        sort=sort,
        page=page,
        page_size=page_size,
    )
    return ProblemListResponse(
        items=[
            ProblemListItem(
                id=item.id,
                title=item.title,
                slug=item.slug,
                difficulty=item.difficulty,
                tags=[TagOut.model_validate(tag) for tag in item.tags],
                status=statuses.get(item.id, ProgressStatus.NOT_STARTED.value),
            )
            for item in items
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/problems/{slug}", response_model=ProblemDetail)
def get_problem(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> ProblemDetail:
    problem = service.get_problem_by_slug(db, slug)
    visible = [
        VisibleTestCaseOut(
            id=case.id,
            input=case.input,
            expected_output=case.expected_output,
            execution_order=case.execution_order,
        )
        for case in sorted(problem.test_cases, key=lambda c: c.execution_order)
        if not case.is_hidden
    ]
    return ProblemDetail(
        id=problem.id,
        title=problem.title,
        slug=problem.slug,
        description=problem.description,
        difficulty=problem.difficulty,
        constraints=problem.constraints,
        input_format=problem.input_format,
        output_format=problem.output_format,
        explanation=problem.explanation,
        hints=list(problem.hints or []),
        examples=list(problem.examples or []),
        time_complexity=problem.time_complexity,
        space_complexity=problem.space_complexity,
        starter_code=problem.starter_code,
        function_signature=problem.function_signature or {},
        time_limit_ms=problem.time_limit_ms,
        memory_limit_kb=problem.memory_limit_kb,
        tags=[TagOut.model_validate(tag) for tag in problem.tags],
        visible_tests=visible,
        status=service.get_user_status(db, current_user.id if current_user else None, problem.id),
        created_at=problem.created_at,
        has_solution=service.has_solution(db, problem.id),
    )


@router.get("/problems/{slug}/solution", response_model=ProblemSolutionOut)
def get_problem_solution(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> ProblemSolutionOut:
    solution, related = service.get_solution(db, slug, current_user.id if current_user else None)
    return ProblemSolutionOut(
        summary=solution.summary,
        pattern=solution.pattern,
        trigger=solution.trigger,
        approaches=[SolutionApproachOut.model_validate(item) for item in solution.approaches],
        walkthrough=solution.walkthrough or {},
        mistakes=list(solution.mistakes or []),
        edge_cases=list(solution.edge_cases or []),
        interview_script=[str(item) for item in (solution.interview_script or [])],
        follow_ups=list(solution.follow_ups or []),
        related=[RelatedProblemOut(slug=item.slug, title=item.title, difficulty=item.difficulty) for item in related],
        updated_at=solution.updated_at,
    )


@router.get("/tags", response_model=list[TagOut])
def get_tags(
    db: Session = Depends(get_db),
) -> list[TagOut]:
    return [TagOut.model_validate(tag) for tag in service.list_tags(db)]


@router.post("/problems/{problem_id}/run", response_model=ExecutionResult)
def run_problem(
    problem_id: UUID,
    payload: RunRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExecutionResult:
    return run_code(db, current_user, problem_id, payload.source_code)


@router.post("/problems/{problem_id}/submit", response_model=ExecutionResult)
def submit_problem(
    problem_id: UUID,
    payload: SubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExecutionResult:
    return submit_code(db, current_user, problem_id, payload.source_code)
