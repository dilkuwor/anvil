from pathlib import Path
from unittest.mock import patch

from app.execution.sandbox import SandboxTest, _prepare_workdir, execute_java


def test_prepare_workdir_defaults_to_tempdir():
    workdir, mount_path = _prepare_workdir()
    try:
        assert workdir == mount_path
        assert workdir.name.startswith("ia-java-")
        assert workdir.is_dir()
        assert oct(workdir.stat().st_mode)[-3:] == "777"
    finally:
        workdir.rmdir()


def test_prepare_workdir_uses_shared_job_dir(tmp_path):
    job_dir = tmp_path / "jobs"
    workdir, mount_path = _prepare_workdir(str(job_dir))
    assert workdir == mount_path
    assert workdir.parent == job_dir
    assert workdir.name.startswith("ia-java-")


def test_prepare_workdir_remaps_host_path(tmp_path):
    job_dir = tmp_path / "jobs"
    workdir, mount_path = _prepare_workdir(str(job_dir), "/host/jobs")
    assert workdir.parent == job_dir
    assert mount_path == Path("/host/jobs") / workdir.name


def test_execute_java_without_docker_is_internal_error():
    with patch("app.execution.sandbox.subprocess.run", side_effect=FileNotFoundError("docker")):
        result = execute_java(
            source_code="class Solution {}",
            signature={"method_name": "foo", "params": [], "return_type": "int"},
            tests=[SandboxTest(id=__import__("uuid").uuid4(), input="1", expected_output="1", hidden=False)],
            time_limit_ms=1000,
            memory_limit_kb=65536,
        )
    assert result.status == "INTERNAL_ERROR"
    assert result.passed == 0
    assert result.total == 0
    assert result.compile_output == "Unable to execute submission."
