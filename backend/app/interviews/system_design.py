"""System design mock-interview session flow."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.common.config import get_settings
from app.common.enums import InterviewEventType, InterviewKind, InterviewMessageRole, InterviewPhase
from app.common.errors import AppError, NotFoundError
from app.interviews.agent import (
    ArchitectureSnapshot,
    InterviewContext,
    InterviewKind as AgentKind,
    MockInterviewAgent,
    ProblemSnapshot,
    SandboxSnapshot,
    ScenarioSnapshot,
)
from app.interviews.architecture import (
    architecture_quality,
    empty_architecture,
    has_core_shape,
    normalize_architecture,
    summarize_architecture,
)
from app.interviews.models import InterviewSession
from app.interviews.providers import get_llm_provider_for_user
from app.interviews.scenarios import get_scenario, public_scenario, scenario_context
from app.interviews.signals import empty_signals, normalize_signals

SD_PHASE_LABELS = {
    InterviewPhase.REQUIREMENTS.value: "Requirements",
    InterviewPhase.CAPACITY.value: "Capacity Estimation",
    InterviewPhase.HIGH_LEVEL.value: "High-Level Design",
    InterviewPhase.DEEP_DIVE.value: "Deep Dive",
    InterviewPhase.SCALABILITY.value: "Scalability",
    InterviewPhase.RELIABILITY.value: "Reliability",
    InterviewPhase.TRADEOFFS.value: "Trade-offs",
    InterviewPhase.FEEDBACK.value: "Feedback",
}

SD_PHASE_ORDER = (
    InterviewPhase.REQUIREMENTS.value,
    InterviewPhase.CAPACITY.value,
    InterviewPhase.HIGH_LEVEL.value,
    InterviewPhase.DEEP_DIVE.value,
    InterviewPhase.SCALABILITY.value,
    InterviewPhase.RELIABILITY.value,
    InterviewPhase.TRADEOFFS.value,
)

SD_MIN_TURNS = {
    InterviewPhase.REQUIREMENTS.value: 2,
    InterviewPhase.CAPACITY.value: 1,
    InterviewPhase.HIGH_LEVEL.value: 2,
    InterviewPhase.DEEP_DIVE.value: 2,
    InterviewPhase.SCALABILITY.value: 1,
    InterviewPhase.RELIABILITY.value: 1,
    InterviewPhase.TRADEOFFS.value: 1,
}

READY_REQUIREMENTS_PROMPT = (
    "Great. What questions do you have about the requirements, constraints, or assumptions?"
)


def is_system_design(session: InterviewSession) -> bool:
    return getattr(session, "kind", InterviewKind.CODING.value) == InterviewKind.SYSTEM_DESIGN.value


def start_session(db: Session, user_id: UUID, scenario_slug: str) -> InterviewSession:
    existing = get_active_session(db, user_id, scenario_slug)
    if existing is not None and existing.ended_at is None:
        return existing
    scenario = get_scenario(scenario_slug)
    settings = get_settings()
    session = InterviewSession(
        user_id=user_id,
        problem_id=None,
        kind=InterviewKind.SYSTEM_DESIGN.value,
        scenario_slug=scenario["slug"],
        scenario=public_scenario(scenario),
        architecture=empty_architecture(),
        phase=InterviewPhase.INTRO.value,
        duration_seconds=settings.interview_duration_seconds,
        is_preview=False,
        signals=empty_signals(InterviewKind.SYSTEM_DESIGN.value),
    )
    db.add(session)
    db.flush()
    from app.interviews import service as interview_service

    interview_service._add_event(session, InterviewEventType.MESSAGE, {"kind": "start", "system_design": True})
    for text in build_opening_messages(scenario):
        interview_service._add_message(session, InterviewMessageRole.INTERVIEWER, text)
    session.phase = InterviewPhase.REQUIREMENTS.value
    session.phase_turns = 0
    db.commit()
    db.refresh(session)
    return interview_service._load_session(db, session.id, user_id)


def get_active_session(db: Session, user_id: UUID, scenario_slug: str) -> InterviewSession | None:
    session = db.scalar(
        select(InterviewSession)
        .options(selectinload(InterviewSession.messages), selectinload(InterviewSession.events))
        .where(
            InterviewSession.user_id == user_id,
            InterviewSession.kind == InterviewKind.SYSTEM_DESIGN.value,
            InterviewSession.scenario_slug == scenario_slug,
            InterviewSession.ended_at.is_(None),
        )
        .order_by(InterviewSession.started_at.desc())
    )
    if session is None:
        return None
    from app.interviews import service as interview_service

    interview_service._expire_if_needed(db, session)
    return session


def save_architecture(db: Session, session: InterviewSession, raw: dict) -> InterviewSession:
    from app.interviews import service as interview_service

    interview_service._ensure_open(session)
    graph = normalize_architecture(raw)
    session.architecture = graph
    interview_service._add_event(
        session,
        InterviewEventType.ARCHITECTURE,
        {"nodes": len(graph["nodes"]), "edges": len(graph["edges"])},
    )
    db.commit()
    db.refresh(session)
    return session


def add_message(db: Session, session: InterviewSession, content: str) -> InterviewSession:
    from app.interviews import service as interview_service

    interview_service._ensure_open(session)
    text = content.strip()
    interview_service._add_message(session, InterviewMessageRole.CANDIDATE, text)
    session.candidate_turns += 1
    interview_service._add_event(session, InterviewEventType.MESSAGE, {"role": "CANDIDATE"})

    current = session.phase
    if current == InterviewPhase.TRADEOFFS.value and session.phase_turns >= 1:
        reply = _ask(session, text, "They answered your last trade-off question. Close briefly; feedback is next.")
        interview_service._add_message(session, InterviewMessageRole.INTERVIEWER, reply)
        interview_service._complete(db, session, None)
        return session

    if current == InterviewPhase.REQUIREMENTS.value and session.candidate_turns == 1:
        reply = READY_REQUIREMENTS_PROMPT
    else:
        reply = _ask(session, text, f"Candidate just spoke. Current phase: {current}.")
    interview_service._add_message(session, InterviewMessageRole.INTERVIEWER, reply)
    _advance(session, current)
    db.commit()
    db.refresh(session)
    return session


def request_hint(db: Session, session: InterviewSession) -> InterviewSession:
    from app.interviews import service as interview_service

    interview_service._ensure_open(session)
    session.hints_used += 1
    interview_service._add_event(session, InterviewEventType.HINT, {"n": session.hints_used})
    canned = _hint_for(session.phase, session.hints_used)
    if canned:
        hint = canned
    else:
        hint = _ask(
            session,
            "",
            f"They asked for hint {session.hints_used}. Give a small nudge only. Do not design the system.",
            fallback="What is the first bottleneck on the busiest path, and which component absorbs it?",
            allow_hint_nudge=True,
        )
    interview_service._add_message(session, InterviewMessageRole.INTERVIEWER, hint)
    db.commit()
    db.refresh(session)
    return session


def build_opening_messages(scenario: dict) -> list[str]:
    del scenario
    return [
        (
            "Today we'll work through a system design problem. "
            "Take a moment to read the scenario on the left, then let me know when you're ready."
        )
    ]


def build_feedback(session: InterviewSession) -> dict:
    from app.interviews import service as interview_service

    scenario = session.scenario or {}
    title = str(scenario.get("title") or "this system")
    quality = architecture_quality(session.architecture)
    heuristic = _heuristic_scores(session, quality)
    scored = _agent(session).evaluate(
        problem_title=title,
        difficulty=str(scenario.get("difficulty") or "MEDIUM"),
        transcript=interview_service._plain_transcript(session),
        signals=normalize_signals(session.signals, InterviewKind.SYSTEM_DESIGN.value),
        objective={"correctness": quality},
        heuristic=heuristic,
        accepted=False,
        last_run_passed=0,
        last_run_total=0,
        submissions=0,
        wrong_attempts=0,
        hints_used=session.hints_used,
        candidate_turns=session.candidate_turns,
        followups_asked=session.phase_turns,
        kind=InterviewKind.SYSTEM_DESIGN,
        architecture_summary=summarize_architecture(session.architecture),
    )
    overall = round(
        quality * 0.22
        + interview_service._clamp(scored.get("understanding"), heuristic["understanding"]) * 0.12
        + interview_service._clamp(scored.get("approach"), heuristic["approach"]) * 0.16
        + interview_service._clamp(scored.get("coding"), heuristic["coding"]) * 0.12
        + interview_service._clamp(scored.get("communication"), heuristic["communication"]) * 0.10
        + interview_service._clamp(scored.get("reasoning"), heuristic["reasoning"]) * 0.10
        + interview_service._clamp(scored.get("complexity"), heuristic["complexity"]) * 0.10
        + interview_service._clamp(scored.get("follow_up"), heuristic["follow_up"]) * 0.08,
        1,
    )
    strengths = scored.get("strengths") or heuristic["strengths"]
    improvements = scored.get("improvements") or heuristic["improvements"]
    summary = scored.get("summary") or (
        f"Solid start on {title}. Tighten capacity numbers and call out failure modes earlier next time."
    )
    return {
        "overall": overall,
        "scores": {
            "understanding": interview_service._clamp(scored.get("understanding"), heuristic["understanding"]),
            "approach": interview_service._clamp(scored.get("approach"), heuristic["approach"]),
            "coding": interview_service._clamp(scored.get("coding"), heuristic["coding"]),
            "correctness": quality,
            "complexity": interview_service._clamp(scored.get("complexity"), heuristic["complexity"]),
            "communication": interview_service._clamp(scored.get("communication"), heuristic["communication"]),
            "reasoning": interview_service._clamp(scored.get("reasoning"), heuristic["reasoning"]),
            "follow_up": interview_service._clamp(scored.get("follow_up"), heuristic["follow_up"]),
            "overall": overall,
        },
        "objective": {
            "tests_passed": 0,
            "tests_total": 0,
            "submission_accepted": False,
            "submissions": 0,
            "wrong_attempts": 0,
            "hints_used": session.hints_used,
            "time_taken_seconds": interview_service.time_taken_seconds(session),
            "runtime_ms": None,
            "memory_kb": None,
        },
        "strengths": list(strengths)[:4],
        "improvements": list(improvements)[:4],
        "summary": str(summary),
    }


def interview_context(session: InterviewSession, *, event_note: str, fallback: str, last_candidate_text: str = "", allow_hint_nudge: bool = False) -> InterviewContext:
    from app.interviews import service as interview_service

    scenario = _scenario_snapshot(session)
    graph = normalize_architecture(session.architecture)
    return InterviewContext(
        kind=AgentKind.SYSTEM_DESIGN,
        phase=session.phase,
        problem=ProblemSnapshot(
            title=scenario.title,
            difficulty=scenario.difficulty,
            description=scenario.prompt,
            constraints="\n".join(scenario.constraints),
            input_format="",
            output_format="",
            examples=[],
            tags=["system-design"],
            public_context=scenario.public_context,
        ),
        transcript=interview_service._transcript(session),
        signals=normalize_signals(session.signals, InterviewKind.SYSTEM_DESIGN.value),
        sandbox=SandboxSnapshot(
            status=None,
            passed=0,
            total=0,
            runtime_ms=None,
            memory_kb=None,
            accepted=False,
            run_count=0,
            submit_count=0,
            last_event=None,
        ),
        hints_used=session.hints_used,
        wrong_attempts=0,
        remaining_seconds=interview_service.remaining_seconds(session),
        candidate_turns=session.candidate_turns,
        followups_asked=session.phase_turns,
        is_preview=False,
        event_note=event_note,
        fallback=fallback,
        last_candidate_text=last_candidate_text,
        allow_hint_nudge=allow_hint_nudge,
        scenario=scenario,
        architecture=ArchitectureSnapshot(nodes=graph["nodes"], edges=graph["edges"], summary=summarize_architecture(graph)),
        phase_turns=session.phase_turns,
    )


def _ask(
    session: InterviewSession,
    text: str,
    event_note: str,
    *,
    fallback: str | None = None,
    allow_hint_nudge: bool = False,
) -> str:
    reply_fallback = fallback or _fallback(session.phase)
    turn = _agent(session).respond(
        interview_context(
            session,
            event_note=event_note,
            fallback=reply_fallback,
            last_candidate_text=text,
            allow_hint_nudge=allow_hint_nudge,
        )
    )
    session.signals = turn.signals
    return turn.reply


def _advance(session: InterviewSession, phase_before: str) -> None:
    session.phase_turns = (session.phase_turns or 0) + 1
    needed = SD_MIN_TURNS.get(phase_before, 1)
    if session.phase_turns < needed:
        return
    if phase_before == InterviewPhase.HIGH_LEVEL.value and not has_core_shape(session.architecture) and session.phase_turns < 3:
        return
    if phase_before == InterviewPhase.TRADEOFFS.value:
        return
    try:
        index = SD_PHASE_ORDER.index(phase_before)
    except ValueError:
        return
    if index + 1 >= len(SD_PHASE_ORDER):
        return
    session.phase = SD_PHASE_ORDER[index + 1]
    session.phase_turns = 0


def _agent(session: InterviewSession) -> MockInterviewAgent:
    from sqlalchemy.orm import object_session

    from app.users.models import User

    db = object_session(session)
    user = db.get(User, session.user_id) if db is not None and session.user_id else None
    return MockInterviewAgent(get_llm_provider_for_user(user), kind=AgentKind.SYSTEM_DESIGN)


def _scenario_snapshot(session: InterviewSession) -> ScenarioSnapshot:
    stored = dict(session.scenario or {})
    notes = ""
    if session.scenario_slug:
        try:
            catalog = get_scenario(session.scenario_slug)
            notes = str(catalog.get("interviewer_notes") or "")
            if not stored:
                stored = public_scenario(catalog)
        except NotFoundError:
            notes = ""
    return ScenarioSnapshot(
        slug=str(stored.get("slug") or session.scenario_slug or ""),
        title=str(stored.get("title") or "System Design"),
        difficulty=str(stored.get("difficulty") or "MEDIUM"),
        prompt=str(stored.get("prompt") or ""),
        functional_requirements=list(stored.get("functional_requirements") or []),
        non_functional_requirements=list(stored.get("non_functional_requirements") or []),
        constraints=list(stored.get("constraints") or []),
        assumptions=list(stored.get("assumptions") or []),
        public_context=scenario_context(stored) if stored.get("title") else str(stored.get("prompt") or ""),
        interviewer_notes=notes,
    )


def _fallback(phase: str) -> str:
    return {
        InterviewPhase.REQUIREMENTS.value: (
            "Any questions on the requirements or constraints? If not, walk me through the core use cases."
        ),
        InterviewPhase.CAPACITY.value: "Let's put numbers on it. What QPS, storage, and bandwidth are you designing for?",
        InterviewPhase.HIGH_LEVEL.value: (
            "Sketch the main components on the canvas and tell me how a write travels through the system."
        ),
        InterviewPhase.DEEP_DIVE.value: "Pick one store or service and go deeper — schema, keys, and consistency.",
        InterviewPhase.SCALABILITY.value: "Where does this design break first at 10x traffic, and what do you change?",
        InterviewPhase.RELIABILITY.value: "A primary store just died. What does the user see, and how do you recover?",
        InterviewPhase.TRADEOFFS.value: "What is the most important trade-off in this design, and why did you pick that side?",
    }.get(phase, "Walk me through the next part of the design.")


def _hint_for(phase: str, n: int) -> str | None:
    hints = {
        InterviewPhase.REQUIREMENTS.value: [
            "Separate the read path from the write path before you pick stores.",
            "Who is the user, and which action must never be lost?",
        ],
        InterviewPhase.CAPACITY.value: [
            "Start from DAU, then derive QPS, payload size, and five-year storage.",
            "Call out the peak-to-average ratio before you size caches.",
        ],
        InterviewPhase.HIGH_LEVEL.value: [
            "Place client → edge → API → service → store, then add the async path.",
            "Every box should have a reason to exist on the busiest request.",
        ],
        InterviewPhase.DEEP_DIVE.value: [
            "Name the primary key and access pattern for the hottest store.",
            "If two services need the same write, is that sync or a queue?",
        ],
        InterviewPhase.SCALABILITY.value: [
            "Find the first hot key or single-leader store and say how you split it.",
        ],
        InterviewPhase.RELIABILITY.value: [
            "Say what is replicated, what is retried, and what the client sees during failover.",
        ],
        InterviewPhase.TRADEOFFS.value: [
            "Pick one CAP or cost trade-off and defend why the product can live with it.",
        ],
    }
    options = hints.get(phase) or []
    if 1 <= n <= len(options):
        return options[n - 1]
    return None


def _heuristic_scores(session: InterviewSession, quality: float) -> dict:
    signals = normalize_signals(session.signals, InterviewKind.SYSTEM_DESIGN.value)
    understood = 8.0 if session.candidate_turns else 4.0
    approach = 8.0 if has_core_shape(session.architecture) else (6.0 if session.candidate_turns >= 3 else 5.0)
    deep = 7.5 if signals.get("deep_dive") == "demonstrated" else (6.0 if session.candidate_turns >= 5 else 4.5)
    communication = min(9.0, 5.5 + session.candidate_turns * 0.4)
    reasoning = 7.5 if signals.get("tradeoffs") == "demonstrated" else 5.5
    capacity = 7.5 if signals.get("capacity") == "demonstrated" else 5.0
    follow = 7.5 if signals.get("scalability") == "demonstrated" else 5.5
    if session.hints_used >= 2:
        approach = max(4.0, approach - 1)
    strengths = []
    if session.candidate_turns:
        strengths.append("Clarified the problem before jumping to boxes.")
    if has_core_shape(session.architecture):
        strengths.append("Drew a coherent high-level architecture on the canvas.")
    if signals.get("capacity") == "demonstrated":
        strengths.append("Put real numbers on capacity.")
    improvements = []
    if signals.get("capacity") != "demonstrated":
        improvements.append("Estimate QPS and storage before choosing stores.")
    if not has_core_shape(session.architecture):
        improvements.append("Connect clients, compute, and a durable store on the canvas.")
    if signals.get("reliability") != "demonstrated":
        improvements.append("Say what fails and how the user is protected.")
    return {
        "understanding": understood,
        "approach": approach,
        "coding": deep,
        "communication": communication,
        "reasoning": reasoning,
        "complexity": capacity,
        "follow_up": follow,
        "strengths": strengths or ["Stayed engaged with the interviewer throughout the session."],
        "improvements": improvements[:3] or ["Name trade-offs out loud as you add each major component."],
        "summary": "",
        "correctness": quality,
    }


def require_scenario(slug: str) -> dict:
    return get_scenario(slug)


def raise_if_coding_only(session: InterviewSession) -> None:
    if not is_system_design(session):
        raise AppError("This endpoint is only for system design interviews.", status_code=400, code="bad_request")
