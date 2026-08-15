"""Interview session state machine. Gemma writes interviewer lines only."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.common.config import get_settings
from app.common.enums import InterviewEventType, InterviewMessageRole, InterviewPhase
from app.common.errors import AppError, ForbiddenError, NotFoundError
from app.interviews import ollama
from app.interviews.models import InterviewEvent, InterviewMessage, InterviewSession
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
    InterviewPhase.FEEDBACK.value: "Feedback",
}

PHASE_GUIDANCE = {
    InterviewPhase.INTRO.value: (
        "Open the interview. Name the problem. Ask the candidate to explain it in their own words. "
        "Do not restate the full problem statement."
    ),
    InterviewPhase.UNDERSTANDING.value: (
        "They are explaining the problem. Acknowledge briefly. Ask one question about constraints "
        "or an edge case if they skipped it, then ask what approach they would consider."
    ),
    InterviewPhase.APPROACH.value: (
        "They are describing an approach. Ask why they chose a data structure or how they handle one "
        "edge case. If the approach is workable, tell them to implement it. Never write the algorithm."
    ),
    InterviewPhase.CODING.value: (
        "They are implementing. Do not write code. Ask a short clarifying question or invite them "
        "to run their tests when ready."
    ),
    InterviewPhase.TESTING.value: (
        "Sample tests have been run. Use the authoritative result given to you. Ask about complexity "
        "or a remaining edge case. Do not contradict the test result."
    ),
    InterviewPhase.FOLLOW_UP.value: (
        "The submission result is authoritative. Ask one follow-up: time/space complexity, a tradeoff, "
        "or an alternative. Keep it concise."
    ),
    InterviewPhase.FEEDBACK.value: "The interview is over. Do not continue chatting.",
}


def start_session(db: Session, user_id: UUID, problem_id: UUID) -> InterviewSession:
    problem = _get_problem(db, problem_id)
    existing = get_active_session(db, user_id, problem_id)
    if existing is not None and existing.ended_at is None:
        return existing

    settings = get_settings()
    session = InterviewSession(
        user_id=user_id,
        problem_id=problem.id,
        phase=InterviewPhase.INTRO.value,
        duration_seconds=settings.interview_duration_seconds,
        started_at=_now(),
    )
    db.add(session)
    db.flush()
    _add_event(session, InterviewEventType.MESSAGE, {"kind": "start"})
    intro = _ask_interviewer(
        problem,
        session,
        event_note="The interview is starting. Give your opening.",
        fallback=_fallback_intro(problem),
    )
    _add_message(session, InterviewMessageRole.INTERVIEWER, intro)
    session.phase = InterviewPhase.UNDERSTANDING.value
    db.commit()
    db.refresh(session)
    return _load_session(db, session.id, user_id)


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


def add_candidate_message(db: Session, session_id: UUID, user_id: UUID, content: str) -> InterviewSession:
    session = get_session(db, session_id, user_id)
    _ensure_open(session)
    problem = _get_problem(db, session.problem_id)
    text = content.strip()
    _add_message(session, InterviewMessageRole.CANDIDATE, text)
    session.candidate_turns += 1
    _add_event(session, InterviewEventType.MESSAGE, {"role": "CANDIDATE"})

    current = session.phase
    if current == InterviewPhase.FOLLOW_UP.value and session.followups_asked >= 2:
        reply = _ask_interviewer(
            problem,
            session,
            event_note="They answered your last follow-up. Close briefly; feedback is next.",
            fallback="That's a solid wrap-up. I'll share feedback now.",
        )
        _add_message(session, InterviewMessageRole.INTERVIEWER, reply)
        _complete(db, session, problem)
        return session

    reply = _ask_interviewer(
        problem,
        session,
        event_note=f"Candidate just spoke. Current phase: {current}.",
        fallback=_fallback_after_message(problem, current),
    )
    _add_message(session, InterviewMessageRole.INTERVIEWER, reply)
    if current == InterviewPhase.FOLLOW_UP.value:
        session.followups_asked += 1
    _advance_after_candidate(session, current)
    db.commit()
    db.refresh(session)
    return session


def request_hint(db: Session, session_id: UUID, user_id: UUID) -> InterviewSession:
    session = get_session(db, session_id, user_id)
    _ensure_open(session)
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
) -> InterviewSession:
    session = get_session(db, session_id, user_id)
    _ensure_open(session)
    problem = _get_problem(db, session.problem_id)
    accepted = status == "ACCEPTED"

    session.last_status = status
    session.last_run_passed = passed
    session.last_run_total = total
    session.last_runtime_ms = runtime_ms
    session.last_memory_kb = memory_kb

    if event_type == InterviewEventType.RUN.value:
        session.run_count += 1
        if passed == total and total > 0 and session.phase == InterviewPhase.CODING.value:
            session.phase = InterviewPhase.TESTING.value
        note = (
            f"AUTHORITATIVE run result: {status}. {passed}/{total} visible tests passed. "
            f"Runtime {runtime_ms}ms. Do not contradict this. Do not invent hidden tests."
        )
        fallback = _fallback_after_run(passed, total)
    elif event_type == InterviewEventType.SUBMIT.value:
        session.submit_count += 1
        if accepted:
            session.accepted = 1
            session.phase = InterviewPhase.FOLLOW_UP.value
        else:
            session.wrong_attempts += 1
            if session.phase == InterviewPhase.TESTING.value:
                session.phase = InterviewPhase.CODING.value
        note = (
            f"AUTHORITATIVE submit result: {status}. {passed}/{total} tests passed. "
            "Do not reveal hidden test details. Do not rewrite their code."
        )
        fallback = _fallback_after_submit(accepted)
    else:
        raise AppError("Unsupported interview event.", status_code=400, code="bad_request")

    _add_event(
        session,
        InterviewEventType(event_type),
        {"status": status, "passed": passed, "total": total, "runtime_ms": runtime_ms, "memory_kb": memory_kb},
    )
    reply = _ask_interviewer(problem, session, event_note=note, fallback=fallback)
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
    problem = _get_problem(db, session.problem_id)
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
    messages = _sorted_messages(session)
    return InterviewSessionOut(
        id=session.id,
        problem_id=session.problem_id,
        problem_title=title,
        problem_slug=slug,
        difficulty=difficulty,
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
        messages=messages,
        feedback=_feedback_out(session.feedback) if session.feedback else None,
    )


def serialize(db: Session, session: InterviewSession) -> InterviewSessionOut:
    problem = db.get(Problem, session.problem_id)
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


def _complete(db: Session, session: InterviewSession, problem: Problem) -> None:
    session.phase = InterviewPhase.FEEDBACK.value
    session.ended_at = session.ended_at or _now()
    session.feedback = _build_feedback(problem, session)
    db.commit()
    db.refresh(session)


def _expire_if_needed(db: Session, session: InterviewSession) -> None:
    if session.ended_at is not None:
        return
    if remaining_seconds(session) > 0:
        return
    problem = _get_problem(db, session.problem_id)
    _add_event(session, InterviewEventType.TIMEOUT, {})
    _add_message(session, InterviewMessageRole.INTERVIEWER, "Interview time has ended.")
    _complete(db, session, problem)


def _advance_after_candidate(session: InterviewSession, phase_before: str) -> None:
    if phase_before == InterviewPhase.UNDERSTANDING.value:
        session.phase = InterviewPhase.APPROACH.value
    elif phase_before == InterviewPhase.APPROACH.value:
        session.phase = InterviewPhase.CODING.value


def _ask_interviewer(problem: Problem, session: InterviewSession, *, event_note: str, fallback: str) -> str:
    system = _system_prompt(problem, session)
    transcript = _transcript(session)
    try:
        return ollama.interviewer_reply(system, transcript, event_note)
    except Exception:
        return fallback


def _system_prompt(problem: Problem, session: InterviewSession) -> str:
    return (
        "You are a live technical interviewer at InterviewAnvil. Speak like a senior engineer "
        "sitting beside the candidate — not like a chatbot, tutor, or coding assistant.\n"
        "Rules:\n"
        "- Ask exactly one question at a time.\n"
        "- Keep replies to 1–3 short sentences.\n"
        "- Encourage the candidate to explain reasoning.\n"
        "- Never write solution code or an optimal algorithm.\n"
        "- Never invent constraints or hidden test cases.\n"
        "- Never reveal hidden tests or expected outputs that were not already shown.\n"
        "- Give only a small nudge if they ask for a hint.\n"
        "- Do not decide whether code is correct; trust the authoritative execution result when given.\n"
        f"Current phase: {PHASE_LABELS.get(session.phase, session.phase)}. {PHASE_GUIDANCE[session.phase]}\n"
        f"Hints used: {session.hints_used}. Candidate turns: {session.candidate_turns}.\n\n"
        "Problem (public statement only):\n"
        f"{build_problem_context(problem)}"
    )


def _transcript(session: InterviewSession) -> list[dict[str, str]]:
    messages = _sorted_messages(session)
    mapped: list[dict[str, str]] = []
    for message in messages[-12:]:
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
    prompt = (
        "Score this mock interview. Return JSON only with keys: "
        "understanding, approach, coding, communication, reasoning, complexity, follow_up "
        "(numbers 1-10), strengths (2-3 short strings), improvements (2-3 short strings), summary "
        "(2-4 sentences in the interviewer's voice).\n"
        "Do not score correctness — that is measured by tests.\n"
        f"Problem: {problem.title} ({problem.difficulty}).\n"
        f"Objective: accepted={bool(session.accepted)}, last_tests={session.last_run_passed}/"
        f"{session.last_run_total}, submissions={session.submit_count}, "
        f"wrong_attempts={session.wrong_attempts}, hints={session.hints_used}, "
        f"candidate_turns={session.candidate_turns}, followups={session.followups_asked}.\n"
        f"Transcript:\n{_plain_transcript(session)}"
    )
    try:
        data = ollama.evaluate_interview(
            "You evaluate a completed technical interview. Return JSON only. No markdown.",
            prompt,
        )
        return {
            "understanding": _clamp(data.get("understanding"), fallback["understanding"]),
            "approach": _clamp(data.get("approach"), fallback["approach"]),
            "coding": _clamp(data.get("coding"), fallback["coding"]),
            "communication": _clamp(data.get("communication"), fallback["communication"]),
            "reasoning": _clamp(data.get("reasoning"), fallback["reasoning"]),
            "complexity": _clamp(data.get("complexity"), fallback["complexity"]),
            "follow_up": _clamp(data.get("follow_up"), fallback["follow_up"]),
            "strengths": [str(item) for item in (data.get("strengths") or []) if str(item).strip()],
            "improvements": [str(item) for item in (data.get("improvements") or []) if str(item).strip()],
            "summary": str(data.get("summary") or "").strip(),
        }
    except Exception:
        return fallback


def _heuristic_scores(session: InterviewSession) -> dict:
    understood = 8.0 if session.candidate_turns else 4.0
    approach = 8.0 if session.candidate_turns >= 2 else 5.5
    coding = 8.5 if session.accepted else (6.0 if session.run_count else 4.5)
    communication = min(9.0, 5.5 + session.candidate_turns * 0.6)
    reasoning = min(9.0, 5.0 + session.candidate_turns * 0.5)
    complexity = 7.5 if session.followups_asked else 5.5
    follow_up = 7.5 if session.followups_asked >= 2 else (6.0 if session.followups_asked else 4.5)
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


def _fallback_intro(problem: Problem) -> str:
    return (
        f"Let's work through {problem.title}. Take a moment to understand the problem. "
        "When you're ready, explain it back to me in your own words."
    )


def _fallback_after_message(problem: Problem, phase: str) -> str:
    if phase == InterviewPhase.UNDERSTANDING.value:
        return "Good. What approach would you consider, and why that data structure?"
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


def _ensure_open(session: InterviewSession) -> None:
    if session.ended_at is not None or session.phase == InterviewPhase.FEEDBACK.value:
        raise AppError("This interview has already ended.", status_code=409, code="interview_ended")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value
