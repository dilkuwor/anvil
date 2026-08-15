import json
import subprocess
import sys
from pathlib import Path

import pytest

RUNNER = Path(__file__).resolve().parents[1] / "java" / "runner" / "run.py"
HELPERS = Path(__file__).resolve().parents[2] / "backend" / "app" / "execution" / "harness.py"


def _write_support(workspace: Path) -> None:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))
    from app.execution.harness import JAVA_HELPERS, LIST_NODE_JAVA, TREE_NODE_JAVA, generate_main

    (workspace / "Helpers.java").write_text(JAVA_HELPERS)
    (workspace / "ListNode.java").write_text(LIST_NODE_JAVA)
    (workspace / "TreeNode.java").write_text(TREE_NODE_JAVA)
    (workspace / "Main.java").write_text(
        generate_main(
            {
                "method_name": "twoSum",
                "params": [{"name": "nums", "type": "int[]"}, {"name": "target", "type": "int"}],
                "return_type": "int[]",
                "compare": "any_order",
            }
        )
    )


def _run_job(workspace: Path, source: str, tests: list[dict], timeout_ms: int = 2000) -> dict:
    _write_support(workspace)
    (workspace / "Solution.java").write_text(source)
    (workspace / "job.json").write_text(
        json.dumps({"timeout_ms": timeout_ms, "memory_mb": 192, "compare": "any_order", "tests": tests})
    )
    env = {**dict(**__import__("os").environ), "RUNNER_WORKSPACE": str(workspace)}
    subprocess.run([sys.executable, str(RUNNER)], cwd=workspace, env=env, check=False, timeout=30)
    return json.loads((workspace / "result.json").read_text())


CORRECT = """
import java.util.*;
class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int need = target - nums[i];
            if (seen.containsKey(need)) return new int[] { seen.get(need), i };
            seen.put(nums[i], i);
        }
        return new int[] {};
    }
}
"""

WRONG = """
class Solution {
    public int[] twoSum(int[] nums, int target) {
        return new int[] {0, 0};
    }
}
"""

BAD_COMPILE = """
class Solution {
    public int[] twoSum(int[] nums, int target) {
        return
    }
}
"""

RUNTIME = """
class Solution {
    public int[] twoSum(int[] nums, int target) {
        return new int[] { nums[100], nums[101] };
    }
}
"""

TIMEOUT = """
class Solution {
    public int[] twoSum(int[] nums, int target) {
        while (true) {}
    }
}
"""

TESTS = [{"id": "1", "input": "[2,7,11,15]\\n9".replace("\\n", "\n"), "expected": "[0,1]", "hidden": False}]


@pytest.mark.skipif(not __import__("shutil").which("javac"), reason="javac required")
def test_correct_solution(tmp_path):
    result = _run_job(tmp_path, CORRECT, TESTS)
    assert result["status"] == "ACCEPTED"
    assert result["passed"] == 1


@pytest.mark.skipif(not __import__("shutil").which("javac"), reason="javac required")
def test_wrong_solution(tmp_path):
    result = _run_job(tmp_path, WRONG, TESTS)
    assert result["status"] == "WRONG_ANSWER"


@pytest.mark.skipif(not __import__("shutil").which("javac"), reason="javac required")
def test_compilation_error(tmp_path):
    result = _run_job(tmp_path, BAD_COMPILE, TESTS)
    assert result["status"] == "COMPILATION_ERROR"
    assert result["compile_output"]


@pytest.mark.skipif(not __import__("shutil").which("javac"), reason="javac required")
def test_runtime_error(tmp_path):
    result = _run_job(tmp_path, RUNTIME, TESTS)
    assert result["status"] == "RUNTIME_ERROR"


@pytest.mark.skipif(not __import__("shutil").which("javac"), reason="javac required")
def test_timeout(tmp_path):
    result = _run_job(tmp_path, TIMEOUT, TESTS, timeout_ms=400)
    assert result["status"] == "TIME_LIMIT_EXCEEDED"
