# Local development

InterviewAnvil is intended to run on a MacBook with:

- Next.js on the host (`npm run dev`)
- FastAPI on the host (`uvicorn` in a venv)
- Java execution in Docker
- the existing PostgreSQL server at `100.95.177.124:5432`

Docker Compose is not required to start the app.

## First-time setup

1. Copy `.env.example` to `backend/.env` and set a real `DATABASE_PASSWORD` and `JWT_SECRET`.
2. Create the `interview_anvil` database on the existing server if needed.
3. `alembic upgrade head` then `python -m app.seed`.
4. `docker build -t interview-anvil-java-runner:local ./code-runner/java`.
5. Start API on `:8000` and frontend on `:3000`.

The frontend rewrite sends `/api/*` and `/mcp` to `API_PROXY_TARGET` (default `http://localhost:8000`).

MCP is at `/mcp`. Grok Custom Connector uses OAuth 2.1 + PKCE (`/oauth/authorize`, `/oauth/token`). The Grok CLI can still send `Authorization: Bearer ia_mcp_…`. See [mcp.md](./mcp.md). After pulling, run `alembic upgrade head`.

## Why the runner is a separate image

The API must never compile or run untrusted Java in its own process. The runner image contains only a JDK, a non-root user, and `run.py`. FastAPI mounts a temporary workspace and starts the container with no network, no secrets, and resource limits.

## Adding a problem later

Add a dict to `database/seeds/problems.py` and re-run `python -m app.seed`. Hidden tests stay out of the public API automatically.
