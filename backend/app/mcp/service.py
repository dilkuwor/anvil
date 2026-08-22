from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.cheatsheets import service as cheatsheet_service
from app.common.enums import InterviewPhase, ProgressStatus
from app.common.errors import AppError, NotFoundError
from app.interviews.architecture import summarize_architecture
from app.interviews.models import InterviewSession
from app.interviews import service as interview_service
from app.learn import service as learn_service
from app.learn.models import LearningLesson, LearningLessonProblem
from app.lists import service as list_service
from app.notes import service as note_service
from app.notes.models import Note
from app.problems import service as problem_service
from app.problems.models import Problem, TestCase
from app.progress import service as progress_service
from app.submissions.models import Submission
from app.users.models import User

SEARCH_LIMIT = 10
SNIPPET_LEN = 240
BODY_LIMIT = 12_000
WORK_LIMIT = 20
URI_SCHEME = "anvil://"

_UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)
_URI_RE = re.compile(
    r"^anvil://(me|me/overview|learn/catalog|learn/topics/([^/]+)|learn/lessons/([^/]+)|"
    r"problems/([^/]+)|cheatsheets/([^/]+)|notes/([^/]+)|submissions/([^/]+)|"
    r"interviews/([^/]+)|lists/([^/]+))$"
)


def to_json(data: Any) -> str:
    return json.dumps(data, default=_json_default, ensure_ascii=False, separators=(",", ":"))


def _json_default(value: Any) -> Any:
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    raise TypeError(f"Cannot serialize {type(value)}")


def _clip(text: str | None, limit: int = SNIPPET_LEN) -> str:
    value = " ".join((text or "").split())
    if len(value) <= limit:
        return value
    return value[: limit - 1].rstrip() + "…"


def _as_uuid(value: str, label: str) -> UUID:
    try:
        return UUID(value)
    except ValueError as exc:
        raise AppError(f"Invalid {label}.", status_code=422, code="invalid_id") from exc


def _dt(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.isoformat()


def search_anvil(
    db: Session,
    user: User,
    *,
    query: str,
    types: list[str] | None = None,
    limit: int = SEARCH_LIMIT,
) -> dict:
    limit = max(1, min(int(limit or SEARCH_LIMIT), SEARCH_LIMIT))
    wanted = {item.lower().strip() for item in (types or []) if item.strip()}
    term = (query or "").strip()
    hits: list[dict] = []

    def want(*names: str) -> bool:
        return not wanted or bool(wanted.intersection(names))

    if want("learn", "problems") and len(term) >= 2:
        learn_hits = learn_service.search_learn(db, user.id, term).items
        for item in learn_hits:
            kind = item.type
            if kind in {"category", "topic", "lesson"} and not want("learn"):
                continue
            if kind == "problem" and not want("problems"):
                continue
            uri = _uri_from_learn_hit(item.type, item.href, item.title)
            hits.append(
                {
                    "uri": uri,
                    "type": "learn" if kind != "problem" else "problem",
                    "title": item.title,
                    "snippet": _clip(item.subtitle),
                    "href": item.href,
                    "status": item.difficulty,
                }
            )

    if want("problems") and len(term) >= 1:
        problems, _, statuses = problem_service.list_problems(
            db,
            user_id=user.id,
            search=term or None,
            difficulty=None,
            tag=None,
            status=None,
            sort="title",
            page=1,
            page_size=limit,
        )
        existing = {hit["uri"] for hit in hits}
        for problem in problems:
            uri = f"{URI_SCHEME}problems/{problem.slug}"
            if uri in existing:
                continue
            hits.append(
                {
                    "uri": uri,
                    "type": "problem",
                    "title": problem.title,
                    "snippet": _clip(problem.description),
                    "href": f"/problems/{problem.slug}",
                    "status": statuses.get(problem.id, ProgressStatus.NOT_STARTED.value),
                }
            )

    if want("cheatsheets"):
        like = f"%{term}%" if term else None
        for sheet in cheatsheet_service.list_sheets(db):
            hay = f"{sheet.title} {sheet.description} {sheet.slug}".lower()
            if term and term.lower() not in hay and like:
                continue
            hits.append(
                {
                    "uri": f"{URI_SCHEME}cheatsheets/{sheet.slug}",
                    "type": "cheatsheet",
                    "title": sheet.title,
                    "snippet": _clip(sheet.description),
                    "href": sheet.href,
                }
            )

    if want("notes"):
        stmt = select(Note).where(Note.user_id == user.id)
        if term:
            like = f"%{term}%"
            stmt = stmt.where(or_(Note.title.ilike(like), Note.body.ilike(like), Note.source_title.ilike(like)))
        notes = db.scalars(stmt.order_by(Note.updated_at.desc()).limit(limit)).all()
        for note in notes:
            hits.append(
                {
                    "uri": f"{URI_SCHEME}notes/{note.id}",
                    "type": "note",
                    "title": note.title or note.source_title,
                    "snippet": _clip(note.body),
                    "href": note.source_href,
                    "status": note.source_type,
                }
            )

    if want("lists"):
        for row in list_service.list_for_user(db, user.id):
            hay = f"{row.name} {row.description}".lower()
            if term and term.lower() not in hay:
                continue
            hits.append(
                {
                    "uri": f"{URI_SCHEME}lists/{row.id}",
                    "type": "list",
                    "title": row.name,
                    "snippet": _clip(row.description or f"{row.solved_count}/{row.problem_count} solved"),
                    "href": f"/problems/lists/{row.id}",
                    "status": f"{row.percent}%",
                }
            )

    if want("interviews"):
        sessions = _completed_interviews(db, user.id, limit=limit * 2)
        for session, title, href in sessions:
            hay = f"{title} {session.kind} {session.scenario_slug or ''}".lower()
            if term and term.lower() not in hay:
                continue
            hits.append(
                {
                    "uri": f"{URI_SCHEME}interviews/{session.id}",
                    "type": "interview",
                    "title": title,
                    "snippet": _clip(_interview_snippet(session)),
                    "href": href,
                    "status": session.kind,
                }
            )

    seen: set[str] = set()
    unique: list[dict] = []
    for hit in hits:
        if hit["uri"] in seen:
            continue
        seen.add(hit["uri"])
        unique.append(hit)
        if len(unique) >= limit:
            break
    return {"query": term, "items": unique}


def _uri_from_learn_hit(kind: str, href: str, _title: str) -> str:
    parts = [part for part in href.strip("/").split("/") if part]
    if kind == "problem" and len(parts) >= 2:
        return f"{URI_SCHEME}problems/{parts[-1]}"
    if kind == "lesson" and len(parts) >= 4:
        return f"{URI_SCHEME}learn/lessons/{parts[-1]}"
    if kind == "topic" and len(parts) >= 3:
        return f"{URI_SCHEME}learn/topics/{parts[-1]}"
    if kind == "category" and len(parts) >= 2:
        return f"{URI_SCHEME}learn/catalog"
    return f"{URI_SCHEME}learn/catalog"


def get_my_overview(db: Session, user: User) -> dict:
    progress = progress_service.get_progress_summary(db, user.id)
    learn = learn_service.progress_summary(db, user.id)
    topics = list(progress.get("topic_progress") or [])
    weak = sorted(
        [row for row in topics if (row.get("total") or 0) > 0],
        key=lambda row: (row.get("percent") or 0, -(row.get("total") or 0)),
    )[:5]
    readiness = progress.get("readiness") or {}
    return {
        "user": {
            "username": user.username,
            "display_name": user.display_name,
            "href": f"/u/{user.username}",
        },
        "problems": {
            "solved": progress["total_solved"],
            "total": progress["total_problems"],
            "easy": f"{progress['easy_solved']}/{progress['easy_total']}",
            "medium": f"{progress['medium_solved']}/{progress['medium_total']}",
            "hard": f"{progress['hard_solved']}/{progress['hard_total']}",
            "attempting": progress.get("problems_attempting", 0),
            "current_streak": progress["current_streak"],
            "longest_streak": progress["longest_streak"],
            "accepted_submissions": progress["accepted_submissions"],
            "total_submissions": progress["total_submissions"],
        },
        "learn": {
            "completed_lessons": learn.completed_lessons,
            "total_lessons": learn.total_lessons,
            "percent": learn.percent,
            "categories": [
                {
                    "slug": card.slug,
                    "title": card.title,
                    "completed": card.completed_lessons,
                    "total": card.lesson_count,
                    "href": f"/learn/{card.slug}",
                }
                for card in learn.categories
            ],
        },
        "readiness": {
            "overall": readiness.get("overall"),
            "blurb": readiness.get("blurb"),
            "topics": readiness.get("topics") or [],
        },
        "weak_topics": [
            {
                "name": row.get("name"),
                "slug": row.get("slug"),
                "solved": row.get("solved"),
                "total": row.get("total"),
                "percent": row.get("percent"),
            }
            for row in weak
        ],
        "recommendations": [
            {
                "title": item["title"],
                "slug": item["slug"],
                "difficulty": item["difficulty"],
                "status": item["status"],
                "uri": f"{URI_SCHEME}problems/{item['slug']}",
                "href": f"/problems/{item['slug']}",
            }
            for item in (progress.get("recommendations") or [])
        ],
        "recent_events": (progress.get("recent_events") or [])[:5],
        "uris": {
            "overview": f"{URI_SCHEME}me/overview",
            "me": f"{URI_SCHEME}me",
        },
    }


def get_my_progress(
    db: Session,
    user: User,
    *,
    topic_slug: str | None = None,
    days: int = 30,
) -> dict:
    days = max(7, min(int(days or 30), 366))
    progress = progress_service.get_progress_summary(db, user.id)
    activity = progress_service.get_activity(db, user.id, days)
    topics = list(progress.get("topic_progress") or [])
    if topic_slug:
        slug = topic_slug.strip().lower()
        topics = [row for row in topics if str(row.get("slug") or "").lower() == slug]
        if not topics:
            raise NotFoundError("Topic not found in your progress.")
    learn = learn_service.progress_summary(db, user.id)
    return {
        "days": days,
        "topic_slug": topic_slug,
        "problems": {
            "solved": progress["total_solved"],
            "total": progress["total_problems"],
            "current_streak": progress["current_streak"],
        },
        "topic_progress": topics,
        "learn": {
            "percent": learn.percent,
            "completed_lessons": learn.completed_lessons,
            "total_lessons": learn.total_lessons,
        },
        "activity": activity,
        "readiness": progress.get("readiness"),
    }


def list_my_work(
    db: Session,
    user: User,
    *,
    kind: str | None = None,
    source_type: str | None = None,
    source_id: str | None = None,
    limit: int = WORK_LIMIT,
) -> dict:
    limit = max(1, min(int(limit or WORK_LIMIT), WORK_LIMIT))
    wanted = (kind or "").strip().lower()
    out: dict[str, Any] = {}

    if wanted in {"", "notes"}:
        notes = note_service.list_notes(
            db,
            user.id,
            source_type=source_type.upper() if source_type else None,
            source_id=source_id,
        )[:limit]
        out["notes"] = [
            {
                "uri": f"{URI_SCHEME}notes/{note.id}",
                "title": note.title,
                "source_type": note.source_type,
                "source_title": note.source_title,
                "href": note.source_href,
                "updated_at": _dt(note.updated_at),
                "snippet": _clip(note.body),
            }
            for note in notes
        ]

    if wanted in {"", "submissions"}:
        query = select(Submission, Problem.title, Problem.slug).join(Problem, Problem.id == Submission.problem_id).where(
            Submission.user_id == user.id
        )
        if source_id:
            problem = _problem_from_source(db, source_id)
            if problem is not None:
                query = query.where(Submission.problem_id == problem.id)
        rows = db.execute(query.order_by(Submission.created_at.desc()).limit(limit)).all()
        out["submissions"] = [
            {
                "uri": f"{URI_SCHEME}submissions/{submission.id}",
                "problem_title": title,
                "problem_slug": slug,
                "status": submission.status,
                "passed": f"{submission.passed_count}/{submission.total_count}",
                "created_at": _dt(submission.created_at),
                "href": f"/problems/{slug}",
            }
            for submission, title, slug in rows
        ]

    if wanted in {"", "interviews"}:
        sessions = _completed_interviews(db, user.id, limit=limit)
        out["interviews"] = [
            {
                "uri": f"{URI_SCHEME}interviews/{session.id}",
                "title": title,
                "kind": session.kind,
                "href": href,
                "ended_at": _dt(session.ended_at),
                "overall": (session.feedback or {}).get("overall") if isinstance(session.feedback, dict) else None,
            }
            for session, title, href in sessions
        ]

    if wanted in {"", "lists"}:
        out["lists"] = [
            {
                "uri": f"{URI_SCHEME}lists/{row.id}",
                "name": row.name,
                "solved": row.solved_count,
                "total": row.problem_count,
                "percent": row.percent,
                "href": f"/problems/lists/{row.id}",
            }
            for row in list_service.list_for_user(db, user.id)[:limit]
        ]

    if wanted and wanted not in {"notes", "submissions", "interviews", "lists"}:
        raise AppError(
            "kind must be notes, submissions, interviews, or lists.",
            status_code=422,
            code="invalid_kind",
        )
    return out


def get_submission(db: Session, user: User, submission_id: str) -> dict:
    sid = _as_uuid(submission_id, "submission id")
    row = db.execute(
        select(Submission, Problem.title, Problem.slug)
        .join(Problem, Problem.id == Submission.problem_id)
        .options(selectinload(Submission.test_results))
        .where(Submission.id == sid, Submission.user_id == user.id)
    ).first()
    if row is None:
        raise NotFoundError("Submission not found.")
    submission, title, slug = row
    hidden_map = _hidden_map(db, [result.test_case_id for result in submission.test_results])
    return {
        "uri": f"{URI_SCHEME}submissions/{submission.id}",
        "problem_title": title,
        "problem_slug": slug,
        "problem_uri": f"{URI_SCHEME}problems/{slug}",
        "href": f"/problems/{slug}",
        "language": submission.language,
        "status": submission.status,
        "runtime_ms": submission.runtime_ms,
        "memory_kb": submission.memory_kb,
        "passed_count": submission.passed_count,
        "total_count": submission.total_count,
        "created_at": _dt(submission.created_at),
        "source_code": submission.source_code,
        "compile_output": submission.compile_output,
        "test_results": [_public_test_result(result, hidden_map.get(result.test_case_id, False)) for result in submission.test_results],
    }


def get_interview_review(db: Session, user: User, interview_id: str) -> dict:
    sid = _as_uuid(interview_id, "interview id")
    session = interview_service.get_session(db, sid, user.id)
    if session.is_preview:
        raise NotFoundError("Interview not found.")
    completed = session.ended_at is not None or session.phase == InterviewPhase.FEEDBACK.value
    if not completed:
        raise AppError(
            "Only completed interviews can be reviewed.",
            status_code=409,
            code="interview_in_progress",
        )
    serialized = interview_service.serialize(db, session)
    feedback = serialized.feedback.model_dump() if serialized.feedback else None
    signals = session.signals if isinstance(session.signals, dict) else {}
    return {
        "uri": f"{URI_SCHEME}interviews/{session.id}",
        "kind": serialized.kind,
        "title": serialized.problem_title,
        "problem_slug": serialized.problem_slug or None,
        "problem_uri": f"{URI_SCHEME}problems/{serialized.problem_slug}" if serialized.problem_slug and serialized.kind == "CODING" else None,
        "scenario_slug": serialized.scenario_slug,
        "href": _interview_href(session, serialized.problem_slug),
        "ended_at": _dt(serialized.ended_at),
        "hints_used": serialized.hints_used,
        "accepted": serialized.accepted,
        "signals": signals,
        "feedback": feedback,
        "architecture_summary": summarize_architecture(session.architecture) if serialized.kind == "SYSTEM_DESIGN" else None,
        "transcript": [
            {"role": message.role, "content": message.content, "created_at": _dt(message.created_at)}
            for message in serialized.messages
        ],
    }


def read_resource(db: Session, user: User, uri: str, offset: int = 0) -> dict:
    parsed = parse_uri(uri)
    kind = parsed["kind"]
    key = parsed.get("key")
    offset = max(0, int(offset or 0))

    if kind == "me":
        return {
            "uri": f"{URI_SCHEME}me",
            "username": user.username,
            "display_name": user.display_name,
            "country": user.country,
            "href": f"/u/{user.username}",
            "linkedin_url": user.linkedin_url,
            "github_url": user.github_url,
            "website_url": user.website_url,
        }
    if kind == "overview":
        return get_my_overview(db, user)
    if kind == "learn_catalog":
        tree = learn_service.catalog_tree(db)
        return {
            "uri": f"{URI_SCHEME}learn/catalog",
            "href": "/learn",
            "categories": [item.model_dump() for item in tree],
        }
    if kind == "learn_topic":
        topic = learn_service.get_topic(db, user.id, key or "")
        return {
            "uri": f"{URI_SCHEME}learn/topics/{topic.slug}",
            "href": f"/learn/{topic.category_slug}/{topic.slug}",
            "title": topic.title,
            "description": topic.description,
            "difficulty": topic.difficulty,
            "status": topic.status,
            "percent": topic.percent,
            "lessons": [
                {
                    "uri": f"{URI_SCHEME}learn/lessons/{lesson.slug}",
                    "title": lesson.title,
                    "status": lesson.status,
                    "href": lesson.href,
                    "snippet": _clip(lesson.short_description),
                }
                for lesson in topic.lessons
            ],
            "related_problems": [
                {
                    "uri": f"{URI_SCHEME}problems/{item.slug}",
                    "title": item.title,
                    "slug": item.slug,
                    "difficulty": item.difficulty,
                    "status": item.status,
                    "href": f"/problems/{item.slug}",
                }
                for item in topic.related_problems
            ],
        }
    if kind == "learn_lesson":
        lesson = learn_service.get_lesson(db, user.id, key or "", record_progress=False)
        body, next_offset = _page(lesson.content, offset)
        return {
            "uri": f"{URI_SCHEME}learn/lessons/{lesson.slug}",
            "href": f"/learn/{lesson.category_slug}/{lesson.topic_slug}/{lesson.slug}",
            "title": lesson.title,
            "topic_slug": lesson.topic_slug,
            "topic_title": lesson.topic_title,
            "status": lesson.status,
            "takeaways": lesson.takeaways,
            "interview_questions": lesson.interview_questions,
            "body": body,
            "next_offset": next_offset,
            "related_problems": [
                {
                    "uri": f"{URI_SCHEME}problems/{item.slug}",
                    "title": item.title,
                    "slug": item.slug,
                    "difficulty": item.difficulty,
                    "status": item.status,
                    "href": f"/problems/{item.slug}",
                }
                for item in lesson.related_problems
            ],
        }
    if kind == "problem":
        return _public_problem(db, user, key or "")
    if kind == "cheatsheet":
        sheet = cheatsheet_service.get_sheet(db, key or "")
        sections = [section.model_dump() for section in sheet.sections]
        raw = to_json(sections)
        if offset == 0 and len(raw) <= BODY_LIMIT:
            return {
                "uri": f"{URI_SCHEME}cheatsheets/{sheet.slug}",
                "href": f"/cheatsheets/{sheet.slug}",
                "title": sheet.title,
                "description": sheet.description,
                "sections": sections,
            }
        body, next_offset = _page(raw, offset)
        return {
            "uri": f"{URI_SCHEME}cheatsheets/{sheet.slug}",
            "href": f"/cheatsheets/{sheet.slug}",
            "title": sheet.title,
            "description": sheet.description,
            "body": body,
            "next_offset": next_offset,
        }
    if kind == "note":
        note = note_service.get_note(db, user.id, _as_uuid(key or "", "note id"))
        return {
            "uri": f"{URI_SCHEME}notes/{note.id}",
            "title": note.title,
            "body": note.body,
            "source_type": note.source_type,
            "source_title": note.source_title,
            "href": note.source_href,
            "kind": note.kind,
            "updated_at": _dt(note.updated_at),
        }
    if kind == "submission":
        return get_submission(db, user, key or "")
    if kind == "interview":
        return get_interview_review(db, user, key or "")
    if kind == "list":
        detail = list_service.get_for_user(db, user.id, _as_uuid(key or "", "list id"))
        return {
            "uri": f"{URI_SCHEME}lists/{detail.id}",
            "name": detail.name,
            "description": detail.description,
            "percent": detail.percent,
            "href": f"/problems/lists/{detail.id}",
            "items": [
                {
                    "uri": f"{URI_SCHEME}problems/{item.slug}",
                    "title": item.title,
                    "slug": item.slug,
                    "difficulty": item.difficulty,
                    "status": item.status,
                    "href": f"/problems/{item.slug}",
                }
                for item in detail.items
            ],
        }
    raise NotFoundError("Unknown Anvil resource.")


def parse_uri(uri: str) -> dict[str, str]:
    value = (uri or "").strip()
    match = _URI_RE.match(value)
    if not match:
        raise AppError(
            "Unknown resource URI. Use anvil://learn/lessons/{slug}, anvil://problems/{slug}, and similar.",
            status_code=422,
            code="invalid_uri",
        )
    path = value.removeprefix(URI_SCHEME)
    if path == "me":
        return {"kind": "me"}
    if path == "me/overview":
        return {"kind": "overview"}
    if path == "learn/catalog":
        return {"kind": "learn_catalog"}
    prefix, _, key = path.partition("/")
    mapping = {
        "learn/topics": "learn_topic",
        "learn/lessons": "learn_lesson",
        "problems": "problem",
        "cheatsheets": "cheatsheet",
        "notes": "note",
        "submissions": "submission",
        "interviews": "interview",
        "lists": "list",
    }
    if path.startswith("learn/"):
        _, rest = path.split("/", 1)
        section, _, key = rest.partition("/")
        kind = mapping.get(f"learn/{section}")
        if not kind or not key:
            raise AppError("Unknown resource URI.", status_code=422, code="invalid_uri")
        return {"kind": kind, "key": key}
    kind = mapping.get(prefix)
    if not kind or not key:
        raise AppError("Unknown resource URI.", status_code=422, code="invalid_uri")
    return {"kind": kind, "key": key}


def resource_descriptors() -> list[dict]:
    return [
        {
            "uri": f"{URI_SCHEME}me",
            "name": "Me",
            "description": "The authenticated AnvilPrep user (public profile fields only).",
            "mimeType": "application/json",
        },
        {
            "uri": f"{URI_SCHEME}me/overview",
            "name": "Study overview",
            "description": "Solved counts, streak, learn progress, interview readiness, and weak topics.",
            "mimeType": "application/json",
        },
        {
            "uri": f"{URI_SCHEME}learn/catalog",
            "name": "Learn catalog",
            "description": "Categories, topics, and lesson slugs.",
            "mimeType": "application/json",
        },
    ]


def resource_templates() -> list[dict]:
    return [
        {
            "uriTemplate": f"{URI_SCHEME}learn/topics/{{slug}}",
            "name": "Learn topic",
            "description": "A learning topic with lesson list and related problems.",
            "mimeType": "application/json",
        },
        {
            "uriTemplate": f"{URI_SCHEME}learn/lessons/{{slug}}",
            "name": "Learn lesson",
            "description": "Lesson body, takeaways, and interview questions. No Ask AI.",
            "mimeType": "application/json",
        },
        {
            "uriTemplate": f"{URI_SCHEME}problems/{{slug}}",
            "name": "Problem",
            "description": "Public problem statement. Hidden tests and reference solutions are omitted.",
            "mimeType": "application/json",
        },
        {
            "uriTemplate": f"{URI_SCHEME}cheatsheets/{{slug}}",
            "name": "Cheat sheet",
            "mimeType": "application/json",
        },
        {
            "uriTemplate": f"{URI_SCHEME}notes/{{id}}",
            "name": "Note",
            "description": "One of your notes.",
            "mimeType": "application/json",
        },
        {
            "uriTemplate": f"{URI_SCHEME}submissions/{{id}}",
            "name": "Submission",
            "description": "Your source and visible test results.",
            "mimeType": "application/json",
        },
        {
            "uriTemplate": f"{URI_SCHEME}interviews/{{id}}",
            "name": "Completed interview",
            "mimeType": "application/json",
        },
        {
            "uriTemplate": f"{URI_SCHEME}lists/{{id}}",
            "name": "Problem list",
            "mimeType": "application/json",
        },
    ]


def _public_problem(db: Session, user: User, slug: str) -> dict:
    problem = problem_service.get_problem_by_slug(db, slug)
    status = problem_service.get_user_status(db, user.id, problem.id)
    lesson_rows = db.scalars(
        select(LearningLesson)
        .join(LearningLessonProblem, LearningLessonProblem.lesson_id == LearningLesson.id)
        .where(LearningLessonProblem.problem_id == problem.id, LearningLesson.is_published.is_(True))
        .limit(8)
    ).all()
    visible = [
        {
            "input": case.input,
            "expected_output": case.expected_output,
            "execution_order": case.execution_order,
        }
        for case in sorted(problem.test_cases, key=lambda item: item.execution_order)
        if not case.is_hidden
    ]
    return {
        "uri": f"{URI_SCHEME}problems/{problem.slug}",
        "href": f"/problems/{problem.slug}",
        "title": problem.title,
        "slug": problem.slug,
        "description": problem.description,
        "difficulty": problem.difficulty,
        "constraints": problem.constraints,
        "input_format": problem.input_format,
        "output_format": problem.output_format,
        "examples": list(problem.examples or []),
        "hints": list(problem.hints or []),
        "time_complexity": problem.time_complexity,
        "space_complexity": problem.space_complexity,
        "starter_code": problem.starter_code,
        "tags": [{"name": tag.name, "slug": tag.slug} for tag in problem.tags],
        "status": status,
        "visible_tests": visible,
        "related_lessons": [
            {
                "uri": f"{URI_SCHEME}learn/lessons/{lesson.slug}",
                "title": lesson.title,
                "slug": lesson.slug,
            }
            for lesson in lesson_rows
        ],
    }


def _page(text: str, offset: int) -> tuple[str, int | None]:
    if offset >= len(text):
        return "", None
    chunk = text[offset : offset + BODY_LIMIT]
    nxt = offset + BODY_LIMIT if offset + BODY_LIMIT < len(text) else None
    return chunk, nxt


def _hidden_map(db: Session, test_case_ids: list[UUID]) -> dict[UUID, bool]:
    if not test_case_ids:
        return {}
    return {
        case.id: case.is_hidden
        for case in db.scalars(select(TestCase).where(TestCase.id.in_(test_case_ids)))
    }


def _public_test_result(result, hidden: bool) -> dict:
    return {
        "status": result.status,
        "hidden": hidden,
        "input": None,
        "expected_output": None if hidden else result.expected_output,
        "actual_output": None if hidden else result.actual_output,
        "runtime_ms": result.runtime_ms,
        "error_message": None if hidden else result.error_message,
    }


def _problem_from_source(db: Session, source_id: str) -> Problem | None:
    source_id = source_id.strip()
    if _UUID_RE.match(source_id):
        return db.get(Problem, UUID(source_id))
    return db.scalar(select(Problem).where(Problem.slug == source_id, Problem.is_active.is_(True)))


def _completed_interviews(db: Session, user_id: UUID, limit: int = 20) -> list[tuple[InterviewSession, str, str]]:
    sessions = db.scalars(
        select(InterviewSession)
        .options(selectinload(InterviewSession.messages))
        .where(
            InterviewSession.user_id == user_id,
            InterviewSession.is_preview.is_(False),
            or_(InterviewSession.ended_at.is_not(None), InterviewSession.phase == InterviewPhase.FEEDBACK.value),
        )
        .order_by(InterviewSession.started_at.desc())
        .limit(limit)
    ).all()
    out: list[tuple[InterviewSession, str, str]] = []
    for session in sessions:
        serialized = interview_service.to_out(session, db.get(Problem, session.problem_id) if session.problem_id else None)
        title = serialized.problem_title or serialized.scenario_slug or "Interview"
        out.append((session, title, _interview_href(session, serialized.problem_slug)))
    return out


def _interview_href(session: InterviewSession, problem_slug: str | None) -> str:
    if session.kind == "SYSTEM_DESIGN":
        slug = session.scenario_slug or ""
        return f"/system-design/interview?scenario={slug}" if slug else "/system-design/history"
    if problem_slug:
        return f"/problems/{problem_slug}?interview=1"
    return "/dashboard"


def _interview_snippet(session: InterviewSession) -> str:
    if isinstance(session.feedback, dict) and session.feedback.get("summary"):
        return str(session.feedback["summary"])
    return f"{session.kind} · {session.phase}"


