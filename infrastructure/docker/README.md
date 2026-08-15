# Docker images

These images are for later Portainer deployment, not the default local loop.

| Image | Context |
|---|---|
| `interview-anvil-frontend` | `frontend/` |
| `interview-anvil-api` | `backend/` |
| `interview-anvil-java-runner` | `code-runner/java/` |

The API container needs access to a Docker engine so it can start ephemeral runner containers. The runner container itself must never receive the Docker socket or application secrets.

PostgreSQL stays on the existing server. Pass `DATABASE_*` or `DATABASE_URL` at runtime.
