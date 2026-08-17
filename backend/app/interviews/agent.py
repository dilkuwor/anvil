"""Adaptive Microsoft-style coding interviewer.

The deterministic service owns phase transitions, timers, and sandbox truth.
This agent only chooses the next question and records interview signals.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Protocol

from app.common.enums import InterviewPhase
from app.interviews.providers.base import LLMProvider
from app.interviews.signals import (
    DEMONSTRATED,
    choose_focus,
    coverage_score,
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


class InterviewKind(StrEnum):
    CODING = "CODING"
    SYSTEM_DESIGN = "SYSTEM_DESIGN"


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
        self.recorded = merge_signals(self.recorded or self.context.signals, updates)
        self.context.signals = self.recorded
        return self.recorded

    def service_permits_advance(self) -> bool:
        return service_permits_advance(
            self.context.phase,
            followups_asked=self.context.followups_asked,
        )


def service_permits_advance(phase: str, *, followups_asked: int = 0) -> bool:
    """Mirrors the deterministic service. The agent cannot change phase itself."""
    if phase == InterviewPhase.UNDERSTANDING.value:
        return True
    if phase == InterviewPhase.APPROACH.value:
        return True
    if phase == InterviewPhase.FOLLOW_UP.value and followups_asked >= 2:
        return True
    return False


class MockInterviewAgent:
    def __init__(self, provider: LLMProvider, *, kind: InterviewKind = InterviewKind.CODING) -> None:
        if kind is InterviewKind.SYSTEM_DESIGN:
            raise NotImplementedError("SYSTEM_DESIGN interviews are not implemented yet.")
        self.provider = provider
        self.kind = kind

    def respond(self, context: InterviewContext, tools: InterviewTools | None = None) -> AgentTurn:
        helper = tools or InMemoryInterviewTools(context)
        snapshot = helper.read_context()
        if snapshot.kind is InterviewKind.SYSTEM_DESIGN:
            raise NotImplementedError("SYSTEM_DESIGN interviews are not implemented yet.")
        if snapshot.phase == InterviewPhase.FEEDBACK.value:
            return AgentTurn(
                reply="The interview is over. I'll share feedback now.",
                signal_updates={},
                signals=normalize_signals(snapshot.signals),
                focus=None,
                used_fallback=True,
                service_will_advance=False,
            )

        sandbox = helper.read_sandbox()
        lifts = infer_signals(snapshot.last_candidate_text)
        lifts = merge_signals(
            lifts,
            infer_from_sandbox(
                status=sandbox.status,
                passed=sandbox.passed,
                total=sandbox.total,
                accepted=sandbox.accepted,
                run_count=sandbox.run_count,
            ),
        )
        lifts = {key: value for key, value in lifts.items() if value != "missing"}
        merged = helper.record_signals(lifts)
        focus = choose_focus(snapshot.phase, merged)
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
    ) -> dict:
        coverage = coverage_score(signals)
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
            signal_adj = _signal_adjustment(key, signals)
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
        preview = " This is a short public preview — keep it brisk." if context.is_preview else ""
        nudge = (
            "They requested a hint. Give a small conceptual nudge only. No algorithm, no code."
            if context.allow_hint_nudge
            else "Never provide the solution, optimal algorithm, or any code."
        )
        advance = (
            "The service will advance the interview after this turn. You may invite them to the next activity, "
            "but you do not control the phase."
            if will_advance
            else "Do not announce a phase change. The service controls when the interview advances."
        )
        gaps = ", ".join(missing_signals(signals)) or "none"
        return (
            "You are a live Microsoft-style technical interviewer for a CODING interview at InterviewAnvil. "
            "Speak like a senior engineer in the room — not a chatbot, tutor, or coding copilot.\n"
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
        if not context.allow_hint_nudge and (_CODE_FENCE.search(text) or _SOLUTION_LEAK.search(text)):
            return context.fallback
        failed = sandbox.status in {"WRONG_ANSWER", "COMPILATION_ERROR", "RUNTIME_ERROR"} or (
            sandbox.total and sandbox.passed < sandbox.total and not sandbox.accepted
        )
        if failed and _SUCCESS_CLAIM.search(text):
            return context.fallback
        if sandbox.accepted and _FAILURE_CLAIM.search(text) and not _SUCCESS_CLAIM.search(text):
            return context.fallback
        return _first_question_block(text)


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


def _signal_adjustment(score_key: str, signals: dict[str, str]) -> float:
    mapping = {
        "understanding": "requirements",
        "approach": "approach",
        "coding": "testing",
        "communication": "communication",
        "reasoning": "reasoning",
        "complexity": "complexity",
        "follow_up": "edge_cases",
    }
    signal = normalize_signals(signals).get(mapping.get(score_key, ""), "missing")
    if signal == DEMONSTRATED:
        return 1.2
    if signal == "partial":
        return 0.3
    return -0.6
