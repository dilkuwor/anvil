from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.enums import NoteKind, NoteSourceType
from app.common.errors import AppError, ForbiddenError, NotFoundError
from app.interviews.scenarios import get_scenario
from app.learn.models import LearningLesson
from app.notes.models import Note
from app.notes.schemas import NoteCreate, NoteOut, NoteUpdate
from app.problems.models import Problem


def list_notes(
    db: Session,
    user_id: UUID,
    *,
    source_type: str | None = None,
    source_id: str | None = None,
) -> list[NoteOut]:
    stmt = select(Note).where(Note.user_id == user_id)
    if source_type:
        stmt = stmt.where(Note.source_type == source_type)
    if source_id:
        stmt = stmt.where(Note.source_id == source_id.strip())
    rows = db.scalars(stmt.order_by(Note.updated_at.desc())).all()
    return [NoteOut.model_validate(row) for row in rows]


def get_note(db: Session, user_id: UUID, note_id: UUID) -> NoteOut:
    return NoteOut.model_validate(_owned(db, user_id, note_id))


def create_note(db: Session, user_id: UUID, payload: NoteCreate) -> NoteOut:
    source_id, source_title, source_href = resolve_source(db, payload.source_type, payload.source_id)
    title = payload.title.strip() or _default_title(payload.kind, source_title, payload.body)
    row = Note(
        user_id=user_id,
        source_type=payload.source_type.value,
        source_id=source_id,
        source_title=source_title,
        source_href=source_href,
        kind=payload.kind.value,
        title=title[:200],
        body=payload.body.strip(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return NoteOut.model_validate(row)


def update_note(db: Session, user_id: UUID, note_id: UUID, payload: NoteUpdate) -> NoteOut:
    row = _owned(db, user_id, note_id)
    if payload.title is not None:
        row.title = payload.title.strip()[:200]
    if payload.body is not None:
        row.body = payload.body.strip()
    db.add(row)
    db.commit()
    db.refresh(row)
    return NoteOut.model_validate(row)


def delete_note(db: Session, user_id: UUID, note_id: UUID) -> None:
    row = _owned(db, user_id, note_id)
    db.delete(row)
    db.commit()


def resolve_source(db: Session, source_type: NoteSourceType, raw_id: str) -> tuple[str, str, str]:
    source_id = raw_id.strip()
    if not source_id:
        raise AppError("A source is required.", status_code=422, code="invalid_source")

    if source_type == NoteSourceType.LESSON:
        lesson = _lesson(db, source_id)
        topic = lesson.topic
        href = f"/learn/{topic.category.slug}/{topic.slug}/{lesson.slug}"
        return str(lesson.id), lesson.title, href

    if source_type == NoteSourceType.PROBLEM:
        problem = _problem(db, source_id)
        return str(problem.id), problem.title, f"/problems/{problem.slug}"

    if source_type == NoteSourceType.SYSTEM_DESIGN:
        if source_id == "general":
            return "general", "System Design", "/system-design/problems"
        scenario = get_scenario(source_id)
        slug = str(scenario["slug"])
        title = str(scenario["title"])
        return slug, title, f"/system-design/simulator?problem={slug}"

    raise AppError("Unknown note source.", status_code=422, code="invalid_source")


def _default_title(kind: NoteKind, source_title: str, body: str) -> str:
    if kind == NoteKind.AI_RESPONSE:
        return f"Ask AI · {source_title}" if source_title else "Saved from Ask AI"
    snippet = " ".join(body.strip().split())[:80]
    return snippet or source_title or "Note"


def _owned(db: Session, user_id: UUID, note_id: UUID) -> Note:
    row = db.get(Note, note_id)
    if row is None:
        raise NotFoundError("Note not found.")
    if row.user_id != user_id:
        raise ForbiddenError("You cannot access this note.")
    return row


def _as_uuid(value: str) -> UUID:
    try:
        return UUID(value)
    except ValueError as exc:
        raise AppError("Invalid source id.", status_code=422, code="invalid_source") from exc


def _lesson(db: Session, source_id: str) -> LearningLesson:
    lesson = db.get(LearningLesson, _as_uuid(source_id)) if _looks_uuid(source_id) else None
    if lesson is None:
        lesson = db.scalar(select(LearningLesson).where(LearningLesson.slug == source_id))
    if lesson is None or not lesson.is_published:
        raise NotFoundError("Lesson not found.")
    if lesson.topic is None:
        db.refresh(lesson, attribute_names=["topic"])
    _ = lesson.topic.category
    return lesson


def _problem(db: Session, source_id: str) -> Problem:
    problem = db.get(Problem, _as_uuid(source_id)) if _looks_uuid(source_id) else None
    if problem is None:
        problem = db.scalar(select(Problem).where(Problem.slug == source_id, Problem.is_active.is_(True)))
    if problem is None or not problem.is_active:
        raise NotFoundError("Problem not found.")
    return problem


def _looks_uuid(value: str) -> bool:
    try:
        UUID(value)
        return True
    except ValueError:
        return False
