# Docker images

These images are for later Portainer deployment, not the default local loop.

| Image | Context |
|---|---|
| `interview-anvil-frontend` | `frontend/` |
| `interview-anvil-api` | `backend/` |
| `interview-anvil-java-runner` | `code-runner/java/` |

The API image includes a Docker CLI. Bind-mount `/var/run/docker.sock` and a host path such as `/var/tmp/interview-anvil-jobs` (set `CODE_RUNNER_JOB_DIR` to that same path). The entrypoint joins the socket’s group and drops to uid 1000; you do not set `DOCKER_GID`. The runner container itself must never receive the Docker socket or application secrets.

PostgreSQL stays on the existing server. Pass `DATABASE_*` or `DATABASE_URL` at runtime.
