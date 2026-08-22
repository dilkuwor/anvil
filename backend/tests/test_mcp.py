from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.common.enums import Difficulty, InterviewPhase, SubmissionStatus
from app.interviews.models import InterviewMessage, InterviewSession
from app.learn.seed import seed_learning
from app.mcp.models import McpToken
from app.mcp.rate_limit import reset as reset_rate_limit
from app.notes.models import Note
from app.problems.models import Problem, TestCase
from app.submissions.models import Submission, SubmissionTestResult


def setup_function() -> None:
    reset_rate_limit()


def _rpc(client, token: str, method: str, params: dict | None = None, rpc_id=1):
    return client.post(
        "/mcp",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
        json={"jsonrpc": "2.0", "id": rpc_id, "method": method, "params": params or {}},
    )


def _create_token(auth_client, name: str = "test") -> str:
    created = auth_client.post("/api/v1/mcp/tokens", json={"name": name})
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["token"].startswith("ia_mcp_")
    return body["token"]


def _seed_problem(db, *, slug: str = "pair-target") -> Problem:
    problem = Problem(
        id=uuid4(),
        title="Pair Target",
        slug=slug,
        description="Find two indices.",
        difficulty=Difficulty.EASY.value,
        starter_code="class Solution {}",
        reference_solution="SECRET_SOLUTION",
        is_active=True,
    )
    db.add(problem)
    visible = TestCase(
        id=uuid4(),
        problem_id=problem.id,
        input="[1,2]\\n3",
        expected_output="[0,1]",
        is_hidden=False,
        execution_order=1,
    )
    hidden = TestCase(
        id=uuid4(),
        problem_id=problem.id,
        input="HIDDEN_INPUT",
        expected_output="HIDDEN_OUTPUT",
        is_hidden=True,
        execution_order=2,
    )
    db.add_all([visible, hidden])
    db.commit()
    db.refresh(problem)
    return problem


def _user_id(auth_client) -> UUID:
    me = auth_client.get("/api/v1/auth/me")
    assert me.status_code == 200
    return UUID(me.json()["id"])


def test_mcp_probe_is_public(client):
    response = client.get("/mcp")
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "AnvilPrep"
    assert body["auth"] == "bearer"


def test_mcp_requires_pat_not_cookie_or_jwt(auth_client):
    assert auth_client.post("/mcp", json={"jsonrpc": "2.0", "id": 1, "method": "initialize"}).status_code == 401
    jwt = auth_client.cookies.get("ia_access_token")
    assert jwt
    denied = auth_client.post(
        "/mcp",
        headers={"Authorization": f"Bearer {jwt}"},
        json={"jsonrpc": "2.0", "id": 1, "method": "initialize"},
    )
    assert denied.status_code == 401


def test_create_list_revoke_token(auth_client, db):
    created = auth_client.post("/api/v1/mcp/tokens", json={"name": "Grok"})
    assert created.status_code == 201
    body = created.json()
    token = body["token"]
    token_id = body["id"]
    assert token.startswith("ia_mcp_")
    assert body["token_prefix"] == token[:12]
    listed = auth_client.get("/api/v1/mcp/tokens").json()
    assert len(listed) == 1
    assert "token" not in listed[0]
    row = db.get(McpToken, UUID(token_id))
    assert row is not None
    assert token not in row.token_hash
    assert row.token_prefix == token[:12]

    revoked = auth_client.delete(f"/api/v1/mcp/tokens/{token_id}")
    assert revoked.status_code == 204
    assert auth_client.get("/api/v1/mcp/tokens").json() == []
    rejected = _rpc(auth_client, token, "initialize")
    assert rejected.status_code == 401


def test_initialize_and_tools(auth_client):
    token = _create_token(auth_client)
    init = _rpc(auth_client, token, "initialize", {"protocolVersion": "2025-03-26"})
    assert init.status_code == 200
    result = init.json()["result"]
    assert result["serverInfo"]["name"] == "AnvilPrep"
    assert "tools" in result["capabilities"]

    listed = _rpc(auth_client, token, "tools/list")
    names = {tool["name"] for tool in listed.json()["result"]["tools"]}
    assert names == {
        "search_anvil",
        "get_resource",
        "get_my_overview",
        "get_my_progress",
        "list_my_work",
        "get_submission",
        "get_interview_review",
    }
    prompts = _rpc(auth_client, token, "prompts/list")
    prompt_names = {item["name"] for item in prompts.json()["result"]["prompts"]}
    assert prompt_names == {"analyze_gaps", "quiz_me", "review_solution", "review_interview", "plan_week"}


def test_overview_search_and_lesson_resource(auth_client, db):
    seed_learning(db)
    db.commit()
    token = _create_token(auth_client)

    overview = _rpc(auth_client, token, "tools/call", {"name": "get_my_overview", "arguments": {}})
    assert overview.status_code == 200
    payload = overview.json()["result"]
    assert payload["isError"] is False
    text = payload["content"][0]["text"]
    assert "forger" in text
    assert "SECRET" not in text

    search = _rpc(
        auth_client,
        token,
        "tools/call",
        {"name": "search_anvil", "arguments": {"query": "hashmap", "types": ["learn"]}},
    )
    items = search.json()["result"]["structuredContent"]["items"]
    assert items
    lesson_hit = next(item for item in items if "lessons" in item["uri"])
    fetched = _rpc(
        auth_client,
        token,
        "tools/call",
        {"name": "get_resource", "arguments": {"uri": lesson_hit["uri"]}},
    )
    body = fetched.json()["result"]["structuredContent"]
    assert "takeaways" in body
    assert "interview_questions" in body
    assert "body" in body
    progress = auth_client.get("/api/v1/learn/progress").json()
    assert progress["completed_lessons"] == 0


def test_problem_resource_strips_reference_solution(auth_client, db):
    problem = _seed_problem(db)
    token = _create_token(auth_client)
    fetched = _rpc(
        auth_client,
        token,
        "tools/call",
        {"name": "get_resource", "arguments": {"uri": f"anvil://problems/{problem.slug}"}},
    )
    payload = fetched.json()["result"]["structuredContent"]
    blob = fetched.json()["result"]["content"][0]["text"]
    assert payload["title"] == "Pair Target"
    assert payload["status"] == "NOT_STARTED"
    assert "reference_solution" not in payload
    assert "SECRET_SOLUTION" not in blob
    assert "HIDDEN_INPUT" not in blob
    visible_inputs = [case["input"] for case in payload["visible_tests"]]
    assert "[1,2]\\n3" in visible_inputs


def test_submission_hides_hidden_case_io(auth_client, db):
    problem = _seed_problem(db)
    user_id = _user_id(auth_client)
    cases = sorted(problem.test_cases, key=lambda item: item.execution_order)
    submission = Submission(
        id=uuid4(),
        user_id=user_id,
        problem_id=problem.id,
        source_code="class Solution { int[] twoSum() { return new int[]{0,1}; } }",
        status=SubmissionStatus.ACCEPTED.value,
        passed_count=2,
        total_count=2,
    )
    db.add(submission)
    db.flush()
    db.add_all(
        [
            SubmissionTestResult(
                submission_id=submission.id,
                test_case_id=cases[0].id,
                status="PASSED",
                actual_output=cases[0].expected_output,
                expected_output=cases[0].expected_output,
            ),
            SubmissionTestResult(
                submission_id=submission.id,
                test_case_id=cases[1].id,
                status="PASSED",
                actual_output="SHOULD_NOT_LEAK",
                expected_output="HIDDEN_OUTPUT",
                error_message="nope",
            ),
        ]
    )
    db.commit()
    token = _create_token(auth_client)
    fetched = _rpc(
        auth_client,
        token,
        "tools/call",
        {"name": "get_submission", "arguments": {"submission_id": str(submission.id)}},
    )
    payload = fetched.json()["result"]["structuredContent"]
    blob = fetched.json()["result"]["content"][0]["text"]
    assert payload["source_code"].startswith("class Solution")
    assert "SHOULD_NOT_LEAK" not in blob
    assert "HIDDEN_OUTPUT" not in blob
    assert "HIDDEN_INPUT" not in blob
    hidden = next(item for item in payload["test_results"] if item["hidden"])
    assert hidden["actual_output"] is None
    assert hidden["expected_output"] is None
    assert hidden["error_message"] is None


def test_notes_and_interviews_are_owner_only(auth_client, client, db):
    problem = _seed_problem(db)
    owner_id = _user_id(auth_client)
    note = Note(
        user_id=owner_id,
        source_type="PROBLEM",
        source_id=str(problem.id),
        source_title=problem.title,
        source_href=f"/problems/{problem.slug}",
        title="Owner note",
        body="Do not share this.",
    )
    live = InterviewSession(
        id=uuid4(),
        user_id=owner_id,
        problem_id=problem.id,
        phase=InterviewPhase.UNDERSTANDING.value,
        is_preview=False,
    )
    done = InterviewSession(
        id=uuid4(),
        user_id=owner_id,
        problem_id=problem.id,
        phase=InterviewPhase.FEEDBACK.value,
        ended_at=datetime.now(UTC),
        is_preview=False,
        signals={"approach": "missing"},
        feedback={"overall": 6.0, "summary": "Need hashing practice."},
    )
    db.add_all([note, live, done])
    db.add(InterviewMessage(session_id=done.id, role="INTERVIEWER", content="Walk me through your approach."))
    db.commit()
    owner_token = _create_token(auth_client, "owner")

    other_created = client.post(
        "/api/v1/auth/register",
        json={"email": "third@example.com", "username": "third", "password": "anvilpass"},
    )
    assert other_created.status_code == 201
    other_token = _create_token(client, "other")

    stolen_note = _rpc(
        client,
        other_token,
        "tools/call",
        {"name": "get_resource", "arguments": {"uri": f"anvil://notes/{note.id}"}},
    )
    assert stolen_note.json()["result"]["isError"] is True
    assert "Do not share this." not in stolen_note.text

    stolen_interview = _rpc(
        client,
        other_token,
        "tools/call",
        {"name": "get_interview_review", "arguments": {"interview_id": str(done.id)}},
    )
    assert stolen_interview.json()["result"]["isError"] is True

    live_review = _rpc(
        auth_client,
        owner_token,
        "tools/call",
        {"name": "get_interview_review", "arguments": {"interview_id": str(live.id)}},
    )
    assert live_review.json()["result"]["isError"] is True
    assert "completed" in live_review.json()["result"]["content"][0]["text"].lower()

    review = _rpc(
        auth_client,
        owner_token,
        "tools/call",
        {"name": "get_interview_review", "arguments": {"interview_id": str(done.id)}},
    )
    payload = review.json()["result"]["structuredContent"]
    assert payload["signals"]["approach"] == "missing"
    assert payload["feedback"]["summary"] == "Need hashing practice."
    assert payload["transcript"]


def test_mcp_access_log(auth_client):
    token = _create_token(auth_client)
    _rpc(auth_client, token, "tools/call", {"name": "get_my_overview", "arguments": {}})
    logs = auth_client.get("/api/v1/mcp/access").json()
    assert logs
    assert logs[0]["method"] == "tools/call"
    assert logs[0]["name"] == "get_my_overview"
    assert logs[0]["status"] == "ok"
