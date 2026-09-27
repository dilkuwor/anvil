"""Buddy conversations: saved threads, page-aware context, streamed replies."""

from __future__ import annotations

import json
from collections.abc import Iterator
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.orm import Session, selectinload

from app.buddy.models import BuddyMessage, BuddyThread
from app.buddy.schemas import (
    BuddyContextIn,
    BuddyMessageOut,
    BuddySendIn,
    BuddyThreadDetail,
    BuddyThreadOut,
    BuddyVoiceIn,
)
from app.common.errors import NotFoundError
from app.common.logging import get_logger
from app.interviews.providers import get_llm_provider_for_user
from app.users.models import User

logger = get_logger(__name__)

HISTORY_TURNS = 12
MAX_REPLY_TOKENS = 900
UNAVAILABLE = "Buddy is temporarily unavailable. Please try again."

_SYSTEM = """You are Buddy, the study companion inside Anvil, an app where a software engineer prepares for \
technical interviews. You talk with one learner. Some learners read slowly or tire quickly, so clarity beats \
completeness.

How you write:
- Start with the answer, then a short why. Plain words, short sentences, one idea per paragraph.
- Keep replies under about 200 words unless the learner asks for depth. Use a bullet list only for parallel items.
- Use a code block only when code is the clearest way to show it. Never use emoji.
- Do not blindly agree. When the learner is wrong, say what is wrong and give the correct reasoning kindly.
- End with one short follow-up question only when it helps them remember, not every time.

Coding problems: guide with hints and questions first. Give the full solution only when the learner clearly asks for \
it, and then explain it step by step.
"""

_TEACH_ADDENDUM = """
Mode: explain it back. The learner is teaching the idea to you in their own words to test their memory. Do not \
explain it yourself first. Respond in this order: what they got right in one or two lines; what is missing or wrong, \
named precisely; one question that would make them fill the biggest gap. Keep the whole reply short.
"""

_VOICE_ADDENDUM = """
Delivery: your reply will be read aloud by a text-to-speech voice, so write for the ear. Plain sentences only, \
about 80 to 120 words. No headings, bullet lists, tables, code blocks, or symbols. Say code in words, for example \
"a for loop from zero to n". Say numbers and units in full. Start with the answer.
"""

_CONTEXT_INTRO = {
    "general": "The learner is not on a specific lesson or problem right now.",
    "lesson": "The learner is reading this lesson. Use it as the primary source.",
    "problem": "The learner is working on this coding problem in the editor.",
    "design": "The learner is working on this system design scenario.",
}


def list_threads(
    db: Session,
    user_id: UUID,
    *,
    context_kind: str | None = None,
    context_id: str | None = None,
    limit: int = 30,
) -> list[BuddyThreadOut]:
    query = (
        select(BuddyThread)
        .options(selectinload(BuddyThread.messages))
        .where(BuddyThread.user_id == user_id)
        .order_by(BuddyThread.updated_at.desc())
        .limit(limit)
    )
    if context_kind:
        query = query.where(BuddyThread.context_kind == context_kind)
    if context_id is not None:
        query = query.where(BuddyThread.context_id == context_id)
    return [_thread_out(row) for row in db.scalars(query)]


def get_thread(db: Session, user_id: UUID, thread_id: UUID) -> BuddyThreadDetail:
    row = _thread(db, user_id, thread_id)
    base = _thread_out(row)
    return BuddyThreadDetail(**base.model_dump(), messages=[BuddyMessageOut.model_validate(m) for m in row.messages])


def delete_thread(db: Session, user_id: UUID, thread_id: UUID) -> None:
    row = _thread(db, user_id, thread_id)
    db.delete(row)
    db.commit()


def send(db: Session, user: User, payload: BuddySendIn) -> Iterator[str]:
    """Save the learner's message, stream the reply as SSE, then save the reply.

    Everything that needs the request session happens before the first yield: the session is closed once
    the response starts streaming. The final save re-attaches through the same session object, which
    SQLAlchemy allows after close.
    """
    provider = get_llm_provider_for_user(user)
    thread = _resolve_thread(db, user.id, payload)
    history = [{"role": m.role, "content": m.content} for m in thread.messages[-HISTORY_TURNS:]]
    content = payload.content.strip()
    db.add(BuddyMessage(thread_id=thread.id, role="user", content=content, mode=payload.mode))
    db.execute(update(BuddyThread).where(BuddyThread.id == thread.id).values(updated_at=_now()))
    db.commit()
    thread_id = thread.id

    system = _system_prompt(db, payload.mode, thread.context_kind, thread.context_id, payload.context)
    user_turn = _user_turn(content, payload.mode)

    def events() -> Iterator[str]:
        yield _event({"thread_id": str(thread_id)})
        assembled: list[str] = []
        failed: str | None = None
        try:
            for delta in provider.stream(system, history, user_turn, max_tokens=MAX_REPLY_TOKENS):
                if delta:
                    assembled.append(delta)
                    yield _event({"delta": delta})
        except Exception as exc:  # noqa: BLE001 - any provider failure ends the stream cleanly
            logger.warning("buddy_stream_failed", error=str(exc), provider=provider.name)
            failed = _friendly_error(exc)
        reply = "".join(assembled).strip()
        message_id: str | None = None
        if reply:
            row = BuddyMessage(thread_id=thread_id, role="assistant", content=reply, mode=payload.mode)
            db.add(row)
            db.execute(update(BuddyThread).where(BuddyThread.id == thread_id).values(updated_at=_now()))
            db.commit()
            message_id = str(row.id)
        if failed and not reply:
            yield _event({"error": failed})
            return
        yield _event({"done": True, "thread_id": str(thread_id), "message_id": message_id, "partial": bool(failed)})

    return events()


def voice(db: Session, user: User, payload: BuddyVoiceIn) -> Iterator[str]:
    """Stream a spoken-style reply. Nothing is saved: voice turns live only in the drawer."""
    provider = get_llm_provider_for_user(user)
    history = [{"role": item.role, "content": item.content.strip()} for item in payload.history[-HISTORY_TURNS:]]
    content = payload.content.strip()
    system = _system_prompt(
        db, payload.mode, payload.context.kind, payload.context.id.strip(), payload.context, voice=True
    )
    user_turn = _user_turn(content, payload.mode)

    def events() -> Iterator[str]:
        assembled: list[str] = []
        try:
            for delta in provider.stream(system, history, user_turn, max_tokens=400):
                if delta:
                    assembled.append(delta)
                    yield _event({"delta": delta})
        except Exception as exc:  # noqa: BLE001 - any provider failure ends the stream cleanly
            logger.warning("buddy_voice_failed", error=str(exc), provider=provider.name)
            if not assembled:
                yield _event({"error": _friendly_error(exc)})
                return
        yield _event({"done": True})

    return events()


def _resolve_thread(db: Session, user_id: UUID, payload: BuddySendIn) -> BuddyThread:
    if payload.thread_id is not None:
        return _thread(db, user_id, payload.thread_id)
    context = payload.context
    row = BuddyThread(
        user_id=user_id,
        context_kind=context.kind,
        context_id=context.id.strip() if context.kind != "general" else "",
        context_title=context.title.strip(),
        title=_title_from(payload.content),
    )
    db.add(row)
    db.flush()
    row.messages = []
    return row


def _thread(db: Session, user_id: UUID, thread_id: UUID) -> BuddyThread:
    row = db.scalar(
        select(BuddyThread)
        .options(selectinload(BuddyThread.messages))
        .where(BuddyThread.id == thread_id, BuddyThread.user_id == user_id)
    )
    if row is None:
        raise NotFoundError("Conversation not found.")
    return row


def _thread_out(row: BuddyThread) -> BuddyThreadOut:
    last = row.messages[-1].content if row.messages else ""
    return BuddyThreadOut(
        id=row.id,
        context_kind=row.context_kind,
        context_id=row.context_id,
        context_title=row.context_title,
        title=row.title,
        preview=_clip(last, 120),
        message_count=len(row.messages),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _system_prompt(
    db: Session, mode: str, kind: str, context_id: str, live: BuddyContextIn, *, voice: bool = False
) -> str:
    parts = [_SYSTEM]
    if mode == "teach":
        parts.append(_TEACH_ADDENDUM)
    if voice:
        parts.append(_VOICE_ADDENDUM)
    parts.append(f"\nWhere the learner is: {_CONTEXT_INTRO.get(kind, _CONTEXT_INTRO['general'])}")
    context = _page_context(db, kind, context_id)
    if context:
        parts.append(f"\n{context}")
    if kind == "problem" and live.code and live.code.strip():
        parts.append(f"\nThe learner's current editor contents:\n```\n{live.code.strip()[:12000]}\n```")
    return "\n".join(parts)


def _page_context(db: Session, kind: str, context_id: str) -> str:
    if not context_id:
        return ""
    try:
        if kind == "lesson":
            from app.learn.service import lesson_context_for_slug

            return "Lesson context:\n" + lesson_context_for_slug(db, context_id)
        if kind == "problem":
            from app.problems.service import get_problem_by_slug

            return "Problem context:\n" + _problem_context(get_problem_by_slug(db, context_id))
        if kind == "design":
            from app.interviews.scenarios import get_scenario, scenario_context

            return "Scenario context:\n" + scenario_context(get_scenario(context_id))
    except NotFoundError:
        logger.info("buddy_context_missing", kind=kind, context_id=context_id)
    return ""


def _problem_context(problem) -> str:
    examples = "\n".join(
        f"- Input: {item.get('input', '')} | Output: {item.get('output', '')}"
        + (f" | {item.get('explanation')}" if item.get("explanation") else "")
        for item in (problem.examples or [])[:4]
    )
    hints = "\n".join(f"- {hint}" for hint in (problem.hints or [])[:6]) or "- (none)"
    solution = (problem.reference_solution or "").strip()
    if len(solution) > 6000:
        solution = solution[:5997] + "..."
    return (
        f"Title: {problem.title}\nDifficulty: {problem.difficulty}\n"
        f"Statement:\n{(problem.description or '').strip()[:6000]}\n"
        f"Constraints: {(problem.constraints or '').strip()[:1500] or '(none listed)'}\n"
        f"Examples:\n{examples or '- (none)'}\nHints, in order:\n{hints}\n"
        f"Target complexity: time {problem.time_complexity or '?'}, space {problem.space_complexity or '?'}\n"
        "Reference solution (for your eyes; reveal it only when the learner clearly asks for the full solution):\n"
        f"```\n{solution or '(none)'}\n```"
    )


def _user_turn(content: str, mode: str) -> str:
    if mode == "teach":
        return f"The learner explains it back in their own words:\n{content}"
    return content


def _title_from(content: str) -> str:
    first = content.strip().splitlines()[0] if content.strip() else "New conversation"
    return _clip(first, 80)


def _clip(text: str, limit: int) -> str:
    text = " ".join(text.split())
    if len(text) <= limit:
        return text
    return text[: limit - 1].rsplit(" ", 1)[0] + "…"


def _friendly_error(exc: Exception) -> str:
    message = str(exc).strip()
    if message and len(message) <= 320 and ("key" in message.lower() or "provider" in message.lower()):
        return message
    return UNAVAILABLE


def _event(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


def _now() -> datetime:
    return datetime.now(UTC)
