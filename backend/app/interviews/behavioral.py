"""Behavioral mock-interview session flow.

The service owns the question plan and the phase machine; the agent only writes
the probing follow-ups and scores the transcript against a STAR rubric.
"""

from __future__ import annotations

import re
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.common.config import get_settings
from app.common.enums import InterviewEventType, InterviewKind, InterviewMessageRole, InterviewPhase
from app.common.errors import AppError, NotFoundError
from app.interviews.agent import InterviewContext, InterviewKind as AgentKind, MockInterviewAgent, ProblemSnapshot, SandboxSnapshot
from app.interviews.models import InterviewSession
from app.interviews.providers import get_llm_provider_for_user
from app.interviews.signals import DEMONSTRATED, PARTIAL, empty_signals, normalize_signals

# One entry per competency. `competency` is the Learn topic slug under /learn/behavioral.
QUESTION_BANK: list[dict] = [
    {
        "slug": "opener",
        "competency": "tell-me-about-yourself",
        "competency_title": "Opener",
        "question": "To start, tell me about yourself and what brought you to this role.",
        "probes": [
            "What is the one piece of work from the last year you would want me to know about?",
            "Why this role now, rather than staying where you are?",
        ],
        "looking_for": ["Ninety seconds, not six minutes.", "Present role, one relevant win, why here.", "Stops and lets the interviewer steer."],
    },
    {
        "slug": "leadership",
        "competency": "leadership",
        "competency_title": "Leadership",
        "question": "Tell me about a time you led a piece of work without having formal authority over the people involved.",
        "probes": [
            "What was the hardest call you personally made in that effort?",
            "Who disagreed with the direction, and how did you bring them along?",
        ],
        "looking_for": ["A real decision, not just effort.", "Influence without a title.", "The outcome and what happened after."],
    },
    {
        "slug": "conflict",
        "competency": "conflict",
        "competency_title": "Conflict",
        "question": "Describe a disagreement with a colleague about a technical decision. How did it get resolved?",
        "probes": [
            "What did you do when the data did not settle it?",
            "How was the relationship afterwards?",
        ],
        "looking_for": ["No villains.", "Data or a prototype to break the tie.", "The relationship stays intact."],
    },
    {
        "slug": "failure",
        "competency": "failure",
        "competency_title": "Failure",
        "question": "Tell me about a time you failed at something that mattered. What happened, and what changed afterwards?",
        "probes": [
            "What was your part in it specifically, separate from the team's?",
            "What in your process is different today because of it?",
        ],
        "looking_for": ["A real miss with stakes.", "Ownership of your slice.", "A concrete process change."],
    },
    {
        "slug": "technical-decision",
        "competency": "difficult-technical-decision",
        "competency_title": "Technical Judgment",
        "question": "Walk me through a difficult technical decision you made where the options were genuinely close.",
        "probes": [
            "What would have made you choose the other option?",
            "How did you know afterwards whether it was the right call?",
        ],
        "looking_for": ["Options on the table.", "Constraints named.", "Revisit criteria."],
    },
    {
        "slug": "proud-project",
        "competency": "project-proud-of",
        "competency_title": "Impact",
        "question": "What is the project you are proudest of, and what was your specific contribution?",
        "probes": [
            "What metric moved, and by how much?",
            "If you did it again, what would you do differently?",
        ],
        "looking_for": ["Your slice, in the first person.", "A number that moved.", "A retrospective line."],
    },
    {
        "slug": "ambiguity",
        "competency": "handling-ambiguity",
        "competency_title": "Ambiguity",
        "question": "Tell me about a time you were handed a vague problem. How did you make progress?",
        "probes": [
            "What was the first question you asked, and to whom?",
            "How did you decide the slice was small enough to start?",
        ],
        "looking_for": ["Names the unknown.", "Time-boxes a spike.", "Confirms early with a stakeholder."],
    },
    {
        "slug": "difficult-people",
        "competency": "difficult-people",
        "competency_title": "Working With Others",
        "question": "Tell me about working with someone who was difficult to work with. What did you do?",
        "probes": [
            "What did you assume about them at first, and was it right?",
            "At what point would you have escalated, and why?",
        ],
        "looking_for": ["Curiosity before judgment.", "A private conversation with specific asks.", "Escalates behavior, not personality."],
    },
    {
        "slug": "incident",
        "competency": "production-incident",
        "competency_title": "Incidents",
        "question": "Walk me through a production incident you handled. Start from how you found out.",
        "probes": [
            "What did you do to stop the bleeding before you understood the cause?",
            "What was the one follow-up you personally owned afterwards?",
        ],
        "looking_for": ["Mitigate first, forensics second.", "Communicates status.", "One owned action item."],
    },
    {
        "slug": "manager-disagreement",
        "competency": "disagreement-with-manager",
        "competency_title": "Pushing Back",
        "question": "Tell me about a time you disagreed with your manager. What did you do, and what happened?",
        "probes": [
            "Once the decision went against you, what did you do next?",
            "What would it have taken for you to be right?",
        ],
        "looking_for": ["Data, not drama.", "Proposes a smaller bet.", "Disagrees and commits."],
    },
    {
        "slug": "why-us",
        "competency": "why-this-company",
        "competency_title": "Motivation",
        "question": "Why do you want to work here specifically, rather than somewhere similar?",
        "probes": [
            "What is one thing about our product you would change in your first six months?",
        ],
        "looking_for": ["A specific product detail.", "A technical problem that matches your proof.", "The work you want to own."],
    },
]

TRACKS: dict[str, dict] = {
    "general": {
        "title": "General Behavioral Loop",
        "summary": "Opener, then one story each on impact, conflict, and failure. The loop most companies run.",
        "questions": ["opener", "proud-project", "conflict", "failure"],
    },
    "leadership": {
        "title": "Leadership & Influence",
        "summary": "For senior and staff loops: leading without authority, pushing back, and hard technical calls.",
        "questions": ["opener", "leadership", "manager-disagreement", "technical-decision"],
    },
    "ownership": {
        "title": "Ownership & Operations",
        "summary": "Incidents, ambiguity, and difficult collaborators. Common for backend and infrastructure roles.",
        "questions": ["opener", "incident", "ambiguity", "difficult-people"],
    },
}

BEHAVIORAL_PHASE_LABELS = {
    InterviewPhase.QUESTION.value: "Your Story",
    InterviewPhase.PROBE.value: "Follow-up",
    InterviewPhase.CLOSING.value: "Your Questions",
    InterviewPhase.FEEDBACK.value: "Feedback",
}

CLOSING_PROMPT = "That is all my questions. What questions do you have for me?"

_BANK_BY_SLUG = {item["slug"]: item for item in QUESTION_BANK}
_FIRST_PERSON = re.compile(r"\bI\b|\bI'(m|ve|d|ll)\b|\bmy\b|\bme\b", re.I)
_FIRST_PLURAL = re.compile(r"\bwe\b|\bour\b|\bus\b|\bthe team\b", re.I)
_NUMBERS = re.compile(r"\d")


def list_questions() -> list[dict]:
    return [_public_question(item) for item in QUESTION_BANK]


def list_tracks() -> list[dict]:
    return [
        {"slug": slug, "title": track["title"], "summary": track["summary"], "questions": list(track["questions"])}
        for slug, track in TRACKS.items()
    ]


def is_behavioral(session: InterviewSession) -> bool:
    return getattr(session, "kind", InterviewKind.CODING.value) == InterviewKind.BEHAVIORAL.value


def start_session(db: Session, user_id: UUID, track: str) -> InterviewSession:
    track_slug = (track or "general").strip().lower()
    if track_slug not in TRACKS:
        raise NotFoundError("Unknown behavioral track.")
    existing = get_active_session(db, user_id, track_slug)
    if existing is not None and existing.ended_at is None:
        return existing
    settings = get_settings()
    plan = build_plan(track_slug)
    session = InterviewSession(
        user_id=user_id,
        problem_id=None,
        kind=InterviewKind.BEHAVIORAL.value,
        scenario_slug=f"behavioral-{track_slug}",
        scenario=plan,
        architecture=None,
        phase=InterviewPhase.INTRO.value,
        duration_seconds=min(settings.interview_duration_seconds, 30 * 60),
        is_preview=False,
        signals=empty_signals(InterviewKind.BEHAVIORAL.value),
    )
    db.add(session)
    db.flush()
    from app.interviews import service as interview_service

    interview_service._add_event(session, InterviewEventType.MESSAGE, {"kind": "start", "behavioral": True})
    for text in build_opening_messages(plan):
        interview_service._add_message(session, InterviewMessageRole.INTERVIEWER, text)
    session.phase = InterviewPhase.QUESTION.value
    session.phase_turns = 0
    db.commit()
    db.refresh(session)
    return interview_service._load_session(db, session.id, user_id)


def get_active_session(db: Session, user_id: UUID, track: str) -> InterviewSession | None:
    session = db.scalar(
        select(InterviewSession)
        .options(selectinload(InterviewSession.messages), selectinload(InterviewSession.events))
        .where(
            InterviewSession.user_id == user_id,
            InterviewSession.kind == InterviewKind.BEHAVIORAL.value,
            InterviewSession.scenario_slug == f"behavioral-{track}",
            InterviewSession.ended_at.is_(None),
        )
        .order_by(InterviewSession.started_at.desc())
    )
    if session is None:
        return None
    from app.interviews import service as interview_service

    interview_service._expire_if_needed(db, session)
    return session


def build_plan(track: str) -> dict:
    track_def = TRACKS[track]
    questions = [_public_question(_BANK_BY_SLUG[slug]) for slug in track_def["questions"]]
    return {
        "slug": f"behavioral-{track}",
        "title": track_def["title"],
        "difficulty": "MEDIUM",
        "track": track,
        "summary": track_def["summary"],
        "questions": questions,
        "current": 0,
    }


def build_opening_messages(plan: dict) -> list[str]:
    first = plan["questions"][0]["question"] if plan.get("questions") else CLOSING_PROMPT
    return [
        (
            "This is a behavioral interview. I will ask a few questions about your past work; "
            "answer with a specific example each time, and I will follow up. "
            + first
        )
    ]


def current_question(session: InterviewSession) -> dict | None:
    plan = session.scenario or {}
    questions = list(plan.get("questions") or [])
    index = int(plan.get("current") or 0)
    if 0 <= index < len(questions):
        return questions[index]
    return None


def add_message(db: Session, session: InterviewSession, content: str) -> InterviewSession:
    from app.interviews import service as interview_service

    interview_service._ensure_open(session)
    text = content.strip()
    interview_service._add_message(session, InterviewMessageRole.CANDIDATE, text)
    session.candidate_turns += 1
    interview_service._add_event(session, InterviewEventType.MESSAGE, {"role": "CANDIDATE"})

    phase = session.phase
    if phase == InterviewPhase.QUESTION.value:
        question = current_question(session) or {}
        probe = _ask(
            session,
            text,
            "They just told their story. Ask one probing follow-up about a gap in it: a missing result, vague action, or 'we' instead of 'I'.",
            fallback=_canned_probe(question, 0),
        )
        interview_service._add_message(session, InterviewMessageRole.INTERVIEWER, probe)
        session.phase = InterviewPhase.PROBE.value
        session.phase_turns = 0
        session.followups_asked += 1
    elif phase == InterviewPhase.PROBE.value:
        # Record the probe answer's signals, then move on deterministically.
        _ask(session, text, "They answered the follow-up. Acknowledge in one short sentence; the service asks the next question.", fallback="Thanks.")
        plan = dict(session.scenario or {})
        index = int(plan.get("current") or 0) + 1
        questions = list(plan.get("questions") or [])
        if index < len(questions):
            plan["current"] = index
            session.scenario = plan
            interview_service._add_message(
                session,
                InterviewMessageRole.INTERVIEWER,
                f"Thanks. Next one. {questions[index]['question']}",
            )
            session.phase = InterviewPhase.QUESTION.value
            session.phase_turns = 0
        else:
            interview_service._add_message(session, InterviewMessageRole.INTERVIEWER, CLOSING_PROMPT)
            session.phase = InterviewPhase.CLOSING.value
            session.phase_turns = 0
    elif phase == InterviewPhase.CLOSING.value:
        interview_service._add_message(
            session,
            InterviewMessageRole.INTERVIEWER,
            "Good questions. Thanks for your time today; I will share feedback now.",
        )
        interview_service._complete(db, session, None)
        return session
    else:
        raise AppError("This interview is not accepting answers right now.", status_code=409, code="interview_state")
    db.commit()
    db.refresh(session)
    return session


def request_hint(db: Session, session: InterviewSession) -> InterviewSession:
    from app.interviews import service as interview_service

    interview_service._ensure_open(session)
    session.hints_used += 1
    interview_service._add_event(session, InterviewEventType.HINT, {"n": session.hints_used})
    question = current_question(session) or {}
    hints = [
        "Use STAR: one sentence of situation, one of your task, then mostly what you did and the measurable result.",
        "Say 'I' for your own actions and 'we' only for the team's. Interviewers score your slice.",
        "End with a number and a lesson: what changed, by how much, and what you do differently now.",
    ]
    looking = list(question.get("looking_for") or [])
    if looking and session.hints_used > len(hints):
        hint = "They are listening for: " + " ".join(looking)
    else:
        hint = hints[min(session.hints_used, len(hints)) - 1]
    interview_service._add_message(session, InterviewMessageRole.INTERVIEWER, hint)
    db.commit()
    db.refresh(session)
    return session


def build_feedback(session: InterviewSession) -> dict:
    from app.interviews import service as interview_service

    plan = session.scenario or {}
    title = str(plan.get("title") or "Behavioral Interview")
    heuristic = _heuristic_scores(session)
    scored = _agent(session).evaluate(
        problem_title=title,
        difficulty="MEDIUM",
        transcript=interview_service._plain_transcript(session),
        signals=normalize_signals(session.signals, InterviewKind.BEHAVIORAL.value),
        objective={"correctness": heuristic["correctness"]},
        heuristic=heuristic,
        accepted=False,
        last_run_passed=0,
        last_run_total=0,
        submissions=0,
        wrong_attempts=0,
        hints_used=session.hints_used,
        candidate_turns=session.candidate_turns,
        followups_asked=session.followups_asked,
        kind=InterviewKind.BEHAVIORAL,
    )
    clamp = interview_service._clamp
    scores = {
        "understanding": clamp(scored.get("understanding"), heuristic["understanding"]),
        "approach": clamp(scored.get("approach"), heuristic["approach"]),
        "coding": clamp(scored.get("coding"), heuristic["coding"]),
        "correctness": heuristic["correctness"],
        "complexity": clamp(scored.get("complexity"), heuristic["complexity"]),
        "communication": clamp(scored.get("communication"), heuristic["communication"]),
        "reasoning": clamp(scored.get("reasoning"), heuristic["reasoning"]),
        "follow_up": clamp(scored.get("follow_up"), heuristic["follow_up"]),
    }
    overall = round(
        scores["understanding"] * 0.18
        + scores["approach"] * 0.14
        + scores["coding"] * 0.14
        + scores["correctness"] * 0.14
        + scores["complexity"] * 0.12
        + scores["communication"] * 0.10
        + scores["reasoning"] * 0.10
        + scores["follow_up"] * 0.08,
        1,
    )
    scores["overall"] = overall
    strengths = scored.get("strengths") or heuristic["strengths"]
    improvements = scored.get("improvements") or heuristic["improvements"]
    summary = scored.get("summary") or (
        f"You told {session.followups_asked} stories in the {title}. "
        "Lead with the situation in one sentence, spend most of the time on what you did, and close every story with a number."
    )
    return {
        "overall": overall,
        "scores": scores,
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


def interview_context(
    session: InterviewSession,
    *,
    event_note: str,
    fallback: str,
    last_candidate_text: str = "",
    allow_hint_nudge: bool = False,
) -> InterviewContext:
    from app.interviews import service as interview_service

    plan = session.scenario or {}
    question = current_question(session) or {}
    looking = " ".join(question.get("looking_for") or [])
    return InterviewContext(
        kind=AgentKind.BEHAVIORAL,
        phase=session.phase,
        problem=ProblemSnapshot(
            title=str(plan.get("title") or "Behavioral Interview"),
            difficulty="MEDIUM",
            description=str(question.get("question") or CLOSING_PROMPT),
            constraints=looking,
            input_format="",
            output_format="",
            examples=[],
            tags=["behavioral", str(question.get("competency") or "")],
            public_context=(
                f"Current question: {question.get('question') or CLOSING_PROMPT}\n"
                f"Competency: {question.get('competency_title') or 'closing'}\n"
                f"What a strong answer contains: {looking or 'thoughtful questions about the team and role'}"
            ),
        ),
        transcript=interview_service._transcript(session),
        signals=normalize_signals(session.signals, InterviewKind.BEHAVIORAL.value),
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
        followups_asked=session.followups_asked,
        is_preview=False,
        event_note=event_note,
        fallback=fallback,
        last_candidate_text=last_candidate_text,
        allow_hint_nudge=allow_hint_nudge,
        phase_turns=session.phase_turns,
    )


def _ask(session: InterviewSession, text: str, event_note: str, *, fallback: str) -> str:
    turn = _agent(session).respond(
        interview_context(session, event_note=event_note, fallback=fallback, last_candidate_text=text)
    )
    session.signals = _merge_story_signals(turn.signals, text)
    return turn.reply


def _merge_story_signals(signals: dict, text: str) -> dict:
    """Ownership and specificity come from the words, not the model: count pronouns and numbers."""
    merged = dict(normalize_signals(signals, InterviewKind.BEHAVIORAL.value))
    first = len(_FIRST_PERSON.findall(text))
    plural = len(_FIRST_PLURAL.findall(text))
    if first >= 3 and first >= plural:
        merged["ownership"] = DEMONSTRATED
    elif first >= 1 and merged.get("ownership") != DEMONSTRATED:
        merged["ownership"] = PARTIAL
    digits = len(_NUMBERS.findall(text))
    if digits >= 2:
        merged["specificity"] = DEMONSTRATED
    elif digits == 1 and merged.get("specificity") != DEMONSTRATED:
        merged["specificity"] = PARTIAL
    return merged


def _heuristic_scores(session: InterviewSession) -> dict:
    signals = normalize_signals(session.signals, InterviewKind.BEHAVIORAL.value)

    def level(key: str, demonstrated: float = 8.0, partial: float = 6.0, missing: float = 4.0) -> float:
        value = signals.get(key)
        return demonstrated if value == DEMONSTRATED else partial if value == PARTIAL else missing

    star = [signals.get(key) for key in ("situation", "action", "result")]
    structure = 8.5 if all(item == DEMONSTRATED for item in star) else 6.5 if all(item != "missing" for item in star) else 4.5
    stories = max(0, session.followups_asked)
    communication = min(9.0, 5.5 + stories * 0.7)
    probe_handling = 7.5 if stories >= 3 and session.candidate_turns >= stories * 2 else 6.0 if stories else 4.0
    if session.hints_used >= 2:
        structure = max(4.0, structure - 1)
    strengths = []
    improvements = []
    if signals.get("result") == DEMONSTRATED:
        strengths.append("Closed stories with a concrete result.")
    else:
        improvements.append("End every story with a number: what moved and by how much.")
    if signals.get("ownership") == DEMONSTRATED:
        strengths.append("Spoke in the first person about your own actions.")
    else:
        improvements.append("Say 'I' for your actions; 'we' hides your contribution.")
    if signals.get("reflection") == DEMONSTRATED:
        strengths.append("Reflected on what you would do differently.")
    else:
        improvements.append("Add one sentence on what you learned or changed afterwards.")
    if signals.get("situation") == DEMONSTRATED and signals.get("action") == DEMONSTRATED:
        strengths.append("Set the scene quickly and got to the action.")
    return {
        "understanding": structure,
        "approach": level("specificity"),
        "coding": level("ownership"),
        "correctness": level("result"),
        "complexity": level("result", 8.0, 6.0, 4.5),
        "communication": communication,
        "reasoning": level("reflection"),
        "follow_up": probe_handling,
        "strengths": strengths or ["Engaged with every question and follow-up."],
        "improvements": improvements[:3] or ["Tighten the situation to one sentence so the action gets the time."],
        "summary": "",
    }


def _agent(session: InterviewSession) -> MockInterviewAgent:
    from sqlalchemy.orm import object_session

    from app.users.models import User

    db = object_session(session)
    user = db.get(User, session.user_id) if db is not None and session.user_id else None
    return MockInterviewAgent(get_llm_provider_for_user(user), kind=AgentKind.BEHAVIORAL)


def _canned_probe(question: dict, index: int) -> str:
    probes = list(question.get("probes") or [])
    if probes:
        return probes[index % len(probes)]
    return "What was your specific part in that, and what was the result?"


def _public_question(item: dict) -> dict:
    return {
        "slug": item["slug"],
        "competency": item["competency"],
        "competency_title": item["competency_title"],
        "question": item["question"],
        "probes": list(item["probes"]),
        "looking_for": list(item["looking_for"]),
        "learn_slug": item["competency"],
    }
