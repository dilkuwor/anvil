from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from uuid import UUID

import httpx

from app.common.config import get_settings
from app.common.logging import get_logger
from app.execution.harness import JAVA_HELPERS, LIST_NODE_JAVA, TREE_NODE_JAVA, generate_main
from app.execution.imports import prepare_source

logger = get_logger(__name__)


@dataclass
class SandboxTest:
    id: UUID
    input: str
    expected_output: str
    hidden: bool


@dataclass
class SandboxResult:
    status: str
    runtime_ms: int | None
    memory_kb: int | None
    passed: int
    total: int
    compile_output: str | None
    test_results: list[dict[str, Any]]


def execute_java(
    *,
    source_code: str,
    signature: dict,
    tests: list[SandboxTest],
    time_limit_ms: int,
    memory_limit_kb: int,
    submission_id: UUID | None = None,
) -> SandboxResult:
    settings = get_settings()
    payload = {
        "source_code": prepare_source(source_code),
        "main_source": generate_main(signature),
        "helpers_source": JAVA_HELPERS,
        "list_node_source": LIST_NODE_JAVA,
        "tree_node_source": TREE_NODE_JAVA,
        "compare": signature.get("compare", "exact"),
        "timeout_ms": time_limit_ms,
        "memory_mb": max(64, min(memory_limit_kb // 1024, settings.code_runner_memory_mb)),
        "tests": [
            {
                "id": str(test.id),
                "input": test.input,
                "expected": test.expected_output,
                "hidden": test.hidden,
            }
            for test in tests
        ],
    }

    if settings.code_runner_url:
        return _execute_via_http(payload, settings.code_runner_url, settings.code_runner_timeout_seconds)

    return _execute_via_docker(
        payload,
        image=settings.code_runner_image,
        timeout_seconds=settings.code_runner_timeout_seconds,
        memory_mb=settings.code_runner_memory_mb,
        cpus=settings.code_runner_cpus,
        job_dir=settings.code_runner_job_dir,
        host_job_dir=settings.code_runner_host_job_dir,
        submission_id=submission_id,
    )


def _execute_via_http(payload: dict, url: str, timeout: int) -> SandboxResult:
    try:
        response = httpx.post(url.rstrip("/") + "/execute", json=payload, timeout=timeout + 5)
        response.raise_for_status()
        return _parse_result(response.json())
    except httpx.HTTPError as exc:
        logger.exception("code_runner_http_failed", error=str(exc))
        return _internal_error("Unable to execute submission.")


def _prepare_workdir(job_dir: str = "", host_job_dir: str = "") -> tuple[Path, Path]:
    """Create a job workspace and the path the host Docker daemon should mount.

    When the API runs inside Docker, tempfile paths like /tmp/ia-java-* exist only
    inside the API container. The host dockerd bind-mounts from the host filesystem,
    so jobs must live on a shared volume (CODE_RUNNER_JOB_DIR).
    """
    root = job_dir.strip()
    host_root = (host_job_dir or job_dir).strip()
    if root:
        base = Path(root)
        base.mkdir(parents=True, exist_ok=True)
        workdir = Path(tempfile.mkdtemp(prefix="ia-java-", dir=base))
    else:
        workdir = Path(tempfile.mkdtemp(prefix="ia-java-"))
    # Runner container is uid 1000; API may be root or another uid.
    workdir.chmod(0o777)
    if host_root and root and host_root != root:
        return workdir, Path(host_root) / workdir.name
    return workdir, workdir


def _execute_via_docker(
    payload: dict,
    *,
    image: str,
    timeout_seconds: int,
    memory_mb: int,
    cpus: float,
    submission_id: UUID | None,
    job_dir: str = "",
    host_job_dir: str = "",
) -> SandboxResult:
    workdir, mount_path = _prepare_workdir(job_dir, host_job_dir)
    try:
        _write_job(workdir, payload)
        cmd = [
            "docker",
            "run",
            "--rm",
            "--network",
            "none",
            "--memory",
            f"{memory_mb}m",
            "--memory-swap",
            f"{memory_mb}m",
            "--cpus",
            str(cpus),
            "--pids-limit",
            "64",
            "--read-only",
            "--tmpfs",
            "/tmp:rw,exec,nosuid,size=64m",
            "--user",
            "1000:1000",
            "--cap-drop",
            "ALL",
            "--security-opt",
            "no-new-privileges",
            "--workdir",
            "/workspace",
            "-v",
            f"{mount_path}:/workspace:rw",
            image,
        ]
        logger.info(
            "sandbox_start",
            submission_id=str(submission_id) if submission_id else None,
            image=image,
            mount_path=str(mount_path),
        )
        completed = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout_seconds + 5,
            check=False,
        )
        result_path = workdir / "result.json"
        if result_path.exists():
            return _parse_result(json.loads(result_path.read_text(encoding="utf-8")))
        stderr = (completed.stderr or completed.stdout or "").strip()
        logger.error(
            "sandbox_missing_result",
            returncode=completed.returncode,
            stderr=stderr[:2000],
            submission_id=str(submission_id) if submission_id else None,
        )
        if completed.returncode == 137:
            return SandboxResult(
                status="MEMORY_LIMIT_EXCEEDED",
                runtime_ms=None,
                memory_kb=None,
                passed=0,
                total=len(payload["tests"]),
                compile_output=None,
                test_results=[],
            )
        return _internal_error("Unable to execute submission.")
    except subprocess.TimeoutExpired:
        return SandboxResult(
            status="TIME_LIMIT_EXCEEDED",
            runtime_ms=timeout_seconds * 1000,
            memory_kb=None,
            passed=0,
            total=len(payload["tests"]),
            compile_output=None,
            test_results=[],
        )
    except FileNotFoundError:
        logger.exception("docker_not_available")
        return _internal_error("Unable to execute submission.")
    except Exception:
        logger.exception("sandbox_failed", submission_id=str(submission_id) if submission_id else None)
        return _internal_error("Unable to execute submission.")
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


def _write_job(workdir: Path, payload: dict) -> None:
    (workdir / "Solution.java").write_text(payload["source_code"], encoding="utf-8")
    (workdir / "Main.java").write_text(payload["main_source"], encoding="utf-8")
    (workdir / "Helpers.java").write_text(payload["helpers_source"], encoding="utf-8")
    (workdir / "ListNode.java").write_text(payload["list_node_source"], encoding="utf-8")
    (workdir / "TreeNode.java").write_text(payload["tree_node_source"], encoding="utf-8")
    (workdir / "job.json").write_text(
        json.dumps(
            {
                "timeout_ms": payload["timeout_ms"],
                "memory_mb": payload["memory_mb"],
                "compare": payload["compare"],
                "tests": payload["tests"],
            }
        ),
        encoding="utf-8",
    )


def _parse_result(data: dict) -> SandboxResult:
    return SandboxResult(
        status=data.get("status", "INTERNAL_ERROR"),
        runtime_ms=data.get("runtime_ms"),
        memory_kb=data.get("memory_kb"),
        passed=int(data.get("passed", 0)),
        total=int(data.get("total", 0)),
        compile_output=data.get("compile_output"),
        test_results=list(data.get("test_results") or []),
    )


def _internal_error(message: str) -> SandboxResult:
    return SandboxResult(
        status="INTERNAL_ERROR",
        runtime_ms=None,
        memory_kb=None,
        passed=0,
        total=0,
        compile_output=message,
        test_results=[],
    )
