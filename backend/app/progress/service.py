from datetime import UTC, date, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.common.enums import Difficulty, ProgressStatus, SubmissionStatus
from app.problems.models import Problem
from app.progress.insights import interview_readiness, recommend_problems, serialize_recommendation, topic_progress
from app.progress.models import Activity, UserProblemProgress
from app.submissions.models import Submission


def upsert_progress(
    db: Session,
    *,
    user_id: UUID,
    problem_id: UUID,
    accepted: bool,
    runtime_ms: int | None,
) -> UserProblemProgress:
    row = db.scalar(
        select(UserProblemProgress).where(
            UserProblemProgress.user_id == user_id,
            UserProblemProgress.problem_id == problem_id,
        )
    )
    now = datetime.now(UTC)
    if row is None:
        row = UserProblemProgress(
            user_id=user_id,
            problem_id=problem_id,
            status=ProgressStatus.NOT_STARTED.value,
            attempts=0,
            accepted_attempts=0,
        )
        db.add(row)

    row.attempts += 1
    row.last_attempted_at = now
    if accepted:
        row.accepted_attempts += 1
        if row.first_solved_at is None:
            row.first_solved_at = now
        row.status = ProgressStatus.SOLVED.value
        if runtime_ms is not None:
            if row.best_runtime_ms is None or runtime_ms < row.best_runtime_ms:
                row.best_runtime_ms = runtime_ms
    elif row.status != ProgressStatus.SOLVED.value:
        row.status = ProgressStatus.ATTEMPTED.value
    return row


def record_activity(
    db: Session,
    *,
    user_id: UUID,
    is_submission: bool,
    newly_solved: bool,
    practice_minutes: int = 1,
) -> Activity:
    today = datetime.now(UTC).date()
    row = db.scalar(
        select(Activity).where(Activity.user_id == user_id, Activity.activity_date == today)
    )
    if row is None:
        row = Activity(
            user_id=user_id,
            activity_date=today,
            problems_solved=0,
            submissions=0,
            practice_minutes=0,
            runs=0,
        )
        db.add(row)
    if is_submission:
        row.submissions += 1
    else:
        row.runs += 1
    if newly_solved:
        row.problems_solved += 1
    row.practice_minutes += max(practice_minutes, 1)
    return row


def compute_streaks(dates: list[date], today: date | None = None) -> tuple[int, int]:
    if not dates:
        return 0, 0
    unique = sorted(set(dates))
    today = today or datetime.now(UTC).date()

    longest = 1
    current_run = 1
    for prev, nxt in zip(unique, unique[1:]):
        if nxt == prev + timedelta(days=1):
            current_run += 1
            longest = max(longest, current_run)
        else:
            current_run = 1
    longest = max(longest, current_run)

    current = 0
    cursor = today
    date_set = set(unique)
    if today not in date_set and (today - timedelta(days=1)) not in date_set:
        return 0, longest
    if today not in date_set:
        cursor = today - timedelta(days=1)
    while cursor in date_set:
        current += 1
        cursor -= timedelta(days=1)
    return current, longest


def get_progress_summary(db: Session, user_id: UUID) -> dict:
    progress_rows = list(
        db.scalars(select(UserProblemProgress).where(UserProblemProgress.user_id == user_id)).all()
    )
    solved_ids = [row.problem_id for row in progress_rows if row.status == ProgressStatus.SOLVED.value]
    attempted = sum(1 for row in progress_rows if row.status != ProgressStatus.NOT_STARTED.value)

    difficulty_counts = {Difficulty.EASY.value: 0, Difficulty.MEDIUM.value: 0, Difficulty.HARD.value: 0}
    if solved_ids:
        rows = db.execute(
            select(Problem.difficulty, func.count())
            .where(Problem.id.in_(solved_ids))
            .group_by(Problem.difficulty)
        )
        for difficulty, count in rows:
            difficulty_counts[difficulty] = count

    total_submissions = db.scalar(
        select(func.count()).select_from(Submission).where(Submission.user_id == user_id)
    ) or 0
    accepted_submissions = db.scalar(
        select(func.count())
        .select_from(Submission)
        .where(Submission.user_id == user_id, Submission.status == SubmissionStatus.ACCEPTED.value)
    ) or 0

    activity_rows = list(db.scalars(select(Activity).where(Activity.user_id == user_id)).all())
    current_streak, longest_streak = compute_streaks([row.activity_date for row in activity_rows])

    catalog_totals = {Difficulty.EASY.value: 0, Difficulty.MEDIUM.value: 0, Difficulty.HARD.value: 0}
    for difficulty, count in db.execute(
        select(Problem.difficulty, func.count()).where(Problem.is_active.is_(True)).group_by(Problem.difficulty)
    ):
        catalog_totals[difficulty] = count

    attempting = sum(1 for row in progress_rows if row.status == ProgressStatus.ATTEMPTED.value)
    today = datetime.now(UTC).date()
    today_row = next((row for row in activity_rows if row.activity_date == today), None)

    event_rows = db.execute(
        select(Submission, Problem.title, Problem.slug, Problem.difficulty)
        .join(Problem, Problem.id == Submission.problem_id)
        .where(Submission.user_id == user_id)
        .order_by(Submission.created_at.desc())
        .limit(8)
    ).all()

    catalog = list(
        db.scalars(select(Problem).options(selectinload(Problem.tags)).where(Problem.is_active.is_(True))).all()
    )
    solved_set = set(solved_ids)
    status_by_id = {row.problem_id: row.status for row in progress_rows}
    last_attempted = {row.problem_id: row.last_attempted_at for row in progress_rows}
    topics = topic_progress(catalog, solved_set)
    recs = recommend_problems(
        catalog,
        status_by_id=status_by_id,
        last_attempted=last_attempted,
        solved_ids=solved_set,
        topics=topics,
    )
    calendar_start = today - timedelta(days=366)
    activity_calendar = [
        {
            "date": row.activity_date.isoformat(),
            "problems_solved": row.problems_solved,
            "submissions": row.submissions,
            "practice_minutes": row.practice_minutes,
            "runs": row.runs,
        }
        for row in sorted(activity_rows, key=lambda item: item.activity_date)
        if row.activity_date >= calendar_start
    ]

    recent = sorted(activity_rows, key=lambda row: row.activity_date, reverse=True)[:14]
    return {
        "total_solved": len(solved_ids),
        "easy_solved": difficulty_counts[Difficulty.EASY.value],
        "medium_solved": difficulty_counts[Difficulty.MEDIUM.value],
        "hard_solved": difficulty_counts[Difficulty.HARD.value],
        "problems_attempted": attempted,
        "problems_attempting": attempting,
        "total_problems": sum(catalog_totals.values()),
        "easy_total": catalog_totals[Difficulty.EASY.value],
        "medium_total": catalog_totals[Difficulty.MEDIUM.value],
        "hard_total": catalog_totals[Difficulty.HARD.value],
        "today_solved": today_row.problems_solved if today_row else 0,
        "total_submissions": total_submissions,
        "accepted_submissions": accepted_submissions,
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "recent_activity": [
            {
                "date": row.activity_date.isoformat(),
                "problems_solved": row.problems_solved,
                "submissions": row.submissions,
                "practice_minutes": row.practice_minutes,
                "runs": row.runs,
            }
            for row in recent
        ],
        "recent_events": [
            {
                "problem_title": title,
                "problem_slug": slug,
                "difficulty": difficulty,
                "status": "SOLVED" if submission.status == SubmissionStatus.ACCEPTED.value else "ATTEMPTED",
                "submission_status": submission.status,
                "created_at": submission.created_at.isoformat(),
            }
            for submission, title, slug, difficulty in event_rows
        ],
        "activity_calendar": activity_calendar,
        "topic_progress": topics,
        "recommendations": [
            serialize_recommendation(
                problem, status_by_id.get(problem.id, ProgressStatus.NOT_STARTED.value)
            )
            for problem in recs
        ],
        "readiness": interview_readiness(
            total_solved=len(solved_ids),
            total_problems=sum(catalog_totals.values()),
            easy_solved=difficulty_counts[Difficulty.EASY.value],
            easy_total=catalog_totals[Difficulty.EASY.value],
            medium_solved=difficulty_counts[Difficulty.MEDIUM.value],
            medium_total=catalog_totals[Difficulty.MEDIUM.value],
            hard_solved=difficulty_counts[Difficulty.HARD.value],
            hard_total=catalog_totals[Difficulty.HARD.value],
            current_streak=current_streak,
            accepted_submissions=accepted_submissions,
            total_submissions=total_submissions,
            topics=topics,
        ),
    }


def get_activity(db: Session, user_id: UUID, days: int = 120) -> list[dict]:
    start = datetime.now(UTC).date() - timedelta(days=days)
    rows = db.scalars(
        select(Activity)
        .where(Activity.user_id == user_id, Activity.activity_date >= start)
        .order_by(Activity.activity_date.asc())
    ).all()
    return [
        {
            "date": row.activity_date.isoformat(),
            "problems_solved": row.problems_solved,
            "submissions": row.submissions,
            "practice_minutes": row.practice_minutes,
            "runs": row.runs,
        }
        for row in rows
    ]
