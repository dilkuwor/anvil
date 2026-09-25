"""Study path, Leitner review queue and the daily plan.

Reads solved problems, finished lessons and mock interviews from the tables that already
record them; writes only the four study tables.
"""

from __future__ import annotations

import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from database.seeds.study_path import BOX_DAYS, DAILY_REVIEW_CAP, UNITS  # noqa: E402

from app.common.enums import LearningProgressStatus, NoteKind, NoteSourceType, ProgressStatus  # noqa: E402
from app.common.errors import NotFoundError  # noqa: E402
from app.email.resend import is_configured as email_configured  # noqa: E402
from app.interviews.models import InterviewSession  # noqa: E402
from app.interviews.scenarios import get_scenario  # noqa: E402
from app.learn.models import LearningLesson, LearningTopic, UserLearningProgress  # noqa: E402
from app.notes.models import Note  # noqa: E402
from app.problems.models import Problem, ProblemSolution  # noqa: E402
from app.progress.models import UserProblemProgress  # noqa: E402
from app.study.models import ReviewCard, StudyCompletion, StudyDay, StudySettings  # noqa: E402
from app.study.schemas import (  # noqa: E402
    DesignOutlineIn,
    DesignOutlineOut,
    PathDesignOut,
    PathLessonOut,
    PathOut,
    PathProblemOut,
    PathUnitOut,
    RateOut,
    ReadinessOut,
    ReadinessPoint,
    ReviewCardOut,
    ReviewQueueOut,
    StudySettingsOut,
    StudySettingsUpdate,
    TaskOut,
    TodayOut,
    ToggleOut,
)

KIND_PROBLEM = "PROBLEM"
KIND_LESSON = "LESSON"
KIND_DESIGN = "DESIGN"

MAX_BOX = max(BOX_DAYS)
LEVELS = ["Not started", "Learning", "Familiar", "Proficient", "Mastered"]

PROBLEM_MINUTES = {"EASY": 15, "MEDIUM": 25, "HARD": 35}
OUTLINE_MINUTES = 15
MOCK_MINUTES = 25
STORY_MINUTES = 5

OUTLINE_TITLE_PREFIX = "Outline: "


# --------------------------------------------------------------------------- settings


def get_or_create_settings(db: Session, user_id: UUID, timezone_name: str | None = None) -> StudySettings:
    row = db.get(StudySettings, user_id)
    if row is None:
        row = StudySettings(user_id=user_id, timezone=_valid_timezone(timezone_name) or "UTC")
        db.add(row)
        if not _commit_or_lose_race(db):
            row = db.get(StudySettings, user_id)
        db.refresh(row)
    elif timezone_name and _valid_timezone(timezone_name) and row.timezone != timezone_name:
        row.timezone = timezone_name
        db.add(row)
        db.commit()
    return row


def settings_out(row: StudySettings) -> StudySettingsOut:
    return StudySettingsOut(
        timezone=row.timezone,
        interview_date=row.interview_date,
        reminders_enabled=row.reminders_enabled,
        reminder_time=row.reminder_time,
        reminder_days=list(row.reminder_days or []),
        reminder_email=row.reminder_email,
        email_configured=email_configured(),
    )


def update_settings(db: Session, user_id: UUID, payload: StudySettingsUpdate) -> StudySettingsOut:
    row = get_or_create_settings(db, user_id)
    if payload.timezone is not None and _valid_timezone(payload.timezone):
        row.timezone = payload.timezone
    if payload.clear_interview_date:
        row.interview_date = None
    elif payload.interview_date is not None:
        row.interview_date = payload.interview_date
    if payload.reminders_enabled is not None:
        row.reminders_enabled = payload.reminders_enabled
    if payload.reminder_time is not None and _valid_time(payload.reminder_time):
        row.reminder_time = payload.reminder_time
    if payload.reminder_days is not None:
        row.reminder_days = payload.reminder_days
    if payload.reminder_email is not None:
        row.reminder_email = payload.reminder_email
    db.add(row)
    db.commit()
    db.refresh(row)
    return settings_out(row)


def local_today(settings: StudySettings, now: datetime | None = None) -> date:
    now = now or datetime.now(timezone.utc)
    try:
        return now.astimezone(ZoneInfo(settings.timezone)).date()
    except (ZoneInfoNotFoundError, ValueError):
        return now.astimezone(timezone.utc).date()


def _valid_timezone(name: str | None) -> str | None:
    if not name:
        return None
    try:
        ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        return None
    return name


def _valid_time(value: str) -> bool:
    try:
        hours, minutes = value.split(":")
        return 0 <= int(hours) <= 23 and 0 <= int(minutes) <= 59
    except ValueError:
        return False


# --------------------------------------------------------------------------- facts


class Facts:
    """Everything about one user the path, the queue and Today need, loaded once."""

    def __init__(self, db: Session, user_id: UUID, today: date):
        self.db = db
        self.user_id = user_id
        self.today = today

        slugs = [slug for unit in UNITS for slug in unit["problems"]]
        problems = db.scalars(select(Problem).where(Problem.slug.in_(slugs))).all()
        self.problems: dict[str, Problem] = {problem.slug: problem for problem in problems}

        progress = db.execute(
            select(Problem.slug, UserProblemProgress.first_solved_at, UserProblemProgress.updated_at)
            .join(UserProblemProgress, UserProblemProgress.problem_id == Problem.id)
            .where(
                UserProblemProgress.user_id == user_id,
                UserProblemProgress.status == ProgressStatus.SOLVED.value,
            )
        ).all()
        self.solved: dict[str, date] = {
            slug: (first_solved_at or updated_at or datetime.now(timezone.utc)).date()
            for slug, first_solved_at, updated_at in progress
        }

        lesson_slugs = [slug for unit in UNITS for slug in unit["lessons"]]
        lessons = db.scalars(
            select(LearningLesson)
            .options(selectinload(LearningLesson.topic).selectinload(LearningTopic.category))
            .where(LearningLesson.slug.in_(lesson_slugs))
        ).all()
        self.lessons: dict[str, LearningLesson] = {lesson.slug: lesson for lesson in lessons}

        finished = db.execute(
            select(LearningLesson.slug, UserLearningProgress.completed_at, UserLearningProgress.last_accessed_at)
            .join(UserLearningProgress, UserLearningProgress.lesson_id == LearningLesson.id)
            .where(
                UserLearningProgress.user_id == user_id,
                UserLearningProgress.status == LearningProgressStatus.COMPLETED.value,
            )
        ).all()
        self.lessons_done: dict[str, date] = {
            slug: (completed_at or accessed or datetime.now(timezone.utc)).date()
            for slug, completed_at, accessed in finished
        }

        self.completions: dict[str, date] = {
            key: completed_at.date()
            for key, completed_at in db.execute(
                select(StudyCompletion.item_key, StudyCompletion.completed_at).where(
                    StudyCompletion.user_id == user_id
                )
            ).all()
        }

        mocked = db.scalars(
            select(InterviewSession.scenario_slug).where(
                InterviewSession.user_id == user_id,
                InterviewSession.scenario_slug.is_not(None),
                InterviewSession.ended_at.is_not(None),
            )
        ).all()
        self.mocks_done: set[str] = {slug for slug in mocked if slug}

        self.cards: dict[tuple[str, str], ReviewCard] = {
            (card.kind, card.ref): card
            for card in db.scalars(select(ReviewCard).where(ReviewCard.user_id == user_id)).all()
        }

    # -- item state

    def problem_solved(self, slug: str) -> bool:
        return slug in self.solved

    def lesson_done(self, slug: str) -> bool:
        return slug in self.lessons_done

    def outline_done(self, design: str) -> bool:
        return f"outline:{design}" in self.completions

    def mock_done(self, design: str) -> bool:
        return design in self.mocks_done or f"mock:{design}" in self.completions

    def boss_done(self, unit_id: str) -> bool:
        return f"boss:{unit_id}" in self.completions

    def unit_counts(self, unit: dict) -> tuple[int, int]:
        done = sum(1 for slug in unit["problems"] if self.problem_solved(slug))
        done += sum(1 for slug in unit["lessons"] if self.lesson_done(slug))
        done += int(self.outline_done(unit["design"])) + int(self.mock_done(unit["design"]))
        total = len(unit["problems"]) + len(unit["lessons"]) + 2
        return done, total

    def unit_level(self, unit: dict) -> str:
        solved = [slug for slug in unit["problems"] if self.problem_solved(slug)]
        if not solved:
            return LEVELS[0]
        if len(solved) < len(unit["problems"]):
            return LEVELS[1]
        boxes = [self.cards[(KIND_PROBLEM, slug)].box for slug in solved if (KIND_PROBLEM, slug) in self.cards]
        if boxes and min(boxes) >= MAX_BOX - 1:
            return LEVELS[4]
        if boxes and min(boxes) >= 3:
            return LEVELS[3]
        return LEVELS[2]

    def unit_complete(self, unit: dict) -> bool:
        done, total = self.unit_counts(unit)
        return done >= total

    def current_unit(self) -> dict:
        for unit in UNITS:
            if not self.unit_complete(unit):
                return unit
        return UNITS[-1]

    def lesson_href(self, lesson: LearningLesson) -> str:
        topic = lesson.topic
        category = topic.category if topic is not None else None
        if topic is None or category is None:
            return "/learn"
        return f"/learn/{category.slug}/{topic.slug}/{lesson.slug}"


# --------------------------------------------------------------------------- cards


def sync_cards(db: Session, facts: Facts) -> None:
    """Give every solved problem, finished lesson and written outline a card. Idempotent."""
    new_cards: list[ReviewCard] = []
    for slug, solved_on in facts.solved.items():
        if slug in facts.problems and (KIND_PROBLEM, slug) not in facts.cards:
            new_cards.append(_new_card(facts.user_id, KIND_PROBLEM, slug, solved_on))
    for slug, done_on in facts.lessons_done.items():
        if slug in facts.lessons and (KIND_LESSON, slug) not in facts.cards:
            new_cards.append(_new_card(facts.user_id, KIND_LESSON, slug, done_on))
    for key, done_on in facts.completions.items():
        if key.startswith("outline:"):
            design = key.split(":", 1)[1]
            if (KIND_DESIGN, design) not in facts.cards:
                new_cards.append(_new_card(facts.user_id, KIND_DESIGN, design, done_on))
    if not new_cards:
        return
    db.add_all(new_cards)
    if not _commit_or_lose_race(db):
        # Another request made the same cards a moment ago; read theirs.
        for card in db.scalars(select(ReviewCard).where(ReviewCard.user_id == facts.user_id)).all():
            facts.cards[(card.kind, card.ref)] = card
        return
    for card in new_cards:
        db.refresh(card)
        facts.cards[(card.kind, card.ref)] = card


def _commit_or_lose_race(db: Session) -> bool:
    """Commit, or roll back and return False when a concurrent request inserted the same row."""
    try:
        db.commit()
        return True
    except IntegrityError:
        db.rollback()
        return False


def _new_card(user_id: UUID, kind: str, ref: str, learned_on: date) -> ReviewCard:
    return ReviewCard(user_id=user_id, kind=kind, ref=ref, box=1, due_on=learned_on + timedelta(days=BOX_DAYS[1]))


def due_cards(facts: Facts) -> list[ReviewCard]:
    due = [card for card in facts.cards.values() if card.due_on <= facts.today and card.box <= MAX_BOX]
    due.sort(key=lambda card: (card.due_on, card.created_at or datetime.min.replace(tzinfo=timezone.utc)))
    return due


def review_queue(db: Session, user_id: UUID, today: date) -> ReviewQueueOut:
    facts = Facts(db, user_id, today)
    sync_cards(db, facts)
    due = due_cards(facts)
    cards = [card_out(db, facts, card) for card in due[:DAILY_REVIEW_CAP]]
    return ReviewQueueOut(day=today, cards=cards, due_total=len(due), boxes=box_counts(facts))


def box_counts(facts: Facts) -> dict[int, int]:
    counts = {box: 0 for box in BOX_DAYS}
    for card in facts.cards.values():
        counts[min(card.box, MAX_BOX)] = counts.get(min(card.box, MAX_BOX), 0) + 1
    return counts


def rate_card(db: Session, user_id: UUID, card_id: UUID, rating: str, today: date) -> RateOut:
    card = db.scalar(select(ReviewCard).where(ReviewCard.id == card_id, ReviewCard.user_id == user_id))
    if card is None:
        raise NotFoundError("Review card not found")
    if rating == "forgot":
        card.box = 1
    elif rating == "good":
        card.box = min(card.box + 1, MAX_BOX)
    card.due_on = today + timedelta(days=BOX_DAYS[card.box])
    card.reviews += 1
    card.last_rating = rating
    card.last_reviewed_on = today
    db.add(card)
    db.commit()
    db.refresh(card)
    facts = Facts(db, user_id, today)
    day = _get_or_plan_day(db, facts)
    day.reviews_done += 1
    if rating == "good":
        day.reviews_good += 1
    db.add(day)
    db.commit()
    remaining = len(due_cards(facts))
    rate, count = observed_recall(db, user_id, today)
    return RateOut(
        card=card_out(db, facts, card),
        remaining=remaining,
        next_due_on=card.due_on,
        recall_rate=rate,
        recall_reviews=count,
    )


def card_out(db: Session, facts: Facts, card: ReviewCard) -> ReviewCardOut:
    if card.kind == KIND_PROBLEM:
        return _problem_card(db, facts, card)
    if card.kind == KIND_LESSON:
        return _lesson_card(facts, card)
    return _design_card(db, facts, card)


def _problem_card(db: Session, facts: Facts, card: ReviewCard) -> ReviewCardOut:
    problem = facts.problems.get(card.ref) or db.scalar(select(Problem).where(Problem.slug == card.ref))
    if problem is None:
        return _missing_card(card, "Problem no longer in the catalog")
    solution = db.scalar(select(ProblemSolution).where(ProblemSolution.problem_id == problem.id))
    unit = _unit_of_problem(card.ref)
    if solution is not None and solution.summary.strip():
        answer = solution.summary.strip()
        detail = solution.pattern.strip()
    elif problem.hints:
        answer = str(problem.hints[-1])
        detail = ""
    else:
        answer = "Open the problem and read the solution tab."
        detail = ""
    return ReviewCardOut(
        id=card.id,
        kind=KIND_PROBLEM,
        ref=card.ref,
        box=card.box,
        due_on=card.due_on,
        title=problem.title,
        label=f"{unit['title']} · Box {card.box}" if unit else f"Box {card.box}",
        prompt="What is the key idea? Say it in your head first.",
        answer=answer,
        answer_label="Key idea",
        detail=detail,
        href=f"/problems/{problem.slug}",
        note_source_type=NoteSourceType.PROBLEM.value,
        note_source_id=str(problem.id),
    )


def _lesson_card(facts: Facts, card: ReviewCard) -> ReviewCardOut:
    lesson = facts.lessons.get(card.ref)
    if lesson is None:
        return _missing_card(card, "Lesson no longer in Learn")
    takeaways = [str(item).strip() for item in (lesson.takeaways or []) if str(item).strip()]
    answer = "\n".join(f"• {item}" for item in takeaways) if takeaways else lesson.short_description
    return ReviewCardOut(
        id=card.id,
        kind=KIND_LESSON,
        ref=card.ref,
        box=card.box,
        due_on=card.due_on,
        title=lesson.title,
        label=f"Design concept · Box {card.box}",
        prompt="What are the main points of this lesson? Say them in your head first.",
        answer=answer,
        answer_label="Main points",
        href=facts.lesson_href(lesson),
        note_source_type=NoteSourceType.LESSON.value,
        note_source_id=str(lesson.id),
    )


def _design_card(db: Session, facts: Facts, card: ReviewCard) -> ReviewCardOut:
    try:
        scenario = get_scenario(card.ref)
    except NotFoundError:
        return _missing_card(card, "Design question no longer available")
    note = _outline_note(db, facts.user_id, card.ref)
    if note is not None and note.body.strip():
        answer = note.body.strip()
        answer_label = "Your saved outline"
    else:
        answer = "\n".join(f"• {item}" for item in scenario.get("functional_requirements", []))
        answer_label = "The requirements"
    return ReviewCardOut(
        id=card.id,
        kind=KIND_DESIGN,
        ref=card.ref,
        box=card.box,
        due_on=card.due_on,
        title=str(scenario["title"]),
        label=f"Design question · Box {card.box}",
        prompt="Write the 5-line outline from memory: requirements, data, main flow, scaling, trade-offs.",
        answer=answer,
        answer_label=answer_label,
        href=f"/today/outline/{card.ref}",
        wants_text=True,
    )


def _missing_card(card: ReviewCard, reason: str) -> ReviewCardOut:
    return ReviewCardOut(
        id=card.id,
        kind=card.kind,  # type: ignore[arg-type]
        ref=card.ref,
        box=card.box,
        due_on=card.due_on,
        title=card.ref,
        label=f"Box {card.box}",
        prompt=reason,
        answer="Rate it Got it to move it along, or leave it.",
        answer_label="Note",
        href="/today",
    )


def _unit_of_problem(slug: str) -> dict | None:
    for unit in UNITS:
        if slug in unit["problems"]:
            return unit
    return None


# --------------------------------------------------------------------------- design outline


def _outline_note(db: Session, user_id: UUID, design: str) -> Note | None:
    return db.scalar(
        select(Note)
        .where(
            Note.user_id == user_id,
            Note.source_type == NoteSourceType.SYSTEM_DESIGN.value,
            Note.source_id == design,
            Note.title.like(f"{OUTLINE_TITLE_PREFIX}%"),
        )
        .order_by(Note.updated_at.desc())
    )


def get_outline(db: Session, user_id: UUID, design: str) -> DesignOutlineOut:
    scenario = get_scenario(design)
    note = _outline_note(db, user_id, design)
    done = db.scalar(
        select(StudyCompletion).where(StudyCompletion.user_id == user_id, StudyCompletion.item_key == f"outline:{design}")
    )
    return DesignOutlineOut(
        slug=design,
        title=str(scenario["title"]),
        prompt=str(scenario.get("prompt", "")),
        functional_requirements=list(scenario.get("functional_requirements", [])),
        non_functional_requirements=list(scenario.get("non_functional_requirements", [])),
        constraints=list(scenario.get("constraints", [])),
        outline=note.body if note else "",
        done=done is not None,
        note_id=note.id if note else None,
    )


def save_outline(db: Session, user_id: UUID, design: str, payload: DesignOutlineIn, today: date) -> DesignOutlineOut:
    scenario = get_scenario(design)
    note = _outline_note(db, user_id, design)
    body = payload.outline.strip()
    if note is None:
        note = Note(
            user_id=user_id,
            source_type=NoteSourceType.SYSTEM_DESIGN.value,
            source_id=design,
            source_title=str(scenario["title"]),
            source_href=f"/today/outline/{design}",
            kind=NoteKind.MANUAL.value,
            title=f"{OUTLINE_TITLE_PREFIX}{scenario['title']}"[:200],
            body=body,
        )
    else:
        note.body = body
    db.add(note)
    db.commit()
    if payload.done is not None:
        _set_completion(db, user_id, f"outline:{design}", payload.done)
        if payload.done:
            facts = Facts(db, user_id, today)
            sync_cards(db, facts)
    return get_outline(db, user_id, design)


# --------------------------------------------------------------------------- path


def toggle_item(db: Session, user_id: UUID, item_key: str, today: date) -> ToggleOut:
    kind = item_key.split(":", 1)[0]
    if kind not in {"outline", "mock", "boss"}:
        raise NotFoundError("Unknown path item")
    existing = db.scalar(
        select(StudyCompletion).where(StudyCompletion.user_id == user_id, StudyCompletion.item_key == item_key)
    )
    done = _set_completion(db, user_id, item_key, existing is None)
    if done and kind == "outline":
        sync_cards(db, Facts(db, user_id, today))
    return ToggleOut(item_key=item_key, done=done)


def _set_completion(db: Session, user_id: UUID, item_key: str, done: bool) -> bool:
    existing = db.scalar(
        select(StudyCompletion).where(StudyCompletion.user_id == user_id, StudyCompletion.item_key == item_key)
    )
    if done and existing is None:
        db.add(StudyCompletion(user_id=user_id, item_key=item_key))
        db.commit()
    elif not done and existing is not None:
        db.delete(existing)
        db.commit()
    return done


def get_path(db: Session, user_id: UUID, today: date) -> PathOut:
    settings = get_or_create_settings(db, user_id)
    facts = Facts(db, user_id, today)
    sync_cards(db, facts)
    current = facts.current_unit()
    units: list[PathUnitOut] = []
    for unit in UNITS:
        done, total = facts.unit_counts(unit)
        if unit["number"] == current["number"]:
            status = "current"
        elif unit["number"] < current["number"]:
            status = "done"
        else:
            status = "ahead"
        units.append(
            PathUnitOut(
                number=unit["number"],
                id=unit["id"],
                title=unit["title"],
                why=unit.get("why", ""),
                level=facts.unit_level(unit),
                status=status,
                problems=[_path_problem(facts, slug) for slug in unit["problems"]],
                extra_problems=_extra_problem_count(db, unit),
                lessons=[_path_lesson(facts, slug) for slug in unit["lessons"]],
                design=_path_design(facts, unit["design"]),
                boss_done=facts.boss_done(unit["id"]),
                boss_key=f"boss:{unit['id']}",
                done_items=done,
                total_items=total,
            )
        )
    weeks_left = _weeks_left(settings, today)
    return PathOut(
        units=units,
        current_unit=current["number"],
        pacing=_pacing(facts, settings, today),
        interview_date=settings.interview_date,
        weeks_left=weeks_left,
    )


def _path_problem(facts: Facts, slug: str) -> PathProblemOut:
    problem = facts.problems.get(slug)
    card = facts.cards.get((KIND_PROBLEM, slug))
    return PathProblemOut(
        slug=slug,
        title=problem.title if problem else slug,
        difficulty=problem.difficulty if problem else "MEDIUM",
        solved=facts.problem_solved(slug),
        box=card.box if card else None,
    )


def _path_lesson(facts: Facts, slug: str) -> PathLessonOut:
    lesson = facts.lessons.get(slug)
    if lesson is None:
        return PathLessonOut(slug=slug, title=slug, minutes=8, href="/learn", done=facts.lesson_done(slug))
    return PathLessonOut(
        slug=slug,
        title=lesson.title,
        minutes=lesson.estimated_minutes,
        href=facts.lesson_href(lesson),
        done=facts.lesson_done(slug),
    )


def _path_design(facts: Facts, design: str) -> PathDesignOut:
    try:
        title = str(get_scenario(design)["title"])
    except NotFoundError:
        title = design
    return PathDesignOut(
        slug=design,
        title=title,
        outline_done=facts.outline_done(design),
        mock_done=facts.mock_done(design),
        outline_href=f"/today/outline/{design}",
        mock_href=f"/system-design/interview?scenario={design}",
    )


_EXTRA_COUNTS: dict[str, int] = {}


def _extra_problem_count(db: Session, unit: dict) -> int:
    """How many catalog problems share the unit's tags but are not core. Cached per process."""
    if unit["id"] in _EXTRA_COUNTS:
        return _EXTRA_COUNTS[unit["id"]]
    from sqlalchemy import func

    from app.problems.models import ProblemTag, Tag

    total = db.scalar(
        select(func.count(func.distinct(Problem.id)))
        .select_from(Problem)
        .join(ProblemTag, ProblemTag.problem_id == Problem.id)
        .join(Tag, Tag.id == ProblemTag.tag_id)
        .where(Tag.slug.in_(unit["tags"]), Problem.is_active.is_(True))
    )
    extra = max(int(total or 0) - len(unit["problems"]), 0)
    _EXTRA_COUNTS[unit["id"]] = extra
    return extra


def _weeks_left(settings: StudySettings, today: date) -> int | None:
    if settings.interview_date is None:
        return None
    return max((settings.interview_date - today).days // 7, 0)


def _pacing(facts: Facts, settings: StudySettings, today: date) -> str:
    current = facts.current_unit()
    units_left = sum(1 for unit in UNITS if unit["number"] >= current["number"] and not facts.unit_complete(unit))
    if settings.interview_date is None:
        return f"Unit {current['number']} of {len(UNITS)}. Set your interview date to see pacing."
    days_left = (settings.interview_date - today).days
    if days_left < 0:
        return "Your interview date has passed. Set a new one when you have it."
    weeks = max(days_left / 7, 0.5)
    per_week = units_left / weeks
    when = "this week" if days_left < 7 else f"in {max(days_left // 7, 1)} week{'s' if days_left // 7 != 1 else ''}"
    if units_left == 0:
        return f"Path complete. Interview {when}: keep reviewing."
    if per_week <= 1.25:
        return f"Interview {when}. On track: about {per_week:.1f} units a week."
    return f"Interview {when}. A bit behind: {units_left} units left, about {per_week:.1f} a week."


# --------------------------------------------------------------------------- today


def get_today(db: Session, user_id: UUID, today: date) -> TodayOut:
    settings = get_or_create_settings(db, user_id)
    facts = Facts(db, user_id, today)
    sync_cards(db, facts)
    day = _get_or_plan_day(db, facts)
    return _today_out(db, facts, settings, day)


def toggle_task(db: Session, user_id: UUID, today: date, task_id: str) -> TodayOut:
    settings = get_or_create_settings(db, user_id)
    facts = Facts(db, user_id, today)
    sync_cards(db, facts)
    day = _get_or_plan_day(db, facts)
    if task_id not in day.plan:
        raise NotFoundError("Task is not on today's plan")
    done = list(day.done or [])
    if task_id in done:
        done.remove(task_id)
    else:
        done.append(task_id)
    day.done = done
    db.add(day)
    db.commit()
    db.refresh(day)
    return _today_out(db, facts, settings, day)


def _get_or_plan_day(db: Session, facts: Facts) -> StudyDay:
    day = db.scalar(select(StudyDay).where(StudyDay.user_id == facts.user_id, StudyDay.day == facts.today))
    if day is None:
        day = StudyDay(user_id=facts.user_id, day=facts.today, plan=_plan_tasks(facts), done=[])
        db.add(day)
        if not _commit_or_lose_race(db):
            day = db.scalar(select(StudyDay).where(StudyDay.user_id == facts.user_id, StudyDay.day == facts.today))
        db.refresh(day)
    elif "review" not in day.plan and due_cards(facts):
        # Cards became due after the plan was made (a problem solved yesterday, say).
        day.plan = ["review", *day.plan]
        db.add(day)
        db.commit()
        db.refresh(day)
    return day


def _plan_tasks(facts: Facts) -> list[str]:
    plan: list[str] = []
    if due_cards(facts):
        plan.append("review")
    unit = facts.current_unit()

    next_problem = next((slug for slug in unit["problems"] if not facts.problem_solved(slug)), None)
    if next_problem is None:
        for later in UNITS:
            if later["number"] <= unit["number"]:
                continue
            next_problem = next((slug for slug in later["problems"] if not facts.problem_solved(slug)), None)
            if next_problem:
                break
    if next_problem:
        plan.append(f"problem:{next_problem}")

    design_task = _next_design_task(facts, unit)
    if design_task is None:
        for later in UNITS:
            if later["number"] > unit["number"]:
                design_task = _next_design_task(facts, later)
                if design_task:
                    break
    if design_task:
        plan.append(design_task)

    recent = [slug for slug in unit["problems"] if facts.problem_solved(slug)]
    if recent:
        plan.append(f"story:{recent[-1]}")
    return plan


def _next_design_task(facts: Facts, unit: dict) -> str | None:
    for slug in unit["lessons"]:
        if not facts.lesson_done(slug):
            return f"lesson:{slug}"
    if not facts.outline_done(unit["design"]):
        return f"outline:{unit['design']}"
    if not facts.mock_done(unit["design"]):
        return f"mock:{unit['design']}"
    return None


def _today_out(db: Session, facts: Facts, settings: StudySettings, day: StudyDay) -> TodayOut:
    manual = set(day.done or [])
    tasks = [task for task in (_task_out(db, facts, task_id, task_id in manual) for task_id in day.plan) if task]
    required = [task for task in tasks if not task.optional]
    done_count = sum(1 for task in required if task.done)
    unit = facts.current_unit()
    due = len(due_cards(facts))
    all_done = bool(required) and done_count == len(required)
    snapshot = _snapshot_readiness(db, facts, day)
    recall_rate, _ = observed_recall(db, facts.user_id, facts.today)
    return TodayOut(
        day=facts.today,
        unit_number=unit["number"],
        unit_title=unit["title"],
        tasks=tasks,
        done_count=done_count,
        total=len(required),
        due_reviews=due,
        all_done=all_done,
        finish_line=_finish_line(facts, unit) if all_done else "",
        pacing=_pacing(facts, settings, facts.today),
        readiness=snapshot["readiness"],
        recall_rate=recall_rate,
    )


def _task_out(db: Session, facts: Facts, task_id: str, manual: bool) -> TaskOut | None:
    kind, _, ref = task_id.partition(":")
    if kind == "review":
        due = due_cards(facts)
        shown = due[:DAILY_REVIEW_CAP]
        count = len(shown)
        why = _review_mix(shown) if shown else "Nothing due right now."
        return TaskOut(
            id=task_id,
            kind="review",
            title=f"{count} card{'s' if count != 1 else ''} due" if count else "Reviews done",
            why=why if count else "Every card is resting in its box.",
            minutes=3 * count,
            href="/today/review",
            action="Start review",
            done=manual or not due,
            manual=manual,
        )
    if kind == "problem":
        problem = facts.problems.get(ref)
        unit = _unit_of_problem(ref)
        if problem is None or unit is None:
            return None
        index = unit["problems"].index(ref) + 1
        return TaskOut(
            id=task_id,
            kind="problem",
            title=problem.title,
            why=f"Core problem {index} of {len(unit['problems'])} in {unit['title']}.",
            minutes=PROBLEM_MINUTES.get(problem.difficulty, 25),
            href=f"/problems/{problem.slug}",
            action="Open problem",
            done=manual or facts.problem_solved(ref),
            manual=manual,
            ref=ref,
        )
    if kind == "lesson":
        lesson = facts.lessons.get(ref)
        if lesson is None:
            return None
        unit = next((u for u in UNITS if ref in u["lessons"]), None)
        position = f"Lesson {unit['lessons'].index(ref) + 1} of {len(unit['lessons'])}" if unit else "Lesson"
        return TaskOut(
            id=task_id,
            kind="design",
            title=f"Read: {lesson.title}",
            why=f"{position} before the {_design_title(unit['design']) if unit else 'design'} question.",
            minutes=lesson.estimated_minutes,
            href=facts.lesson_href(lesson),
            action="Open lesson",
            done=manual or facts.lesson_done(ref),
            manual=manual,
            ref=ref,
        )
    if kind == "outline":
        return TaskOut(
            id=task_id,
            kind="design",
            title=f"Outline: {_design_title(ref)}",
            why="Write the 5-line outline. It becomes your review card.",
            minutes=OUTLINE_MINUTES,
            href=f"/today/outline/{ref}",
            action="Write outline",
            done=manual or facts.outline_done(ref),
            manual=manual,
            ref=ref,
        )
    if kind == "mock":
        return TaskOut(
            id=task_id,
            kind="design",
            title=f"Mock: {_design_title(ref)}",
            why="A short design interview with the AI on the question you outlined.",
            minutes=MOCK_MINUTES,
            href=f"/system-design/interview?scenario={ref}",
            action="Start mock",
            done=manual or facts.mock_done(ref),
            manual=manual,
            ref=ref,
        )
    if kind == "story":
        problem = facts.problems.get(ref)
        if problem is None:
            return None
        return TaskOut(
            id=task_id,
            kind="optional",
            title=f"Replay the story: {problem.title}",
            why="Only if you have energy left. Five minutes, no quiz.",
            minutes=STORY_MINUTES,
            href=f"/problems/{problem.slug}?tab=story",
            action="Replay",
            done=manual,
            manual=manual,
            optional=True,
            ref=ref,
        )
    return None


def _review_mix(cards: list[ReviewCard]) -> str:
    """'2 problems, 3 lessons' rather than a wall of titles."""
    labels = {KIND_PROBLEM: "problem", KIND_LESSON: "lesson", KIND_DESIGN: "design question"}
    parts: list[str] = []
    for kind, label in labels.items():
        n = sum(1 for card in cards if card.kind == kind)
        if n:
            parts.append(f"{n} {label}{'s' if n != 1 else ''}")
    return ", ".join(parts) + ". Recall first, then reveal."


def _design_title(design: str) -> str:
    try:
        return str(get_scenario(design)["title"]).replace("Design a ", "").replace("Design an ", "").replace("Design ", "")
    except NotFoundError:
        return design


def _finish_line(facts: Facts, unit: dict) -> str:
    solved = sum(1 for slug in unit["problems"] if facts.problem_solved(slug))
    total = len(unit["problems"])
    climbed = sum(1 for card in facts.cards.values() if card.last_reviewed_on == facts.today and card.last_rating == "good")
    parts = [f"{unit['title']}: {solved} of {total} core problems solved."]
    if climbed:
        parts.append(f"{climbed} card{'s' if climbed != 1 else ''} climbed a box.")
    return " ".join(parts)


# --------------------------------------------------------------------------- readiness
#
# Readiness = coverage × retention.
#   coverage  - the share of path items done (mastery learning).
#   retention - the average chance of recalling a card today, from the forgetting curve
#               used by FSRS: R = 1 / (1 + t / (9 · S)), t = days since the last review,
#               S = the card's stability, taken as its box interval in days.
#   pace      - progress against a straight line from when the path started to the interview.
# The observed recall rate ("Got it" ÷ all ratings, last 14 days) is reported beside it; the
# research target is 85–90%.

RECALL_WINDOW_DAYS = 14
RECALL_MIN_REVIEWS = 5
HISTORY_DAYS = 56


def retrievability(card: ReviewCard, today: date) -> float:
    stability = BOX_DAYS.get(card.box, BOX_DAYS[1])
    last = card.last_reviewed_on or (card.due_on - timedelta(days=BOX_DAYS[1]))
    elapsed = max((today - last).days, 0)
    return 1.0 / (1.0 + elapsed / (9.0 * stability))


def coverage_fraction(facts: Facts) -> float:
    done = total = 0
    for unit in UNITS:
        unit_done, unit_total = facts.unit_counts(unit)
        done += unit_done
        total += unit_total
    return done / total if total else 0.0


def retention_fraction(facts: Facts) -> float | None:
    cards = list(facts.cards.values())
    if not cards:
        return None
    return sum(retrievability(card, facts.today) for card in cards) / len(cards)


def observed_recall(db: Session, user_id: UUID, today: date) -> tuple[float | None, int]:
    since = today - timedelta(days=RECALL_WINDOW_DAYS - 1)
    rows = db.execute(
        select(StudyDay.reviews_done, StudyDay.reviews_good).where(
            StudyDay.user_id == user_id, StudyDay.day >= since, StudyDay.day <= today
        )
    ).all()
    done = sum(row[0] for row in rows)
    good = sum(row[1] for row in rows)
    if done < RECALL_MIN_REVIEWS:
        return None, done
    return good / done, done


def pace_fraction(facts: Facts, settings: StudySettings) -> float | None:
    if settings.interview_date is None or settings.created_at is None:
        return None
    start = settings.created_at.date()
    span = (settings.interview_date - start).days
    if span <= 0:
        return None
    elapsed = min(max((facts.today - start).days, 0), span)
    expected_units = len(UNITS) * elapsed / span
    if expected_units <= 0:
        return 1.0
    done_units = sum(done / total for done, total in (facts.unit_counts(unit) for unit in UNITS) if total)
    return min(done_units / expected_units, 1.5)


def _snapshot_readiness(db: Session, facts: Facts, day: StudyDay) -> dict:
    coverage = coverage_fraction(facts)
    retention = retention_fraction(facts)
    readiness = coverage * (retention if retention is not None else 1.0)
    if (
        day.coverage is None
        or abs((day.coverage or 0) - coverage) > 1e-6
        or (day.retention or 0) != (retention or 0)
        or abs((day.readiness or 0) - readiness) > 1e-6
    ):
        day.coverage = coverage
        day.retention = retention
        day.readiness = readiness
        db.add(day)
        db.commit()
    return {"coverage": coverage, "retention": retention, "readiness": readiness}


def get_readiness(db: Session, user_id: UUID, today: date) -> ReadinessOut:
    settings = get_or_create_settings(db, user_id)
    facts = Facts(db, user_id, today)
    sync_cards(db, facts)
    day = _get_or_plan_day(db, facts)
    snapshot = _snapshot_readiness(db, facts, day)
    recall_rate, recall_reviews = observed_recall(db, user_id, today)
    pace = pace_fraction(facts, settings)
    cards = len(facts.cards)

    history_rows = db.scalars(
        select(StudyDay)
        .where(StudyDay.user_id == user_id, StudyDay.day >= today - timedelta(days=HISTORY_DAYS), StudyDay.readiness.is_not(None))
        .order_by(StudyDay.day)
    ).all()
    history = [
        ReadinessPoint(day=row.day, readiness=row.readiness or 0.0, coverage=row.coverage or 0.0, retention=row.retention)
        for row in history_rows
    ]

    coverage = snapshot["coverage"]
    retention = snapshot["retention"]
    readiness = snapshot["readiness"]

    coverage_text = f"You have covered {round(coverage * 100)}% of the path."
    if retention is None:
        retention_text = "No cards yet. Solve a problem or finish a lesson to start measuring memory."
    else:
        retention_text = f"About {round(retention * 100)}% of what you learned is still recallable today."
        if recall_rate is not None:
            verdict = "on target" if 0.8 <= recall_rate <= 0.95 else ("intervals may be too long" if recall_rate < 0.8 else "you could review less")
            retention_text += f" Recall rate this fortnight: {round(recall_rate * 100)}% ({verdict})."
    if pace is None:
        pace_text = "Set your interview date to measure pace."
    elif pace >= 1.0:
        pace_text = "Ahead of the line to your interview date." if pace > 1.1 else "On the line to your interview date."
    else:
        pace_text = f"At {round(pace * 100)}% of where the line to your interview says you should be."

    if cards == 0 and coverage == 0:
        summary = "Nothing measured yet. Today's first task starts the clock."
    else:
        summary = f"Readiness {round(readiness * 100)}%: the share of the path you have studied and can still recall."

    return ReadinessOut(
        readiness=readiness,
        coverage=coverage,
        retention=retention,
        recall_rate=recall_rate,
        recall_reviews=recall_reviews,
        pace=pace,
        cards=cards,
        coverage_text=coverage_text,
        retention_text=retention_text,
        pace_text=pace_text,
        summary=summary,
        history=history,
    )
