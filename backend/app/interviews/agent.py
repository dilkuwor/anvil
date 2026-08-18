"""Adaptive Microsoft-style coding interviewer.

The deterministic service owns phase transitions, timers, and sandbox truth.
This agent only chooses the next question and records interview signals.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Protocol

from app.common.enums import InterviewKind, InterviewPhase
from app.interviews.providers.base import LLMProvider
from app.interviews.signals import (
    DEMONSTRATED,
    choose_focus,
    coverage_score,
    infer_from_architecture,
    infer_from_sandbox,
    infer_signals,
    merge_signals,
    missing_signals,
    normalize_signals,
)

_CODE_FENCE = re.compile(r"```")
_SOLUTION_LEAK = re.compile(r"\b(class Solution|public static void main|optimal (algorithm|solution))\b", re.I)
_SUCCESS_CLAIM = re.compile(r"\b(all tests (passed|pass)|solution was accepted|everything passes)\b", re.I)
_FAILURE_CLAIM = re.compile(r"\b(tests? (are )?failing|not accepted|wrong answer)\b", re.I)


@dataclass(frozen=True)
class ProblemSnapshot:
    title: str
    difficulty: str
    description: str
    constraints: str
    input_format: str
    output_format: str
    examples: list[dict]
    tags: list[str]
    public_context: str


@dataclass(frozen=True)
class ScenarioSnapshot:
    slug: str
    title: str
    difficulty: str
    prompt: str
    functional_requirements: list[str]
    non_functional_requirements: list[str]
    constraints: list[str]
    assumptions: list[str]
    public_context: str
    interviewer_notes: str = ""


@dataclass(frozen=True)
class ArchitectureSnapshot:
    nodes: list[dict]
    edges: list[dict]
    summary: str


@dataclass(frozen=True)
class SandboxSnapshot:
    status: str | None
    passed: int
    total: int
    runtime_ms: int | None
    memory_kb: int | None
    accepted: bool
    run_count: int
    submit_count: int
    last_event: str | None = None


@dataclass
class InterviewContext:
    kind: InterviewKind
    phase: str
    problem: ProblemSnapshot
    transcript: list[dict[str, str]]
    signals: dict[str, str]
    sandbox: SandboxSnapshot
    hints_used: int
    wrong_attempts: int
    remaining_seconds: int
    candidate_turns: int
    followups_asked: int
    is_preview: bool
    event_note: str
    fallback: str
    last_candidate_text: str = ""
    allow_hint_nudge: bool = False
    scenario: ScenarioSnapshot | None = None
    architecture: ArchitectureSnapshot | None = None
    phase_turns: int = 0


@dataclass
class AgentTurn:
    reply: str
    signal_updates: dict[str, str]
    signals: dict[str, str]
    focus: str | None
    used_fallback: bool
    service_will_advance: bool


class InterviewTools(Protocol):
    def read_context(self) -> InterviewContext: ...

    def read_sandbox(self) -> SandboxSnapshot: ...

    def record_signals(self, updates: dict[str, str]) -> dict[str, str]: ...

    def service_permits_advance(self) -> bool: ...


@dataclass
class InMemoryInterviewTools:
    """Test/production helper. Persistence stays in the service."""

    context: InterviewContext
    recorded: dict[str, str] = field(default_factory=dict)

    def read_context(self) -> InterviewContext:
        return self.context

    def read_sandbox(self) -> SandboxSnapshot:
        return self.context.sandbox

    def record_signals(self, updates: dict[str, str]) -> dict[str, str]:
        kind = self.context.kind.value if isinstance(self.context.kind, InterviewKind) else str(self.context.kind)
        self.recorded = merge_signals(self.recorded or self.context.signals, updates, kind)
        self.context.signals = self.recorded
        return self.recorded

    def service_permits_advance(self) -> bool:
        return service_permits_advance(
            self.context.phase,
            followups_asked=self.context.followups_asked,
            kind=self.context.kind,
            phase_turns=self.context.phase_turns,
        )


def service_permits_advance(
    phase: str,
    *,
    followups_asked: int = 0,
    kind: InterviewKind | str = InterviewKind.CODING,
    phase_turns: int = 0,
) -> bool:
    """Mirrors the deterministic service. The agent cannot change phase itself."""
    kind_value = kind.value if isinstance(kind, InterviewKind) else str(kind)
    if kind_value == InterviewKind.SYSTEM_DESIGN.value:
        mins = {
            InterviewPhase.REQUIREMENTS.value: 2,
            InterviewPhase.CAPACITY.value: 1,
            InterviewPhase.HIGH_LEVEL.value: 2,
            InterviewPhase.DEEP_DIVE.value: 2,
            InterviewPhase.SCALABILITY.value: 1,
            InterviewPhase.RELIABILITY.value: 1,
            InterviewPhase.TRADEOFFS.value: 1,
        }
        needed = mins.get(phase)
        return needed is not None and phase_turns + 1 >= needed
    if phase == InterviewPhase.UNDERSTANDING.value:
        return True
    if phase == InterviewPhase.APPROACH.value:
        return True
    if phase == InterviewPhase.FOLLOW_UP.value and followups_asked >= 2:
        return True
    return False


class MockInterviewAgent:
    def __init__(self, provider: LLMProvider, *, kind: InterviewKind = InterviewKind.CODING) -> None:
        self.provider = provider
        self.kind = kind

    def respond(self, context: InterviewContext, tools: InterviewTools | None = None) -> AgentTurn:
        helper = tools or InMemoryInterviewTools(context)
        snapshot = helper.read_context()
        kind = snapshot.kind.value if isinstance(snapshot.kind, InterviewKind) else str(snapshot.kind)
        if snapshot.phase == InterviewPhase.FEEDBACK.value:
            return AgentTurn(
                reply="The interview is over. I'll share feedback now.",
                signal_updates={},
                signals=normalize_signals(snapshot.signals, kind),
                focus=None,
                used_fallback=True,
                service_will_advance=False,
            )

        sandbox = helper.read_sandbox()
        lifts = infer_signals(snapshot.last_candidate_text, kind=kind)
        if kind == InterviewKind.SYSTEM_DESIGN.value:
            graph = None
            if snapshot.architecture is not None:
                graph = {"nodes": snapshot.architecture.nodes, "edges": snapshot.architecture.edges}
            lifts = merge_signals(lifts, infer_from_architecture(graph), kind)
        else:
            lifts = merge_signals(
                lifts,
                infer_from_sandbox(
                    status=sandbox.status,
                    passed=sandbox.passed,
                    total=sandbox.total,
                    accepted=sandbox.accepted,
                    run_count=sandbox.run_count,
                ),
                kind,
            )
        lifts = {key: value for key, value in lifts.items() if value != "missing"}
        merged = helper.record_signals(lifts)
        focus = choose_focus(snapshot.phase, merged, kind)
        will_advance = helper.service_permits_advance()
        used_fallback = False
        try:
            reply = self.provider.complete(
                self._system_prompt(snapshot, merged, focus, sandbox, will_advance),
                snapshot.transcript,
                self._user_turn(snapshot, sandbox, focus),
            )
        except Exception:
            reply = snapshot.fallback
            used_fallback = True
        cleaned = self._sanitize(reply, snapshot, sandbox)
        if cleaned == snapshot.fallback and reply != snapshot.fallback:
            used_fallback = True
        reply = cleaned
        return AgentTurn(
            reply=reply.strip(),
            signal_updates=lifts,
            signals=merged,
            focus=focus,
            used_fallback=used_fallback or reply == snapshot.fallback,
            service_will_advance=will_advance,
        )

    def evaluate(
        self,
        *,
        problem_title: str,
        difficulty: str,
        transcript: str,
        signals: dict[str, str],
        objective: dict,
        heuristic: dict,
        accepted: bool,
        last_run_passed: int,
        last_run_total: int,
        submissions: int,
        wrong_attempts: int,
        hints_used: int,
        candidate_turns: int,
        followups_asked: int,
        kind: InterviewKind | str = InterviewKind.CODING,
        architecture_summary: str = "",
    ) -> dict:
        kind_value = kind.value if isinstance(kind, InterviewKind) else str(kind)
        coverage = coverage_score(signals, kind_value)
        if kind_value == InterviewKind.SYSTEM_DESIGN.value:
            prompt = (
                "Score this completed SYSTEM DESIGN mock interview. Return JSON only with keys: "
                "understanding, approach, coding, communication, reasoning, complexity, follow_up "
                "(numbers 1-10), strengths (2-3 short strings), improvements (2-3 short strings), summary "
                "(2-4 sentences in the interviewer's voice).\n"
                "Map scores as: understanding=requirements, approach=high-level design, "
                "coding=deep dive, complexity=capacity estimation, reasoning=trade-offs, "
                "follow_up=scalability and reliability.\n"
                "Do not invent a sandbox or test score.\n"
                f"Scenario: {problem_title} ({difficulty}).\n"
                f"Architecture: {architecture_summary or 'none recorded'}.\n"
                f"Signals: {normalize_signals(signals, kind_value)}.\n"
                f"Signal coverage 1-10: {coverage}.\n"
                f"Objective: architecture_score={objective.get('correctness', 0)}, "
                f"hints={hints_used}, candidate_turns={candidate_turns}.\n"
                f"Transcript:\n{transcript}"
            )
        else:
            prompt = (
                "Score this completed coding mock interview. Return JSON only with keys: "
                "understanding, approach, coding, communication, reasoning, complexity, follow_up "
                "(numbers 1-10), strengths (2-3 short strings), improvements (2-3 short strings), summary "
                "(2-4 sentences in the interviewer's voice).\n"
                "Do not score correctness — that is measured only by sandbox tests.\n"
                "Weight recorded interview signals and the transcript more than politeness.\n"
                f"Problem: {problem_title} ({difficulty}).\n"
                f"Signals: {normalize_signals(signals)}.\n"
                f"Signal coverage 1-10: {coverage}.\n"
                f"Objective: accepted={accepted}, last_tests={last_run_passed}/{last_run_total}, "
                f"submissions={submissions}, wrong_attempts={wrong_attempts}, hints={hints_used}, "
                f"candidate_turns={candidate_turns}, followups={followups_asked}.\n"
                f"Transcript:\n{transcript}"
            )
        try:
            data = self.provider.complete_json(
                "You evaluate a completed technical interview. Return JSON only. No markdown.",
                prompt,
            )
        except Exception:
            data = {}
        blended = dict(heuristic)
        for key in ("understanding", "approach", "coding", "communication", "reasoning", "complexity", "follow_up"):
            model = data.get(key) if isinstance(data, dict) else None
            base = heuristic.get(key, 5.0)
            signal_adj = _signal_adjustment(key, signals, kind_value)
            value = base
            if model is not None:
                try:
                    value = (float(model) + base + signal_adj) / 2.5
                except (TypeError, ValueError):
                    value = (base + signal_adj) / 1.5
            else:
                value = min(10.0, max(1.0, base * 0.7 + coverage * 0.3 + signal_adj * 0.2))
            blended[key] = value
        if isinstance(data, dict):
            if data.get("strengths"):
                blended["strengths"] = [str(item) for item in data.get("strengths") or [] if str(item).strip()]
            if data.get("improvements"):
                blended["improvements"] = [str(item) for item in data.get("improvements") or [] if str(item).strip()]
            if data.get("summary"):
                blended["summary"] = str(data.get("summary") or "").strip()
        return blended

    def _system_prompt(
        self,
        context: InterviewContext,
        signals: dict[str, str],
        focus: str | None,
        sandbox: SandboxSnapshot,
        will_advance: bool,
    ) -> str:
        kind = context.kind.value if isinstance(context.kind, InterviewKind) else str(context.kind)
        preview = " This is a short public preview — keep it brisk." if context.is_preview else ""
        advance = (
            "The service will advance the interview after this turn. You may invite them to the next activity, "
            "but you do not control the phase."
            if will_advance
            else "Do not announce a phase change. The service controls when the interview advances."
        )
        gaps = ", ".join(missing_signals(signals, kind=kind)) or "none"
        if kind == InterviewKind.SYSTEM_DESIGN.value:
            notes = context.scenario.interviewer_notes if context.scenario else ""
            architecture = context.architecture.summary if context.architecture else "The canvas is empty."
            public = context.scenario.public_context if context.scenario else context.problem.public_context
            nudge = (
                "They requested a hint. Give a small conceptual nudge only. Do not design the system for them."
                if context.allow_hint_nudge
                else "Never draw the architecture or dump a full reference design."
            )
            return (
                "You are a live Microsoft-style SYSTEM DESIGN interviewer at InterviewAnvil. "
                "Speak like a senior engineer in the room — not a chatbot, tutor, or slide deck.\n"
                "The candidate can read the scenario in the left pane. Never paste the prompt, requirements, "
                "or constraints into chat.\n"
                "Adapt to the architecture they actually drew. Challenge missing pieces, weak connections, "
                "and hand-wavy claims. Do not walk a fixed question list.\n"
                "Rules:\n"
                "- Ask exactly one concise question.\n"
                "- Keep replies to 1–3 short sentences.\n"
                "- Tie the question to a concrete component or gap on their canvas when one exists.\n"
                f"- {nudge}\n"
                "- Never invent requirements that contradict the scenario.\n"
                f"- {advance}\n"
                f"Current phase: {context.phase}. Focus next on: {focus or 'a deeper follow-up'}.\n"
                f"Recorded signals: {signals}. Still missing or partial: {gaps}.\n"
                f"Hints used: {context.hints_used}. Remaining seconds: {context.remaining_seconds}.{preview}\n\n"
                f"Scenario (public):\n{public}\n\n"
                f"Current architecture:\n{architecture}\n"
                + (f"\nInterviewer notes: {notes}" if notes else "")
            )
        nudge = (
            "They requested a hint. Give a small conceptual nudge only. No algorithm, no code."
            if context.allow_hint_nudge
            else "Never provide the solution, optimal algorithm, or any code."
        )
        return (
            "You are a live Microsoft-style technical interviewer for a CODING interview at InterviewAnvil. "
            "Speak like a senior engineer in the room — not a chatbot, tutor, or coding copilot.\n"
            "The candidate can read the problem in the workspace. Never paste the title, statement, or constraints into chat.\n"
            "If they just said they are ready, ask about requirements or constraints — not the approach yet.\n"
            "Rules:\n"
            "- Ask exactly one concise question.\n"
            "- Keep replies to 1–3 short sentences.\n"
            "- Challenge assumptions, edge cases, complexity, tradeoffs, and reasoning.\n"
            f"- {nudge}\n"
            "- Never invent constraints or hidden tests.\n"
            "- Never reveal hidden tests or expected outputs that were not already shown.\n"
            "- Do not decide whether code is correct. Trust the authoritative sandbox result when given.\n"
            f"- {advance}\n"
            f"Current phase: {context.phase}. Focus next on: {focus or 'a deeper follow-up'}.\n"
            f"Recorded signals: {signals}. Still missing or partial: {gaps}.\n"
            f"Hints used: {context.hints_used}. Wrong attempts: {context.wrong_attempts}. "
            f"Remaining seconds: {context.remaining_seconds}.{preview}\n\n"
            "Problem (public statement only):\n"
            f"{context.problem.public_context}"
        )

    def _user_turn(self, context: InterviewContext, sandbox: SandboxSnapshot, focus: str | None) -> str:
        parts = [context.event_note.strip()]
        kind = context.kind.value if isinstance(context.kind, InterviewKind) else str(context.kind)
        if kind == InterviewKind.SYSTEM_DESIGN.value and context.architecture:
            parts.append(f"Live architecture: {context.architecture.summary}")
        if sandbox.last_event:
            parts.append(
                f"AUTHORITATIVE sandbox: event={sandbox.last_event} status={sandbox.status} "
                f"{sandbox.passed}/{sandbox.total} accepted={sandbox.accepted}. Do not contradict this."
            )
        if focus:
            parts.append(f"If they have not covered it, probe {focus.replace('_', ' ')}.")
        if context.last_candidate_text:
            parts.append("Respond to their latest answer. Ask one question.")
        return " ".join(part for part in parts if part)

    def _sanitize(self, reply: str, context: InterviewContext, sandbox: SandboxSnapshot) -> str:
        text = (reply or "").strip()
        if not text:
            return context.fallback
        kind = context.kind.value if isinstance(context.kind, InterviewKind) else str(context.kind)
        title = context.scenario.title if context.scenario else context.problem.title
        description = context.scenario.prompt if context.scenario else context.problem.description
        if _looks_like_problem_dump(text, title, description):
            return context.fallback
        if kind != InterviewKind.SYSTEM_DESIGN.value and not context.allow_hint_nudge and (
            _CODE_FENCE.search(text) or _SOLUTION_LEAK.search(text)
        ):
            return context.fallback
        if kind == InterviewKind.SYSTEM_DESIGN.value:
            return _first_question_block(text)
        failed = sandbox.status in {"WRONG_ANSWER", "COMPILATION_ERROR", "RUNTIME_ERROR"} or (
            sandbox.total and sandbox.passed < sandbox.total and not sandbox.accepted
        )
        if failed and _SUCCESS_CLAIM.search(text):
            return context.fallback
        if sandbox.accepted and _FAILURE_CLAIM.search(text) and not _SUCCESS_CLAIM.search(text):
            return context.fallback
        return _first_question_block(text)


def _looks_like_problem_dump(text: str, title: str, description: str) -> bool:
    cleaned = text.strip()
    first = cleaned.split("\n", 1)[0].strip()
    if title and first == title.strip():
        return True
    snippet = (description or "").strip()[:48]
    return bool(snippet) and snippet in cleaned and "Constraints:" in cleaned


def _first_question_block(text: str) -> str:
    sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+", text) if part.strip()]
    if not sentences:
        return text
    questions = [part for part in sentences if part.endswith("?")]
    if len(questions) <= 1 and len(sentences) <= 3:
        return text
    kept: list[str] = []
    seen_question = False
    for sentence in sentences:
        if sentence.endswith("?"):
            if seen_question:
                break
            seen_question = True
        kept.append(sentence)
        if len(kept) >= 3 and seen_question:
            break
    return " ".join(kept) or text


def _signal_adjustment(score_key: str, signals: dict[str, str], kind: str = "CODING") -> float:
    if kind == InterviewKind.SYSTEM_DESIGN.value:
        mapping = {
            "understanding": "requirements",
            "approach": "high_level",
            "coding": "deep_dive",
            "communication": "communication",
            "reasoning": "tradeoffs",
            "complexity": "capacity",
            "follow_up": "scalability",
        }
    else:
        mapping = {
            "understanding": "requirements",
            "approach": "approach",
            "coding": "testing",
            "communication": "communication",
            "reasoning": "reasoning",
            "complexity": "complexity",
            "follow_up": "edge_cases",
        }
    signal = normalize_signals(signals, kind).get(mapping.get(score_key, ""), "missing")
    if signal == DEMONSTRATED:
        return 1.2
    if signal == "partial":
        return 0.3
    return -0.6
