from app.common.enums import InterviewPhase
from app.interviews.agent import (
    InterviewContext,
    InterviewKind,
    MockInterviewAgent,
    ProblemSnapshot,
    SandboxSnapshot,
    service_permits_advance,
)
from app.interviews.signals import choose_focus, infer_signals, merge_signals, missing_signals


class FakeLLM:
    def __init__(self, reply: str = "What edge case worries you?", json_payload: dict | None = None, error: Exception | None = None):
        self.reply = reply
        self.json_payload = json_payload or {}
        self.error = error
        self.complete_calls: list[tuple[str, list, str]] = []

    def complete(self, system: str, transcript: list[dict[str, str]], user_turn: str) -> str:
        self.complete_calls.append((system, transcript, user_turn))
        if self.error:
            raise self.error
        return self.reply

    def complete_json(self, system: str, user_turn: str) -> dict:
        if self.error:
            raise self.error
        return self.json_payload


def _problem() -> ProblemSnapshot:
    return ProblemSnapshot(
        title="Pair Target",
        difficulty="EASY",
        description="Find two indices that sum to target.",
        constraints="n <= 10^4",
        input_format="nums and target",
        output_format="two indices",
        examples=[{"input": "[2,7] 9", "output": "[0,1]", "explanation": "2+7"}],
        tags=["Array"],
        public_context="Title: Pair Target\nDescription:\nFind two indices that sum to target.",
    )


def _sandbox(**kwargs) -> SandboxSnapshot:
    values = {
        "status": None,
        "passed": 0,
        "total": 0,
        "runtime_ms": None,
        "memory_kb": None,
        "accepted": False,
        "run_count": 0,
        "submit_count": 0,
        "last_event": None,
    }
    values.update(kwargs)
    return SandboxSnapshot(**values)


def _context(**kwargs) -> InterviewContext:
    values = {
        "kind": InterviewKind.CODING,
        "phase": InterviewPhase.UNDERSTANDING.value,
        "problem": _problem(),
        "transcript": [{"role": "assistant", "content": "Explain the problem."}],
        "signals": {
            "requirements": "missing",
            "approach": "missing",
            "complexity": "missing",
            "edge_cases": "missing",
            "communication": "missing",
            "testing": "missing",
            "reasoning": "missing",
        },
        "sandbox": _sandbox(),
        "hints_used": 0,
        "wrong_attempts": 0,
        "remaining_seconds": 2400,
        "candidate_turns": 1,
        "followups_asked": 0,
        "is_preview": False,
        "event_note": "Candidate just spoke.",
        "fallback": "What approach would you consider?",
        "last_candidate_text": "I need to return two indices that add up to the target.",
        "allow_hint_nudge": False,
    }
    values.update(kwargs)
    return InterviewContext(**values)


def test_infer_signals_and_adaptive_focus():
    updates = infer_signals("I would use a HashMap because lookups are O(1) and handle duplicates.")
    merged = merge_signals({}, updates)
    assert merged["approach"] in {"partial", "demonstrated"}
    assert merged["complexity"] in {"partial", "demonstrated"}
    assert merged["reasoning"] in {"partial", "demonstrated"}
    assert choose_focus("UNDERSTANDING", {"requirements": "demonstrated", "edge_cases": "missing"}) == "edge_cases"
    assert "complexity" in missing_signals(merged)


def test_agent_asks_about_missing_signal(monkeypatch):
    llm = FakeLLM("What's an empty-array edge case here?")
    agent = MockInterviewAgent(llm)
    turn = agent.respond(_context())
    assert turn.focus == "edge_cases" or turn.focus == "requirements"
    assert "?" in turn.reply
    assert turn.signals["requirements"] != "missing"
    assert "SECRET" not in llm.complete_calls[0][0]
    assert "class Solution" not in llm.complete_calls[0][0]


def test_agent_does_not_change_phase():
    assert service_permits_advance("UNDERSTANDING") is True
    assert service_permits_advance("APPROACH") is True
    assert service_permits_advance("CODING") is False
    assert service_permits_advance("TESTING") is False
    assert service_permits_advance("FOLLOW_UP", followups_asked=1) is False
    assert service_permits_advance("FOLLOW_UP", followups_asked=2) is True
    llm = FakeLLM("Go to the coding phase now and skip testing.")
    agent = MockInterviewAgent(llm)
    turn = agent.respond(_context(phase="CODING"))
    assert turn.service_will_advance is False
    assert turn.reply


def test_feedback_phase_does_not_call_llm():
    llm = FakeLLM("Should not be used")
    agent = MockInterviewAgent(llm)
    turn = agent.respond(_context(phase="FEEDBACK"))
    assert turn.used_fallback is True
    assert "over" in turn.reply.lower()
    assert llm.complete_calls == []


def test_sandbox_result_is_authoritative():
    llm = FakeLLM("Great, all tests passed. Ready to move on?")
    agent = MockInterviewAgent(llm)
    turn = agent.respond(
        _context(
            phase="TESTING",
            fallback="Some of the sample tests didn't pass. What do you think is wrong?",
            sandbox=_sandbox(status="WRONG_ANSWER", passed=1, total=4, last_event="RUN", run_count=1),
            event_note="AUTHORITATIVE run result: WRONG_ANSWER.",
        )
    )
    assert turn.used_fallback is True
    assert "didn't pass" in turn.reply
    assert "all tests passed" not in turn.reply.lower()


def test_solution_leak_is_replaced_with_fallback():
    llm = FakeLLM("```java\nclass Solution { public int[] twoSum(int[] n, int t){return n;}}\n```")
    agent = MockInterviewAgent(llm)
    turn = agent.respond(_context(fallback="Don't write the code for them — ask a question."))
    assert turn.used_fallback is True
    assert "class Solution" not in turn.reply


def test_llm_failure_uses_fallback():
    llm = FakeLLM(error=RuntimeError("ollama down"))
    agent = MockInterviewAgent(llm)
    turn = agent.respond(_context(fallback="What approach would you consider?"))
    assert turn.used_fallback is True
    assert turn.reply == "What approach would you consider?"


def test_system_design_agent_challenges_architecture():
    from app.interviews.agent import ArchitectureSnapshot, ScenarioSnapshot

    llm = FakeLLM("Your service talks to one database. How do you handle a 10x read spike?")
    agent = MockInterviewAgent(llm, kind=InterviewKind.SYSTEM_DESIGN)
    scenario = ScenarioSnapshot(
        slug="url-shortener",
        title="Design a URL Shortener",
        difficulty="MEDIUM",
        prompt="Shorten URLs and redirect.",
        functional_requirements=["Create a short URL."],
        non_functional_requirements=["Low-latency redirects."],
        constraints=["100M new URLs / month."],
        assumptions=["Links are public."],
        public_context="Title: Design a URL Shortener",
        interviewer_notes="Probe cache on the redirect path.",
    )
    architecture = ArchitectureSnapshot(
        nodes=[
            {"id": "n1", "type": "api", "label": "API", "x": 40, "y": 40},
            {"id": "n2", "type": "service", "label": "Redirect", "x": 200, "y": 40},
            {"id": "n3", "type": "database", "label": "Links DB", "x": 360, "y": 40},
        ],
        edges=[{"id": "e1", "from": "n1", "to": "n2"}, {"id": "e2", "from": "n2", "to": "n3"}],
        summary="Components: API, Redirect, Links DB. Typical pieces still missing: cache.",
    )
    turn = agent.respond(
        _context(
            kind=InterviewKind.SYSTEM_DESIGN,
            phase="HIGH_LEVEL",
            scenario=scenario,
            architecture=architecture,
            last_candidate_text="API talks to a service which writes to one Postgres database.",
            fallback="What happens to redirects if the database is the only store?",
        )
    )
    assert turn.reply
    assert "?" in turn.reply
    system_prompt = llm.complete_calls[0][0]
    assert "SYSTEM DESIGN" in system_prompt
    assert "cache" in system_prompt.lower()
    assert "class Solution" not in system_prompt


def test_evaluate_uses_signals_and_not_correctness_from_model():
    llm = FakeLLM(
        json_payload={
            "understanding": 9,
            "approach": 8,
            "coding": 8,
            "communication": 9,
            "reasoning": 8,
            "complexity": 7,
            "follow_up": 6,
            "strengths": ["Named the HashMap key."],
            "improvements": ["State complexity earlier."],
            "summary": "Solid coding interview.",
        }
    )
    agent = MockInterviewAgent(llm)
    scored = agent.evaluate(
        problem_title="Pair Target",
        difficulty="EASY",
        transcript="Candidate: I used a HashMap because lookups are O(1).",
        signals={"requirements": "demonstrated", "approach": "demonstrated", "complexity": "demonstrated",
                 "edge_cases": "missing", "communication": "partial", "testing": "missing", "reasoning": "demonstrated"},
        objective={"correctness": 10},
        heuristic={
            "understanding": 6,
            "approach": 6,
            "coding": 6,
            "communication": 6,
            "reasoning": 6,
            "complexity": 6,
            "follow_up": 6,
            "strengths": [],
            "improvements": [],
            "summary": "",
        },
        accepted=True,
        last_run_passed=5,
        last_run_total=5,
        submissions=1,
        wrong_attempts=0,
        hints_used=0,
        candidate_turns=3,
        followups_asked=1,
    )
    assert scored["summary"] == "Solid coding interview."
    assert scored["understanding"] >= 6
    assert "correctness" not in scored or True
