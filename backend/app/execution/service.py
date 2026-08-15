from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.enums import Language, SubmissionStatus, TestResultStatus
from app.common.errors import AppError
from app.common.logging import get_logger
from app.execution.sandbox import SandboxTest, execute_java
from app.problems.models import Problem, TestCase
from app.problems.service import get_problem_by_id
from app.progress.models import UserProblemProgress
from app.progress.service import record_activity, upsert_progress
from app.submissions.models import Submission, SubmissionTestResult
from app.submissions.schemas import ExecutionResult, TestResultOut
from app.users.models import User

logger = get_logger(__name__)

_MAX_SOURCE = 100_000


def run_code(db: Session, user: User, problem_id: UUID, source_code: str) -> ExecutionResult:
    problem = get_problem_by_id(db, problem_id)
    _validate_source(source_code)
    tests = [case for case in _ordered_tests(problem) if not case.is_hidden]
    if not tests:
        raise AppError("This problem has no visible sample tests.", status_code=400, code="no_tests")

    result = execute_java(
        source_code=source_code,
        signature=problem.function_signature or {},
        tests=[_to_sandbox_test(case) for case in tests],
        time_limit_ms=problem.time_limit_ms,
        memory_limit_kb=problem.memory_limit_kb,
    )
    record_activity(db, user_id=user.id, is_submission=False, newly_solved=False)
    db.commit()
    logger.info(
        "code_run",
        user_id=str(user.id),
        problem_id=str(problem.id),
        status=result.status,
        runtime_ms=result.runtime_ms,
    )
    return _to_execution_result(result, tests, persist_hidden_io=False, submission_id=None)


def submit_code(db: Session, user: User, problem_id: UUID, source_code: str) -> ExecutionResult:
    problem = get_problem_by_id(db, problem_id)
    _validate_source(source_code)
    tests = _ordered_tests(problem)
    if not tests:
        raise AppError("This problem has no test cases.", status_code=400, code="no_tests")

    submission = Submission(
        user_id=user.id,
        problem_id=problem.id,
        language=Language.JAVA.value,
        source_code=source_code,
        status=SubmissionStatus.PENDING.value,
        total_count=len(tests),
    )
    db.add(submission)
    db.flush()

    result = execute_java(
        source_code=source_code,
        signature=problem.function_signature or {},
        tests=[_to_sandbox_test(case) for case in tests],
        time_limit_ms=problem.time_limit_ms,
        memory_limit_kb=problem.memory_limit_kb,
        submission_id=submission.id,
    )

    previous = db.scalar(
        select(UserProblemProgress).where(
            UserProblemProgress.user_id == user.id,
            UserProblemProgress.problem_id == problem.id,
        )
    )
    was_solved = previous is not None and previous.status == "SOLVED"

    submission.status = result.status
    submission.runtime_ms = result.runtime_ms
    submission.memory_kb = result.memory_kb
    submission.passed_count = result.passed
    submission.total_count = result.total or len(tests)
    submission.compile_output = result.compile_output

    test_by_id = {str(case.id): case for case in tests}
    for item in result.test_results:
        case = test_by_id.get(str(item.get("id") or item.get("test_case_id") or ""))
        if case is None:
            continue
        hidden = case.is_hidden
        db.add(
            SubmissionTestResult(
                submission_id=submission.id,
                test_case_id=case.id,
                status=item.get("status", TestResultStatus.WRONG_ANSWER.value),
                actual_output=None if hidden else item.get("actual_output"),
                expected_output=None if hidden else case.expected_output,
                runtime_ms=item.get("runtime_ms"),
                error_message=None if hidden else item.get("error_message"),
            )
        )

    accepted = result.status == SubmissionStatus.ACCEPTED.value
    upsert_progress(
        db,
        user_id=user.id,
        problem_id=problem.id,
        accepted=accepted,
        runtime_ms=result.runtime_ms,
    )
    record_activity(
        db,
        user_id=user.id,
        is_submission=True,
        newly_solved=accepted and not was_solved,
    )
    db.commit()
    db.refresh(submission)

    logger.info(
        "code_submit",
        submission_id=str(submission.id),
        user_id=str(user.id),
        problem_id=str(problem.id),
        status=result.status,
        runtime_ms=result.runtime_ms,
    )
    return _to_execution_result(result, tests, persist_hidden_io=False, submission_id=submission.id)


def _validate_source(source_code: str) -> None:
    if not source_code or not source_code.strip():
        raise AppError("Source code is required.", status_code=400, code="invalid_source")
    if len(source_code) > _MAX_SOURCE:
        raise AppError("Source code is too large.", status_code=400, code="invalid_source")


def _ordered_tests(problem: Problem) -> list[TestCase]:
    return sorted(problem.test_cases, key=lambda case: (case.execution_order, str(case.id)))


def _to_sandbox_test(case: TestCase) -> SandboxTest:
    return SandboxTest(
        id=case.id,
        input=case.input,
        expected_output=case.expected_output,
        hidden=case.is_hidden,
    )


def _to_execution_result(
    result,
    tests: list[TestCase],
    *,
    persist_hidden_io: bool,
    submission_id: UUID | None,
) -> ExecutionResult:
    hidden_ids = {str(case.id) for case in tests if case.is_hidden}
    visible = []
    for item in result.test_results:
        test_id = str(item.get("id") or item.get("test_case_id") or "")
        hidden = test_id in hidden_ids or bool(item.get("hidden"))
        visible.append(
            TestResultOut(
                test_case_id=test_id or None,
                status=item.get("status", "WRONG_ANSWER"),
                hidden=hidden,
                input=None if hidden else item.get("input"),
                expected_output=None if hidden else item.get("expected_output") or item.get("expected"),
                actual_output=None if hidden else item.get("actual_output") or item.get("actual"),
                runtime_ms=item.get("runtime_ms"),
                error_message=None if hidden else item.get("error_message"),
            )
        )
    return ExecutionResult(
        submission_id=submission_id,
        status=result.status,
        runtime_ms=result.runtime_ms,
        memory_kb=result.memory_kb,
        passed=result.passed,
        total=result.total,
        compile_output=result.compile_output,
        test_results=visible,
    )
