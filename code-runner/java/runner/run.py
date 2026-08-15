#!/usr/bin/env python3
"""Compile and execute a Java Solution against job.json test cases.

This process runs inside the isolated runner container. It never reads
application environment variables or host secrets.
"""

from __future__ import annotations

import json
import os
import subprocess
import time
from pathlib import Path

WORKSPACE = Path(os.environ.get("RUNNER_WORKSPACE", "/workspace"))
JOB_PATH = WORKSPACE / "job.json"
RESULT_PATH = WORKSPACE / "result.json"


def write_result(payload: dict) -> None:
    RESULT_PATH.write_text(json.dumps(payload), encoding="utf-8")


def normalize(value: str | None) -> str:
    if value is None:
        return ""
    return value.replace("\r\n", "\n").replace("\r", "\n").strip().replace(" ", "")


def same_multiset(actual: str, expected: str) -> bool:
    def tokens(raw: str) -> list[str]:
        text = raw.strip()
        if text.startswith("[") and text.endswith("]"):
            text = text[1:-1]
        items: list[str] = []
        depth = 0
        quote = False
        current: list[str] = []
        for index, char in enumerate(text):
            if char == '"' and (index == 0 or text[index - 1] != "\\"):
                quote = not quote
            if not quote:
                if char in "[{":
                    depth += 1
                elif char in "]}":
                    depth -= 1
                elif char == "," and depth == 0:
                    items.append("".join(current))
                    current = []
                    continue
            current.append(char)
        if current:
            items.append("".join(current))
        return sorted(items)

    return tokens(actual) == tokens(expected)


def outputs_match(actual: str, expected: str, compare: str) -> bool:
    left = normalize(actual)
    right = normalize(expected)
    if left == right:
        return True
    if compare == "any_order":
        return same_multiset(left, right)
    return False


def compile_sources() -> tuple[bool, str]:
    sources = [
        path.name
        for path in WORKSPACE.glob("*.java")
        if path.name.endswith(".java")
    ]
    if "Solution.java" not in sources or "Main.java" not in sources:
        return False, "Missing Solution.java or Main.java"
    proc = subprocess.run(
        ["javac", "-encoding", "UTF-8", *sources],
        cwd=WORKSPACE,
        capture_output=True,
        text=True,
        timeout=20,
        check=False,
    )
    output = (proc.stderr or proc.stdout or "").strip()
    return proc.returncode == 0, output


def run_one(test: dict, timeout_ms: int, memory_mb: int) -> dict:
    started = time.monotonic()
    try:
        proc = subprocess.run(
            [
                "java",
                f"-Xmx{max(32, memory_mb - 32)}m",
                "-Xms16m",
                "-Xss256k",
                "-Djava.security.egd=file:/dev/urandom",
                "Main",
            ],
            cwd=WORKSPACE,
            input=test.get("input", ""),
            capture_output=True,
            text=True,
            timeout=max(timeout_ms / 1000.0, 0.2),
            check=False,
        )
    except subprocess.TimeoutExpired:
        return {
            "id": test.get("id"),
            "hidden": bool(test.get("hidden")),
            "status": "TIME_LIMIT_EXCEEDED",
            "input": test.get("input"),
            "expected_output": test.get("expected"),
            "actual_output": "",
            "runtime_ms": timeout_ms,
            "error_message": "Execution timed out.",
        }

    runtime_ms = int((time.monotonic() - started) * 1000)
    stderr = (proc.stderr or "").strip()
    stdout = (proc.stdout or "").strip()

    if proc.returncode != 0:
        status = "RUNTIME_ERROR"
        if "OutOfMemoryError" in stderr or proc.returncode == 137:
            status = "MEMORY_LIMIT_EXCEEDED"
        return {
            "id": test.get("id"),
            "hidden": bool(test.get("hidden")),
            "status": status,
            "input": test.get("input"),
            "expected_output": test.get("expected"),
            "actual_output": stdout,
            "runtime_ms": runtime_ms,
            "error_message": stderr or "Runtime error.",
        }

    return {
        "id": test.get("id"),
        "hidden": bool(test.get("hidden")),
        "status": "PASSED" if True else "WRONG_ANSWER",
        "input": test.get("input"),
        "expected_output": test.get("expected"),
        "actual_output": stdout,
        "runtime_ms": runtime_ms,
        "error_message": None,
        "_stdout": stdout,
    }


def overall_status(results: list[dict], compile_ok: bool) -> str:
    if not compile_ok:
        return "COMPILATION_ERROR"
    if any(item["status"] == "TIME_LIMIT_EXCEEDED" for item in results):
        return "TIME_LIMIT_EXCEEDED"
    if any(item["status"] == "MEMORY_LIMIT_EXCEEDED" for item in results):
        return "MEMORY_LIMIT_EXCEEDED"
    if any(item["status"] == "RUNTIME_ERROR" for item in results):
        return "RUNTIME_ERROR"
    if any(item["status"] == "WRONG_ANSWER" for item in results):
        return "WRONG_ANSWER"
    return "ACCEPTED"


def main() -> int:
    if not JOB_PATH.exists():
        write_result(
            {
                "status": "INTERNAL_ERROR",
                "passed": 0,
                "total": 0,
                "compile_output": "Missing job.json",
                "test_results": [],
            }
        )
        return 1

    job = json.loads(JOB_PATH.read_text(encoding="utf-8"))
    tests = list(job.get("tests") or [])
    compare = job.get("compare", "exact")
    timeout_ms = int(job.get("timeout_ms") or 2000)
    memory_mb = int(job.get("memory_mb") or 192)

    ok, compile_output = compile_sources()
    if not ok:
        write_result(
            {
                "status": "COMPILATION_ERROR",
                "runtime_ms": None,
                "memory_kb": None,
                "passed": 0,
                "total": len(tests),
                "compile_output": compile_output or "Compilation failed.",
                "test_results": [],
            }
        )
        return 0

    results = []
    for test in tests:
        item = run_one(test, timeout_ms, memory_mb)
        if item["status"] == "PASSED":
            if not outputs_match(item.pop("_stdout", item.get("actual_output", "")), test.get("expected", ""), compare):
                item["status"] = "WRONG_ANSWER"
                item["error_message"] = None
        else:
            item.pop("_stdout", None)
        results.append(item)

    passed = sum(1 for item in results if item["status"] == "PASSED")
    runtime = max((item.get("runtime_ms") or 0) for item in results) if results else 0
    write_result(
        {
            "status": overall_status(results, True),
            "runtime_ms": runtime,
            "memory_kb": None,
            "passed": passed,
            "total": len(tests),
            "compile_output": None,
            "test_results": results,
        }
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
