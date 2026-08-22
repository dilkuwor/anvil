from __future__ import annotations

from typing import Any, Callable

from sqlalchemy.orm import Session

from app.common.errors import AppError, ForbiddenError, NotFoundError
from app.mcp import service
from app.mcp.models import McpToken
from app.mcp.tokens import record_access
from app.users.models import User

PROTOCOL_VERSIONS = ("2025-06-18", "2025-03-26", "2024-11-05")
DEFAULT_PROTOCOL = "2025-03-26"
SERVER_NAME = "AnvilPrep"
SERVER_VERSION = "0.1.0"
INSTRUCTIONS = (
    "AnvilPrep study copilot. Call get_my_overview first when the user asks how they are doing. "
    "Use search_anvil to find lessons, problems, notes, lists, cheatsheets, or completed interviews, "
    "then get_resource with the returned anvil:// URI. "
    "Hidden tests and reference solutions are never included. Do not invent slugs."
)

ToolHandler = Callable[..., dict]


def _str_list(value: Any) -> list[str] | None:
    if value is None:
        return None
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()]
    return None


def handle_search(db: Session, user: User, arguments: dict) -> dict:
    return service.search_anvil(
        db,
        user,
        query=str(arguments.get("query") or ""),
        types=_str_list(arguments.get("types")),
        limit=int(arguments.get("limit") or service.SEARCH_LIMIT),
    )


def handle_resource(db: Session, user: User, arguments: dict) -> dict:
    uri = str(arguments.get("uri") or "").strip()
    if not uri:
        raise AppError("uri is required.", status_code=422, code="invalid_uri")
    return service.read_resource(db, user, uri, offset=int(arguments.get("offset") or 0))


def handle_overview(db: Session, user: User, _arguments: dict) -> dict:
    return service.get_my_overview(db, user)


def handle_progress(db: Session, user: User, arguments: dict) -> dict:
    topic = arguments.get("topic_slug")
    return service.get_my_progress(
        db,
        user,
        topic_slug=str(topic).strip() if topic else None,
        days=int(arguments.get("days") or 30),
    )


def handle_list_work(db: Session, user: User, arguments: dict) -> dict:
    kind = arguments.get("kind")
    source_type = arguments.get("source_type")
    source_id = arguments.get("source_id")
    return service.list_my_work(
        db,
        user,
        kind=str(kind).strip() if kind else None,
        source_type=str(source_type).strip() if source_type else None,
        source_id=str(source_id).strip() if source_id else None,
        limit=int(arguments.get("limit") or service.WORK_LIMIT),
    )


def handle_submission(db: Session, user: User, arguments: dict) -> dict:
    submission_id = str(arguments.get("submission_id") or "").strip()
    if not submission_id:
        raise AppError("submission_id is required.", status_code=422, code="invalid_id")
    return service.get_submission(db, user, submission_id)


def handle_interview(db: Session, user: User, arguments: dict) -> dict:
    interview_id = str(arguments.get("interview_id") or "").strip()
    if not interview_id:
        raise AppError("interview_id is required.", status_code=422, code="invalid_id")
    return service.get_interview_review(db, user, interview_id)


TOOLS: list[dict[str, Any]] = [
    {
        "name": "search_anvil",
        "description": (
            "Search AnvilPrep learn content, problems, cheatsheets, your notes, "
            "problem lists, and completed interviews. Returns short hits with anvil:// URIs."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search text."},
                "types": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "enum": ["learn", "problems", "cheatsheets", "notes", "lists", "interviews"],
                    },
                    "description": "Optional subset of catalogs to search.",
                },
                "limit": {"type": "integer", "minimum": 1, "maximum": 10, "default": 10},
            },
            "required": ["query"],
        },
        "annotations": {"readOnlyHint": True, "destructiveHint": False, "openWorldHint": False},
        "handler": handle_search,
    },
    {
        "name": "get_resource",
        "description": (
            "Fetch one AnvilPrep object by URI from search_anvil or resource templates "
            "(anvil://learn/lessons/{slug}, anvil://problems/{slug}, anvil://notes/{id}, ...)."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "uri": {"type": "string", "description": "anvil:// URI."},
                "offset": {
                    "type": "integer",
                    "minimum": 0,
                    "default": 0,
                    "description": "Continue a truncated lesson or cheat sheet body.",
                },
            },
            "required": ["uri"],
        },
        "annotations": {"readOnlyHint": True, "destructiveHint": False, "openWorldHint": False},
        "handler": handle_resource,
    },
    {
        "name": "get_my_overview",
        "description": (
            "Compact snapshot of the authenticated user's solved counts, streak, learn progress, "
            "interview readiness, weak topics, and recommended problems. Call this first for coaching."
        ),
        "inputSchema": {"type": "object", "properties": {}},
        "annotations": {"readOnlyHint": True, "destructiveHint": False, "openWorldHint": False},
        "handler": handle_overview,
    },
    {
        "name": "get_my_progress",
        "description": "Filtered progress: topic breakdown, activity calendar, and learn totals.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "topic_slug": {"type": "string", "description": "Limit topic_progress to this slug."},
                "days": {"type": "integer", "minimum": 7, "maximum": 366, "default": 30},
            },
        },
        "annotations": {"readOnlyHint": True, "destructiveHint": False, "openWorldHint": False},
        "handler": handle_progress,
    },
    {
        "name": "list_my_work",
        "description": "List the user's notes, submissions, completed interviews, and problem lists.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "kind": {
                    "type": "string",
                    "enum": ["notes", "submissions", "interviews", "lists"],
                    "description": "Omit to include a sample of each.",
                },
                "source_type": {"type": "string", "description": "For notes: LESSON, PROBLEM, or SYSTEM_DESIGN."},
                "source_id": {"type": "string", "description": "Filter notes or submissions by lesson/problem id or slug."},
                "limit": {"type": "integer", "minimum": 1, "maximum": 20, "default": 20},
            },
        },
        "annotations": {"readOnlyHint": True, "destructiveHint": False, "openWorldHint": False},
        "handler": handle_list_work,
    },
    {
        "name": "get_submission",
        "description": (
            "Your Java submission: source, compile output, and visible test results. "
            "Hidden test input/output is omitted."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {"submission_id": {"type": "string"}},
            "required": ["submission_id"],
        },
        "annotations": {"readOnlyHint": True, "destructiveHint": False, "openWorldHint": False},
        "handler": handle_submission,
    },
    {
        "name": "get_interview_review",
        "description": (
            "A completed mock interview: scores, signals, transcript, and architecture summary. "
            "In-progress sessions are not available."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {"interview_id": {"type": "string"}},
            "required": ["interview_id"],
        },
        "annotations": {"readOnlyHint": True, "destructiveHint": False, "openWorldHint": False},
        "handler": handle_interview,
    },
]

_TOOL_BY_NAME = {tool["name"]: tool for tool in TOOLS}

PROMPTS: list[dict[str, Any]] = [
    {
        "name": "analyze_gaps",
        "description": "Find three weak areas from overview, topic progress, and interviews, with real slugs to study next.",
        "arguments": [],
        "message": (
            "Call get_my_overview, then get_my_progress. Optionally list_my_work with kind=interviews. "
            "Identify the three weakest areas. For each, say why (using the user's numbers) and name "
            "concrete AnvilPrep lesson slugs, problem slugs, or cheat sheets to do next. Do not invent slugs."
        ),
    },
    {
        "name": "quiz_me",
        "description": "Quiz the user on a lesson or topic using AnvilPrep content, then grade the answers.",
        "arguments": [
            {
                "name": "target",
                "description": "Lesson slug, topic slug, or anvil:// URI. Optional if the user already named one.",
                "required": False,
            }
        ],
        "message": (
            "Quiz the user from AnvilPrep content only. If a target is given, get_resource that lesson or topic. "
            "Otherwise search_anvil, then fetch. Ask interview-style questions one at a time. After each answer, "
            "grade it against the lesson and continue. Do not dump a full problem solution."
        ),
    },
    {
        "name": "review_solution",
        "description": "Review the user's latest Java submission against the public problem statement.",
        "arguments": [
            {
                "name": "problem_slug",
                "description": "Problem slug to review. Optional if the user named a problem.",
                "required": False,
            }
        ],
        "message": (
            "Review MY solution, not a canonical one. Fetch the public problem with get_resource "
            "(anvil://problems/{slug}) and the user's code with list_my_work kind=submissions and get_submission. "
            "Comment on correctness vs visible tests, complexity, Java style, and edge cases. "
            "Never reveal hidden tests or a reference solution."
        ),
    },
    {
        "name": "review_interview",
        "description": "Review a completed mock interview and say what to drill.",
        "arguments": [
            {
                "name": "interview_id",
                "description": "Completed interview id. Optional; otherwise list recent completed interviews.",
                "required": False,
            }
        ],
        "message": (
            "Review a completed AnvilPrep mock interview. If no id is given, list_my_work kind=interviews "
            "and pick the latest. Call get_interview_review. Focus on signals marked missing or partial "
            "and give a short drill plan with real lesson or problem slugs."
        ),
    },
    {
        "name": "plan_week",
        "description": "Build a 5-day plan from readiness, lists, and learn progress, tied to real slugs.",
        "arguments": [],
        "message": (
            "Call get_my_overview, get_my_progress, and list_my_work (lists and notes). "
            "Produce a 5-day interview prep plan. Each day must cite real AnvilPrep lesson slugs, "
            "problem slugs, or list names. Keep it realistic for about 60–90 minutes per day."
        ),
    },
]

_PROMPT_BY_NAME = {item["name"]: item for item in PROMPTS}


def dispatch(db: Session, user: User, token: McpToken, message: dict) -> dict | None:
    if not isinstance(message, dict) or message.get("jsonrpc") != "2.0":
        return _rpc_error(None, -32600, "Invalid Request")
    method = message.get("method")
    rpc_id = message.get("id")
    params = message.get("params") if isinstance(message.get("params"), dict) else {}
    if not isinstance(method, str):
        return _rpc_error(rpc_id, -32600, "Invalid Request")
    if rpc_id is None:
        return None
    try:
        result = _call(db, user, token, method, params)
    except (NotFoundError, ForbiddenError) as exc:
        record_access(db, token, method, _audit_name(method, params), "not_found")
        if method == "tools/call":
            return _rpc_result(rpc_id, _tool_error(exc.message))
        return _rpc_error(rpc_id, -32002, exc.message)
    except AppError as exc:
        record_access(db, token, method, _audit_name(method, params), exc.code)
        if method == "tools/call":
            return _rpc_result(rpc_id, _tool_error(exc.message))
        if exc.code == "method_not_found":
            return _rpc_error(rpc_id, -32601, exc.message)
        return _rpc_error(rpc_id, -32602, exc.message)
    except Exception:
        record_access(db, token, method, _audit_name(method, params), "error")
        raise
    if method in {"tools/call", "resources/read", "prompts/get"}:
        record_access(db, token, method, _audit_name(method, params), "ok")
    return _rpc_result(rpc_id, result)


def _call(db: Session, user: User, _token: McpToken, method: str, params: dict) -> Any:
    if method == "initialize":
        requested = str(params.get("protocolVersion") or DEFAULT_PROTOCOL)
        version = requested if requested in PROTOCOL_VERSIONS else DEFAULT_PROTOCOL
        return {
            "protocolVersion": version,
            "capabilities": {
                "tools": {"listChanged": False},
                "resources": {"subscribe": False, "listChanged": False},
                "prompts": {"listChanged": False},
            },
            "serverInfo": {"name": SERVER_NAME, "version": SERVER_VERSION},
            "instructions": INSTRUCTIONS,
        }
    if method == "ping":
        return {}
    if method == "tools/list":
        return {
            "tools": [
                {
                    "name": tool["name"],
                    "description": tool["description"],
                    "inputSchema": tool["inputSchema"],
                    "annotations": tool["annotations"],
                }
                for tool in TOOLS
            ]
        }
    if method == "tools/call":
        name = str(params.get("name") or "")
        arguments = params.get("arguments") if isinstance(params.get("arguments"), dict) else {}
        tool = _TOOL_BY_NAME.get(name)
        if tool is None:
            raise AppError(f"Unknown tool: {name}", status_code=404, code="unknown_tool")
        payload = tool["handler"](db, user, arguments)
        return {
            "content": [{"type": "text", "text": service.to_json(payload)}],
            "structuredContent": payload,
            "isError": False,
        }
    if method == "resources/list":
        return {"resources": service.resource_descriptors()}
    if method == "resources/templates/list":
        return {"resourceTemplates": service.resource_templates()}
    if method == "resources/read":
        uri = str(params.get("uri") or "").strip()
        if not uri:
            raise AppError("uri is required.", status_code=422, code="invalid_uri")
        payload = service.read_resource(db, user, uri)
        return {
            "contents": [
                {
                    "uri": uri,
                    "mimeType": "application/json",
                    "text": service.to_json(payload),
                }
            ]
        }
    if method == "prompts/list":
        return {
            "prompts": [
                {
                    "name": item["name"],
                    "description": item["description"],
                    "arguments": item["arguments"],
                }
                for item in PROMPTS
            ]
        }
    if method == "prompts/get":
        name = str(params.get("name") or "")
        prompt = _PROMPT_BY_NAME.get(name)
        if prompt is None:
            raise AppError(f"Unknown prompt: {name}", status_code=404, code="unknown_prompt")
        extra = params.get("arguments") if isinstance(params.get("arguments"), dict) else {}
        text = prompt["message"]
        if extra:
            text += "\n\nArguments: " + service.to_json(extra)
        return {
            "description": prompt["description"],
            "messages": [{"role": "user", "content": {"type": "text", "text": text}}],
        }
    raise AppError(f"Method not found: {method}", status_code=404, code="method_not_found")


def _tool_error(message: str) -> dict:
    return {
        "content": [{"type": "text", "text": message}],
        "isError": True,
    }


def _rpc_result(rpc_id: Any, result: Any) -> dict:
    return {"jsonrpc": "2.0", "id": rpc_id, "result": result}


def _rpc_error(rpc_id: Any, code: int, message: str) -> dict:
    return {"jsonrpc": "2.0", "id": rpc_id, "error": {"code": code, "message": message}}


def _audit_name(method: str, params: dict) -> str:
    if method == "tools/call":
        return str(params.get("name") or "")
    if method == "resources/read":
        return str(params.get("uri") or "")
    if method == "prompts/get":
        return str(params.get("name") or "")
    return ""
