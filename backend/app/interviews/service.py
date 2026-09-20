"""Interview session state machine. The agent writes interviewer lines only."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.common.config import get_settings
from app.common.enums import InterviewEventType, InterviewKind, InterviewMessageRole, InterviewPhase
from app.common.errors import AppError, ForbiddenError, NotFoundError
from app.interviews import ollama
from app.interviews.agent import InterviewContext, MockInterviewAgent, ProblemSnapshot, SandboxSnapshot
from app.interviews.providers import get_llm_provider_for_user
from app.interviews.models import InterviewEvent, InterviewMessage, InterviewSession
from app.interviews.signals import empty_signals, infer_signals, normalize_signals
from app.interviews.schemas import (
    InterviewFeedbackOut,
    InterviewObjectiveOut,
    InterviewScoresOut,
    InterviewSessionOut,
)
from app.problems.models import Problem

PHASE_LABELS = {
    InterviewPhase.INTRO.value: "Introduction",
    InterviewPhase.UNDERSTANDING.value: "Understanding",
    InterviewPhase.APPROACH.value: "Approach",
    InterviewPhase.CODING.value: "Coding",
    InterviewPhase.TESTING.value: "Testing",
    InterviewPhase.FOLLOW_UP.value: "Follow-up",
    InterviewPhase.REQUIREMENTS.value: "Requirements",
    InterviewPhase.CAPACITY.value: "Capacity Estimation",
    InterviewPhase.HIGH_LEVEL.value: "High-Level Design",
    InterviewPhase.DEEP_DIVE.value: "Deep Dive",
    InterviewPhase.SCALABILITY.value: "Scalability",
    InterviewPhase.RELIABILITY.value: "Reliability",
    InterviewPhase.TRADEOFFS.value: "Trade-offs",
    InterviewPhase.QUESTION.value: "Your Story",
    InterviewPhase.PROBE.value: "Follow-up",
    InterviewPhase.CLOSING.value: "Your Questions",
    InterviewPhase.FEEDBACK.value: "Feedback",
}

PREVIEW_PROBLEM_SLUG = "pair-target"
PREVIEW_TURN_LIMIT = 4

INTERVIEWER_NAMES = ("Maya", "Daniel", "Priya", "Marcus", "Elena", "Kenji", "Sarah", "Omar")
MAX_CODE_CHARS = 12000
_READY_ONLY = re.compile(
    r"^\W*(ok(ay)?|yes|yep|yeah|sure|alright|got it|done|i'?m ready|i am ready|ready|let'?s (go|start|begin))"
    r"(\W+(ok(ay)?|i'?m ready|ready|let'?s (go|start|begin)|i('?ve| have) read it))*\W*$",
    re.I,
)


def interviewer_name(session: InterviewSession) -> str:
    """Stable per session, no column needed."""
    return INTERVIEWER_NAMES[session.id.int % len(INTERVIEWER_NAMES)] if session.id else INTERVIEWER_NAMES[0]


def start_session(db: Session, user_id: UUID, problem_id: UUID) -> InterviewSession:
    problem = _get_problem(db, problem_id)
    existing = get_active_session(db, user_id, problem_id)
    if existing is not None and existing.ended_at is None:
        return existing
    session = _open_new_session(db, problem, user_id, is_preview=False)
    return _load_session(db, session.id, user_id)


def start_preview_session(db: Session, slug: str = PREVIEW_PROBLEM_SLUG) -> InterviewSession:
    problem = db.scalar(select(Problem).where(Problem.slug == slug, Problem.is_active.is_(True)))
    if problem is None:
        raise NotFoundError("Problem not found.")
    session = _open_new_session(db, problem, None, is_preview=True)
    return _load_preview_session(db, session.id)


def get_preview_session(db: Session, session_id: UUID) -> InterviewSession:
    return _load_preview_session(db, session_id)


def add_preview_message(db: Session, session_id: UUID, content: str) -> InterviewSession:
    session = get_preview_session(db, session_id)
    _ensure_open(session)
    if session.candidate_turns >= PREVIEW_TURN_LIMIT:
        raise AppError("Log in to continue this mock interview.", status_code=401, code="login_required")
    problem = _get_problem(db, session.problem_id)
    text = content.strip()
    _add_message(session, InterviewMessageRole.CANDIDATE, text)
    session.candidate_turns += 1
    _add_event(session, InterviewEventType.MESSAGE, {"role": "CANDIDATE", "preview": True})
    current = session.phase
    session.phase_turns += 1
    advancing = _will_advance(session, current, text)
    reply = _reply_after_candidate(
        problem,
        session,
        text,
        event_note=_candidate_note(current, advancing) + " This is a short public preview.",
        will_advance=advancing,
    )
    _add_message(session, InterviewMessageRole.INTERVIEWER, reply)
    _advance_after_candidate(session, current, advancing)
    db.commit()
    db.refresh(session)
    return session


def get_active_session(db: Session, user_id: UUID, problem_id: UUID) -> InterviewSession | None:
    session = db.scalar(
        select(InterviewSession)
        .options(selectinload(InterviewSession.messages), selectinload(InterviewSession.events))
        .where(
            InterviewSession.user_id == user_id,
            InterviewSession.problem_id == problem_id,
            InterviewSession.ended_at.is_(None),
        )
        .order_by(InterviewSession.started_at.desc())
    )
    if session is None:
        return None
    _expire_if_needed(db, session)
    if session.ended_at is not None:
        return session
    return session


def get_session(db: Session, session_id: UUID, user_id: UUID) -> InterviewSession:
    session = _load_session(db, session_id, user_id)
    _expire_if_needed(db, session)
    return session


def add_candidate_message(
    db: Session,
    session_id: UUID,
    user_id: UUID,
    content: str,
    source_code: str | None = None,
) -> InterviewSession:
    session = get_session(db, session_id, user_id)
    _ensure_open(session)
    if _is_system_design(session):
        from app.interviews import system_design

        return system_design.add_message(db, session, content)
    if _is_behavioral(session):
        from app.interviews import behavioral

        return behavioral.add_message(db, session, content)
    problem = _get_problem(db, session.problem_id)
    text = content.strip()
    _add_message(session, InterviewMessageRole.CANDIDATE, text)
    session.candidate_turns += 1
    _add_event(session, InterviewEventType.MESSAGE, _with_code({"role": "CANDIDATE"}, source_code))

    current = session.phase
    session.phase_turns += 1
    if current == InterviewPhase.CLOSING.value:
        reply = _ask_interviewer(
            problem,
            session,
            event_note=(
                "They replied to your invitation to ask questions. If they asked something, answer briefly as yourself. "
                "Then thank them for their time and say goodbye. Do not ask another question."
            ),
            fallback=CLOSING_GOODBYE,
            last_candidate_text=text,
        )
        _add_message(session, InterviewMessageRole.INTERVIEWER, reply)
        _complete(db, session, problem)
        return session
    if current == InterviewPhase.FOLLOW_UP.value and session.followups_asked >= 2:
        reply = _ask_interviewer(
            problem,
            session,
            event_note=(
                "They answered your last technical follow-up. Acknowledge it in a few words, say that is everything "
                "you wanted to cover technically, and ask what questions they have for you."
            ),
            fallback=CLOSING_INVITE,
            last_candidate_text=text,
            will_advance=True,
        )
        _add_message(session, InterviewMessageRole.INTERVIEWER, reply)
        _set_phase(session, InterviewPhase.CLOSING.value)
        db.commit()
        db.refresh(session)
        return session

    advancing = _will_advance(session, current, text)
    reply = _reply_after_candidate(
        problem,
        session,
        text,
        event_note=_candidate_note(current, advancing),
        will_advance=advancing,
    )
    _add_message(session, InterviewMessageRole.INTERVIEWER, reply)
    if current == InterviewPhase.FOLLOW_UP.value:
        session.followups_asked += 1
    _advance_after_candidate(session, current, advancing)
    db.commit()
    db.refresh(session)
    return session


def request_hint(db: Session, session_id: UUID, user_id: UUID) -> InterviewSession:
    session = get_session(db, session_id, user_id)
    _ensure_open(session)
    if _is_system_design(session):
        from app.interviews import system_design

        return system_design.request_hint(db, session)
    if _is_behavioral(session):
        from app.interviews import behavioral

        return behavioral.request_hint(db, session)
    problem = _get_problem(db, session.problem_id)
    session.hints_used += 1
    _add_event(session, InterviewEventType.HINT, {"n": session.hints_used})

    canned = _progressive_hint(problem, session.hints_used)
    if canned:
        hint = canned
    else:
        hint = _ask_interviewer(
            problem,
            session,
            event_note=(
                f"They asked for hint {session.hints_used}. Give a small nudge only. "
                "Do not give the algorithm or any code."
            ),
            fallback="Think about what stays the same for every string that belongs in the same group.",
            allow_hint_nudge=True,
        )
    _add_message(session, InterviewMessageRole.INTERVIEWER, hint)
    db.commit()
    db.refresh(session)
    return session


def record_execution_event(
    db: Session,
    session_id: UUID,
    user_id: UUID,
    *,
    event_type: str,
    status: str,
    passed: int,
    total: int,
    runtime_ms: int | None,
    memory_kb: int | None,
    source_code: str | None = None,
) -> InterviewSession:
    session = get_session(db, session_id, user_id)
    _ensure_open(session)
    if _is_system_design(session) or _is_behavioral(session):
        raise AppError("Execution events are only used in coding interviews.", status_code=400, code="bad_request")
    problem = _get_problem(db, session.problem_id)
    accepted = status == "ACCEPTED"

    session.last_status = status
    session.last_run_passed = passed
    session.last_run_total = total
    session.last_runtime_ms = runtime_ms
    session.last_memory_kb = memory_kb

    # They started running code, so the talking phases are over.
    if session.phase in {InterviewPhase.UNDERSTANDING.value, InterviewPhase.APPROACH.value}:
        _set_phase(session, InterviewPhase.CODING.value)

    if event_type == InterviewEventType.RUN.value:
        session.run_count += 1
        if passed == total and total > 0 and session.phase == InterviewPhase.CODING.value:
            _set_phase(session, InterviewPhase.TESTING.value)
        note = (
            f"They just ran their code. AUTHORITATIVE run result: {status}. {passed}/{total} visible tests passed. "
            f"Runtime {runtime_ms}ms. Do not contradict this. Do not invent hidden tests. "
            "React like an interviewer watching the run: if it failed, ask what they think went wrong; "
            "if it passed, ask about an edge case or have them trace an input."
        )
        fallback = _fallback_after_run(passed, total)
    elif event_type == InterviewEventType.SUBMIT.value:
        session.submit_count += 1
        if accepted:
            session.accepted = 1
            if session.phase != InterviewPhase.CLOSING.value:
                _set_phase(session, InterviewPhase.FOLLOW_UP.value)
        else:
            session.wrong_attempts += 1
            if session.phase == InterviewPhase.TESTING.value:
                _set_phase(session, InterviewPhase.CODING.value)
        note = (
            f"They just submitted. AUTHORITATIVE submit result: {status}. {passed}/{total} tests passed. "
            "Do not reveal hidden test details. Do not rewrite their code. "
            + (
                "Tell them it passed, then start the follow-up discussion with one question about their solution."
                if accepted
                else "Tell them some cases are failing and ask what kind of input their code might not handle."
            )
        )
        fallback = _fallback_after_submit(accepted)
    else:
        raise AppError("Unsupported interview event.", status_code=400, code="bad_request")

    _add_event(
        session,
        InterviewEventType(event_type),
        _with_code(
            {"status": status, "passed": passed, "total": total, "runtime_ms": runtime_ms, "memory_kb": memory_kb},
            source_code,
        ),
    )
    reply = _ask_interviewer(
        problem,
        session,
        event_note=note,
        fallback=fallback,
        last_event=event_type,
    )
    _add_message(session, InterviewMessageRole.INTERVIEWER, reply)
    if accepted and event_type == InterviewEventType.SUBMIT.value:
        session.followups_asked += 1
    db.commit()
    db.refresh(session)
    return session


def end_session(db: Session, session_id: UUID, user_id: UUID) -> InterviewSession:
    session = get_session(db, session_id, user_id)
    if session.ended_at is not None:
        return session
    problem = _get_problem(db, session.problem_id) if session.problem_id else None
    _add_event(session, InterviewEventType.END, {})
    _complete(db, session, problem)
    return session


def remaining_seconds(session: InterviewSession, now: datetime | None = None) -> int:
    if session.ended_at is not None:
        ended = _aware(session.ended_at)
        started = _aware(session.started_at)
        return max(0, session.duration_seconds - int((ended - started).total_seconds()))
    current = now or _now()
    started = _aware(session.started_at)
    elapsed = int((current - started).total_seconds())
    return max(0, session.duration_seconds - elapsed)


def time_taken_seconds(session: InterviewSession) -> int:
    end = _aware(session.ended_at) if session.ended_at is not None else _now()
    return max(0, int((end - _aware(session.started_at)).total_seconds()))


def to_out(session: InterviewSession, problem: Problem | None = None) -> InterviewSessionOut:
    title = problem.title if problem else ""
    slug = problem.slug if problem else ""
    difficulty = problem.difficulty if problem else ""
    if problem is None and hasattr(session, "problem") and session.problem is not None:
        title = session.problem.title
        slug = session.problem.slug
        difficulty = session.problem.difficulty
    scenario = session.scenario if isinstance(getattr(session, "scenario", None), dict) else None
    if (_is_system_design(session) or _is_behavioral(session)) and scenario:
        title = str(scenario.get("title") or title)
        slug = str(session.scenario_slug or scenario.get("slug") or slug)
        difficulty = str(scenario.get("difficulty") or difficulty)
    messages = [
        message
        for message in _sorted_messages(session)
        if not _is_problem_handout(message.content, problem)
    ]
    return InterviewSessionOut(
        id=session.id,
        problem_id=session.problem_id,
        problem_title=title,
        problem_slug=slug,
        difficulty=difficulty,
        kind=getattr(session, "kind", None) or InterviewKind.CODING.value,
        scenario_slug=getattr(session, "scenario_slug", None),
        scenario=scenario,
        architecture=getattr(session, "architecture", None),
        phase=session.phase,
        phase_label=PHASE_LABELS.get(session.phase, session.phase.title()),
        duration_seconds=session.duration_seconds,
        remaining_seconds=remaining_seconds(session),
        hints_used=session.hints_used,
        run_count=session.run_count,
        submit_count=session.submit_count,
        accepted=bool(session.accepted),
        wrong_attempts=session.wrong_attempts,
        last_run_passed=session.last_run_passed,
        last_run_total=session.last_run_total,
        last_runtime_ms=session.last_runtime_ms,
        last_memory_kb=session.last_memory_kb,
        last_status=session.last_status,
        started_at=session.started_at,
        ended_at=session.ended_at,
        completed=session.ended_at is not None or session.phase == InterviewPhase.FEEDBACK.value,
        interviewer_name=interviewer_name(session),
        interviewer_warning=getattr(session, "interviewer_warning", None),
        messages=messages,
        feedback=_feedback_out(session.feedback) if session.feedback else None,
    )


def serialize(db: Session, session: InterviewSession) -> InterviewSessionOut:
    problem = db.get(Problem, session.problem_id) if session.problem_id else None
    return to_out(session, problem)


def build_problem_context(problem: Problem) -> str:
    examples = []
    for index, example in enumerate(problem.examples or [], start=1):
        if not isinstance(example, dict):
            continue
        examples.append(
            f"Example {index}: input={example.get('input', '')}; "
            f"output={example.get('output', '')}; "
            f"explanation={example.get('explanation', '')}"
        )
    tags = ", ".join(tag.name for tag in (problem.tags or []))
    return (
        f"Title: {problem.title}\n"
        f"Difficulty: {problem.difficulty}\n"
        f"Topics: {tags or 'n/a'}\n"
        f"Description:\n{problem.description}\n"
        f"Constraints:\n{problem.constraints}\n"
        f"Input format:\n{problem.input_format}\n"
        f"Output format:\n{problem.output_format}\n"
        f"Examples:\n" + ("\n".join(examples) or "None listed.")
    )


def _complete(db: Session, session: InterviewSession, problem: Problem | None) -> None:
    session.phase = InterviewPhase.FEEDBACK.value
    session.ended_at = session.ended_at or _now()
    if _is_system_design(session):
        from app.interviews import system_design

        session.feedback = system_design.build_feedback(session)
    elif _is_behavioral(session):
        from app.interviews import behavioral

        session.feedback = behavioral.build_feedback(session)
    else:
        if problem is None:
            raise AppError("Interview problem is missing.", status_code=500, code="internal_error")
        session.feedback = _build_feedback(problem, session)
    db.commit()
    db.refresh(session)


def _expire_if_needed(db: Session, session: InterviewSession) -> None:
    if session.ended_at is not None or session.is_preview:
        return
    if remaining_seconds(session) > 0:
        return
    problem = _get_problem(db, session.problem_id) if session.problem_id else None
    _add_event(session, InterviewEventType.TIMEOUT, {})
    _add_message(session, InterviewMessageRole.INTERVIEWER, TIME_UP_MESSAGE)
    _complete(db, session, problem)


def _will_advance(session: InterviewSession, phase: str, text: str) -> bool:
    """Decide the phase change before the interviewer speaks, so the reply can hand off naturally."""
    if phase == InterviewPhase.UNDERSTANDING.value:
        # First candidate turn stays on requirements; the problem was just handed over.
        if session.candidate_turns < 2:
            return False
        # Keep answering clarifying questions, within reason.
        still_asking = text.rstrip().endswith("?") and session.candidate_turns < 4
        return not still_asking
    if phase == InterviewPhase.APPROACH.value:
        return "approach" in infer_signals(text) or session.phase_turns >= 3
    return False


def _candidate_note(phase: str, advancing: bool) -> str:
    note = f"Candidate just spoke. Current phase: {phase}."
    if not advancing:
        return note
    if phase == InterviewPhase.UNDERSTANDING.value:
        return note + " Requirements are settled: answer anything pending, then ask how they would approach it."
    if phase == InterviewPhase.APPROACH.value:
        return note + (
            " Coding is next. Unless the approach is plain brute force and worth one 'can you do better?' probe, "
            "tell them to go ahead and implement it."
        )
    return note


def _advance_after_candidate(session: InterviewSession, phase_before: str, advancing: bool) -> None:
    if not advancing:
        return
    if phase_before == InterviewPhase.UNDERSTANDING.value:
        _set_phase(session, InterviewPhase.APPROACH.value)
    elif phase_before == InterviewPhase.APPROACH.value:
        _set_phase(session, InterviewPhase.CODING.value)


def _set_phase(session: InterviewSession, phase: str) -> None:
    if session.phase != phase:
        session.phase = phase
        session.phase_turns = 0


def _with_code(payload: dict, source_code: str | None) -> dict:
    code = (source_code or "").strip("\n")
    if code.strip():
        payload["code"] = code[:MAX_CODE_CHARS]
    return payload


def _latest_code(problem: Problem, session: InterviewSession) -> str:
    """Most recent editor snapshot, numbered like the candidate's editor. Empty until they change the starter."""
    events = sorted(session.events, key=lambda item: _aware(item.created_at) if item.created_at else _now())
    for event in reversed(events):
        code = (event.payload or {}).get("code")
        if not code:
            continue
        if code.strip() == (problem.starter_code or "").strip():
            return ""
        return "\n".join(f"{index:>3}  {line}" for index, line in enumerate(code.split("\n"), start=1))
    return ""


def _agent(session: InterviewSession) -> MockInterviewAgent:
    from sqlalchemy.orm import object_session

    from app.users.models import User

    db = object_session(session)
    user = db.get(User, session.user_id) if db is not None and session.user_id else None
    kind = (
        InterviewKind.SYSTEM_DESIGN
        if _is_system_design(session)
        else InterviewKind.BEHAVIORAL
        if _is_behavioral(session)
        else InterviewKind.CODING
    )
    return MockInterviewAgent(get_llm_provider_for_user(user), kind=kind)


def _interview_context(
    problem: Problem,
    session: InterviewSession,
    *,
    event_note: str,
    fallback: str,
    last_candidate_text: str = "",
    allow_hint_nudge: bool = False,
    last_event: str | None = None,
    will_advance: bool | None = None,
) -> InterviewContext:
    return InterviewContext(
        kind=InterviewKind.SYSTEM_DESIGN if _is_system_design(session) else InterviewKind.CODING,
        phase=session.phase,
        problem=ProblemSnapshot(
            title=problem.title,
            difficulty=problem.difficulty,
            description=problem.description,
            constraints=problem.constraints,
            input_format=problem.input_format,
            output_format=problem.output_format,
            examples=list(problem.examples or []),
            tags=[tag.name for tag in (problem.tags or [])],
            public_context=build_problem_context(problem),
        ),
        transcript=_transcript(session),
        signals=normalize_signals(session.signals),
        sandbox=SandboxSnapshot(
            status=session.last_status,
            passed=session.last_run_passed,
            total=session.last_run_total,
            runtime_ms=session.last_runtime_ms,
            memory_kb=session.last_memory_kb,
            accepted=bool(session.accepted),
            run_count=session.run_count,
            submit_count=session.submit_count,
            last_event=last_event,
        ),
        hints_used=session.hints_used,
        wrong_attempts=session.wrong_attempts,
        remaining_seconds=remaining_seconds(session),
        candidate_turns=session.candidate_turns,
        followups_asked=session.followups_asked,
        is_preview=bool(session.is_preview),
        event_note=event_note,
        fallback=fallback,
        last_candidate_text=last_candidate_text,
        allow_hint_nudge=allow_hint_nudge,
        phase_turns=session.phase_turns,
        interviewer_name=interviewer_name(session),
        candidate_code=_latest_code(problem, session),
        will_advance=will_advance,
    )


def _ask_interviewer(
    problem: Problem,
    session: InterviewSession,
    *,
    event_note: str,
    fallback: str,
    last_candidate_text: str = "",
    allow_hint_nudge: bool = False,
    last_event: str | None = None,
    will_advance: bool | None = None,
) -> str:
    turn = _agent(session).respond(
        _interview_context(
            problem,
            session,
            event_note=event_note,
            fallback=fallback,
            last_candidate_text=last_candidate_text,
            allow_hint_nudge=allow_hint_nudge,
            last_event=last_event,
            will_advance=will_advance,
        )
    )
    session.signals = turn.signals
    if turn.error:
        # Transient, not a column: lets the UI say the line was canned instead of pretending.
        session.interviewer_warning = (
            f"The AI interviewer could not be reached ({turn.error[:200]}). "
            "That reply was a stock line — check your AI provider in Settings."
        )
    return turn.reply


def _transcript(session: InterviewSession) -> list[dict[str, str]]:
    messages = _sorted_messages(session)
    mapped: list[dict[str, str]] = []
    for message in messages[-30:]:
        role = "assistant" if message.role == InterviewMessageRole.INTERVIEWER.value else "user"
        mapped.append({"role": role, "content": message.content})
    return mapped


def _build_feedback(problem: Problem, session: InterviewSession) -> dict:
    objective = _objective(session)
    ai_scores = _ai_scores(problem, session, objective)
    correctness = objective["correctness"]
    overall = round(
        correctness * 0.28
        + ai_scores["understanding"] * 0.12
        + ai_scores["approach"] * 0.14
        + ai_scores["coding"] * 0.12
        + ai_scores["communication"] * 0.10
        + ai_scores["reasoning"] * 0.08
        + ai_scores["complexity"] * 0.08
        + ai_scores["follow_up"] * 0.08,
        1,
    )
    strengths = ai_scores.get("strengths") or _default_strengths(session, objective)
    improvements = ai_scores.get("improvements") or _default_improvements(session, objective)
    summary = ai_scores.get("summary") or _default_summary(problem, session, overall)
    return {
        "overall": overall,
        "scores": {
            "understanding": ai_scores["understanding"],
            "approach": ai_scores["approach"],
            "coding": ai_scores["coding"],
            "correctness": correctness,
            "complexity": ai_scores["complexity"],
            "communication": ai_scores["communication"],
            "reasoning": ai_scores["reasoning"],
            "follow_up": ai_scores["follow_up"],
            "overall": overall,
        },
        "objective": {
            "tests_passed": session.last_run_passed,
            "tests_total": session.last_run_total,
            "submission_accepted": bool(session.accepted),
            "submissions": session.submit_count,
            "wrong_attempts": session.wrong_attempts,
            "hints_used": session.hints_used,
            "time_taken_seconds": time_taken_seconds(session),
            "runtime_ms": session.last_runtime_ms,
            "memory_kb": session.last_memory_kb,
        },
        "strengths": strengths[:4],
        "improvements": improvements[:4],
        "summary": summary,
    }


def _objective(session: InterviewSession) -> dict:
    if session.accepted:
        correctness = 10.0
    elif session.last_run_total:
        correctness = round(10 * session.last_run_passed / session.last_run_total, 1)
    else:
        correctness = 0.0
    return {"correctness": correctness}


def _ai_scores(problem: Problem, session: InterviewSession, objective: dict) -> dict:
    fallback = _heuristic_scores(session)
    scored = _agent(session).evaluate(
        problem_title=problem.title,
        difficulty=problem.difficulty,
        transcript=_plain_transcript(session),
        signals=normalize_signals(session.signals),
        objective=objective,
        heuristic=fallback,
        accepted=bool(session.accepted),
        last_run_passed=session.last_run_passed,
        last_run_total=session.last_run_total,
        submissions=session.submit_count,
        wrong_attempts=session.wrong_attempts,
        hints_used=session.hints_used,
        candidate_turns=session.candidate_turns,
        followups_asked=session.followups_asked,
        final_code=_latest_code(problem, session),
    )
    return {
        "understanding": _clamp(scored.get("understanding"), fallback["understanding"]),
        "approach": _clamp(scored.get("approach"), fallback["approach"]),
        "coding": _clamp(scored.get("coding"), fallback["coding"]),
        "communication": _clamp(scored.get("communication"), fallback["communication"]),
        "reasoning": _clamp(scored.get("reasoning"), fallback["reasoning"]),
        "complexity": _clamp(scored.get("complexity"), fallback["complexity"]),
        "follow_up": _clamp(scored.get("follow_up"), fallback["follow_up"]),
        "strengths": [str(item) for item in (scored.get("strengths") or []) if str(item).strip()],
        "improvements": [str(item) for item in (scored.get("improvements") or []) if str(item).strip()],
        "summary": str(scored.get("summary") or "").strip(),
    }


def _heuristic_scores(session: InterviewSession) -> dict:
    signals = normalize_signals(session.signals)
    understood = 8.0 if session.candidate_turns else 4.0
    approach = 8.0 if session.candidate_turns >= 2 else 5.5
    coding = 8.5 if session.accepted else (6.0 if session.run_count else 4.5)
    communication = min(9.0, 5.5 + session.candidate_turns * 0.6)
    reasoning = min(9.0, 5.0 + session.candidate_turns * 0.5)
    complexity = 7.5 if session.followups_asked or signals.get("complexity") == "demonstrated" else 5.5
    follow_up = 7.5 if session.followups_asked >= 2 else (6.0 if session.followups_asked else 4.5)
    if signals.get("requirements") == "demonstrated":
        understood = max(understood, 8.0)
    if signals.get("approach") == "demonstrated":
        approach = max(approach, 8.0)
    if signals.get("reasoning") == "demonstrated":
        reasoning = max(reasoning, 7.5)
    if session.hints_used >= 2:
        approach = max(4.0, approach - 1)
        reasoning = max(4.0, reasoning - 0.5)
    return {
        "understanding": understood,
        "approach": approach,
        "coding": coding,
        "communication": communication,
        "reasoning": reasoning,
        "complexity": complexity,
        "follow_up": follow_up,
        "strengths": _default_strengths(session, _objective(session)),
        "improvements": _default_improvements(session, _objective(session)),
        "summary": "",
    }


def _default_strengths(session: InterviewSession, objective: dict) -> list[str]:
    items: list[str] = []
    if session.candidate_turns:
        items.append("Explained the problem before jumping into code.")
    if session.candidate_turns >= 2:
        items.append("Outlined an approach and reasoning before implementing.")
    if session.accepted:
        items.append("Produced a correct accepted solution.")
    elif objective["correctness"] >= 7:
        items.append("Got most of the visible tests passing.")
    if session.hints_used == 0:
        items.append("Worked through the interview without relying on hints.")
    return items or ["Stayed engaged with the interviewer throughout the session."]


def _default_improvements(session: InterviewSession, _objective: dict) -> list[str]:
    items: list[str] = []
    if session.candidate_turns < 2:
        items.append("Talk through the approach out loud before coding.")
    if not session.followups_asked:
        items.append("Discuss time and space complexity more explicitly.")
    if session.wrong_attempts:
        items.append("Walk through edge cases before submitting.")
    if session.hints_used:
        items.append("Try to push further on your own before asking for a hint.")
    if session.candidate_turns > 6:
        items.append("Keep explanations tighter so more time is left for coding.")
    return items[:3] or ["Discuss edge cases and complexity a bit earlier next time."]


def _default_summary(problem: Problem, session: InterviewSession, overall: float) -> str:
    if session.accepted:
        return (
            f"Your solution to {problem.title} was accepted and your reasoning was generally clear. "
            f"Overall this was a {overall}/10 interview. Tighten the complexity discussion and "
            "call out edge cases a little earlier next time."
        )
    if session.last_run_total and session.last_run_passed == session.last_run_total:
        return (
            f"Sample tests passed on {problem.title}, but the full submission was not accepted. "
            "Walk through remaining edge cases before you submit."
        )
    return (
        f"We did not get to a fully accepted solution on {problem.title}. "
        "Focus on restating the problem, locking an approach, then testing edge cases as you code."
    )


def _progressive_hint(problem: Problem, n: int) -> str | None:
    hints = [str(item).strip() for item in (problem.hints or []) if str(item).strip()]
    if n <= len(hints):
        return hints[n - 1]
    canned = [
        "Think about how you could represent each group so matching items land together.",
        "What property do all strings in the same group share after you normalize them?",
        "Once you have a grouping key, what structure lets you collect members in one pass?",
    ]
    index = n - len(hints) - 1
    if 0 <= index < len(canned):
        return canned[index]
    return None


READY_REQUIREMENTS_PROMPT = (
    "Great. Before you get into a solution — any clarifying questions about the inputs, outputs, or constraints?"
)
CLOSING_INVITE = (
    "Okay, that's everything I wanted to cover on the technical side. "
    "We have a few minutes left — what questions do you have for me?"
)
CLOSING_GOODBYE = (
    "Thanks — and thanks for your time today. I enjoyed working through this with you. "
    "I'll write up my feedback now."
)
TIME_UP_MESSAGE = (
    "We're at time, so let's stop here. Thanks for working through this with me — I'll write up my feedback now."
)


def build_opening_messages(problem: Problem, name: str = INTERVIEWER_NAMES[0]) -> list[str]:
    """Deterministic opening. The problem is shown in the workspace, not pasted into chat."""
    del problem  # title is visible in the problem pane
    return [
        (
            f"Hi, I'm {name} — I'm a senior software engineer, and I'll be your interviewer today. "
            "We have about 45 minutes: one coding problem, some follow-up discussion, "
            "and I'll leave a few minutes at the end for your questions."
        ),
        (
            "I care more about how you think than how fast you type, so please think out loud. "
            "Ask me clarifying questions whenever you need to, and talk me through your approach before you start coding. "
            "The problem is up in your workspace now — take a minute to read it, and let me know when you're ready."
        ),
    ]


def _reply_after_candidate(
    problem: Problem,
    session: InterviewSession,
    text: str,
    *,
    event_note: str,
    will_advance: bool | None = None,
) -> str:
    # A bare "I'm ready" gets the standard handoff; anything substantive gets a real reply.
    if (
        session.phase == InterviewPhase.UNDERSTANDING.value
        and session.candidate_turns == 1
        and _READY_ONLY.match(text)
    ):
        return READY_REQUIREMENTS_PROMPT
    return _ask_interviewer(
        problem,
        session,
        event_note=event_note,
        fallback=_fallback_after_message(problem, session.phase),
        last_candidate_text=text,
        will_advance=will_advance,
    )


def _fallback_intro(problem: Problem) -> str:
    return build_opening_messages(problem)[0]


def _fallback_after_message(problem: Problem, phase: str) -> str:
    if phase == InterviewPhase.UNDERSTANDING.value:
        return (
            "Any questions on the requirements or constraints? "
            "If not, walk me through the problem in your own words."
        )
    if phase == InterviewPhase.APPROACH.value:
        return (
            "That sounds workable. What edge cases should we watch for? "
            "When you're ready, go ahead and implement your approach."
        )
    if phase == InterviewPhase.CODING.value:
        return "Alright. Implement that in the editor, then run it when you want a first signal."
    if phase == InterviewPhase.TESTING.value:
        return "Before we move on, what's the time and space complexity of your solution?"
    if phase == InterviewPhase.FOLLOW_UP.value:
        return "If the input grew significantly, would you change the approach? Why or why not?"
    return f"Take a moment with {problem.title}, then walk me through your thinking."


def _fallback_after_run(passed: int, total: int) -> str:
    if total and passed == total:
        return "Your tests are passing. Before we move on, what's the space complexity of your solution?"
    if total:
        return "Some of the sample tests didn't pass. Walk me through what you think is going wrong."
    return "The run didn't produce a clean result. Take another look and tell me what you notice."


def _fallback_after_submit(accepted: bool) -> str:
    if accepted:
        return "Your solution was accepted. Let's talk through a couple of follow-ups. What's the time complexity, and why?"
    return "One or more test cases are failing. Take another look at your implementation."


def _feedback_out(raw: dict) -> InterviewFeedbackOut:
    scores = raw.get("scores") or {}
    objective = raw.get("objective") or {}
    return InterviewFeedbackOut(
        overall=float(raw.get("overall") or scores.get("overall") or 0),
        scores=InterviewScoresOut(
            understanding=float(scores.get("understanding") or 0),
            approach=float(scores.get("approach") or 0),
            coding=float(scores.get("coding") or 0),
            correctness=float(scores.get("correctness") or 0),
            complexity=float(scores.get("complexity") or 0),
            communication=float(scores.get("communication") or 0),
            reasoning=float(scores.get("reasoning") or 0),
            follow_up=float(scores.get("follow_up") or 0),
            overall=float(scores.get("overall") or raw.get("overall") or 0),
        ),
        objective=InterviewObjectiveOut(
            tests_passed=int(objective.get("tests_passed") or 0),
            tests_total=int(objective.get("tests_total") or 0),
            submission_accepted=bool(objective.get("submission_accepted")),
            submissions=int(objective.get("submissions") or 0),
            wrong_attempts=int(objective.get("wrong_attempts") or 0),
            hints_used=int(objective.get("hints_used") or 0),
            time_taken_seconds=int(objective.get("time_taken_seconds") or 0),
            runtime_ms=objective.get("runtime_ms"),
            memory_kb=objective.get("memory_kb"),
        ),
        strengths=list(raw.get("strengths") or []),
        improvements=list(raw.get("improvements") or []),
        summary=str(raw.get("summary") or ""),
    )


def _is_problem_handout(content: str, problem: Problem | None) -> bool:
    if problem is None or not content:
        return False
    text = content.strip()
    first = text.split("\n", 1)[0].strip()
    if first != problem.title.strip():
        return False
    return "Constraints:" in text or (problem.description or "")[:48] in text


def _sorted_messages(session: InterviewSession) -> list[InterviewMessage]:
    return sorted(session.messages, key=lambda item: _aware(item.created_at) if item.created_at else datetime.min.replace(tzinfo=timezone.utc))


def _plain_transcript(session: InterviewSession) -> str:
    lines = []
    for message in _sorted_messages(session):
        who = "Interviewer" if message.role == InterviewMessageRole.INTERVIEWER.value else "Candidate"
        lines.append(f"{who}: {message.content}")
    return "\n".join(lines) or "(no dialogue)"


def _clamp(value: object, default: float) -> float:
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default
    return max(1.0, min(10.0, round(number, 1)))


def _add_message(session: InterviewSession, role: InterviewMessageRole, content: str) -> InterviewMessage:
    message = InterviewMessage(
        session_id=session.id,
        role=role.value,
        content=content,
        created_at=_now(),
    )
    session.messages.append(message)
    return message


def _add_event(session: InterviewSession, event_type: InterviewEventType, payload: dict | None = None) -> InterviewEvent:
    event = InterviewEvent(
        session_id=session.id,
        type=event_type.value,
        payload=payload,
        created_at=_now(),
    )
    session.events.append(event)
    return event


def _open_new_session(
    db: Session,
    problem: Problem,
    user_id: UUID | None,
    *,
    is_preview: bool,
) -> InterviewSession:
    settings = get_settings()
    session = InterviewSession(
        user_id=user_id,
        problem_id=problem.id,
        kind=InterviewKind.CODING.value,
        phase=InterviewPhase.INTRO.value,
        duration_seconds=settings.interview_duration_seconds,
        is_preview=is_preview,
        signals=empty_signals(),
        started_at=_now(),
    )
    db.add(session)
    db.flush()
    _add_event(session, InterviewEventType.MESSAGE, {"kind": "start", "preview": is_preview})
    for text in build_opening_messages(problem, interviewer_name(session)):
        _add_message(session, InterviewMessageRole.INTERVIEWER, text)
    session.phase = InterviewPhase.UNDERSTANDING.value
    db.commit()
    db.refresh(session)
    return session


def _load_preview_session(db: Session, session_id: UUID) -> InterviewSession:
    session = db.scalar(
        select(InterviewSession)
        .options(selectinload(InterviewSession.messages), selectinload(InterviewSession.events))
        .where(InterviewSession.id == session_id, InterviewSession.is_preview.is_(True))
    )
    if session is None:
        raise NotFoundError("Interview session not found.")
    return session


def _get_problem(db: Session, problem_id: UUID) -> Problem:
    problem = db.get(Problem, problem_id)
    if problem is None or not problem.is_active:
        raise NotFoundError("Problem not found.")
    return problem


def _load_session(db: Session, session_id: UUID, user_id: UUID) -> InterviewSession:
    session = db.scalar(
        select(InterviewSession)
        .options(selectinload(InterviewSession.messages), selectinload(InterviewSession.events))
        .where(InterviewSession.id == session_id)
    )
    if session is None:
        raise NotFoundError("Interview session not found.")
    if session.user_id != user_id:
        raise ForbiddenError("You do not have access to this interview.")
    return session


def _is_system_design(session: InterviewSession) -> bool:
    return getattr(session, "kind", InterviewKind.CODING.value) == InterviewKind.SYSTEM_DESIGN.value


def _is_behavioral(session: InterviewSession) -> bool:
    return getattr(session, "kind", InterviewKind.CODING.value) == InterviewKind.BEHAVIORAL.value


def _ensure_open(session: InterviewSession) -> None:
    if session.ended_at is not None or session.phase == InterviewPhase.FEEDBACK.value:
        raise AppError("This interview has already ended.", status_code=409, code="interview_ended")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value
