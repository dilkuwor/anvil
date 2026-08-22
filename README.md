# Anvil (InterviewAnvil)

Interview prep for software engineers: Java coding practice, Learn catalog, cheat sheets, notes, mock coding and system-design interviews.

A candidate can register, browse problems, write Java in Monaco, run sample tests, submit against hidden tests, and track progress. User code runs in an isolated Docker sandbox — never inside the FastAPI process.

Production site: [https://anvilprep.dev](https://anvilprep.dev).

## Local development (MacBook)

Do **not** run the frontend or API in Docker during day-to-day work. Use the existing PostgreSQL server and a local Java runner image.

```text
Next.js  :3000  ─┐
FastAPI  :8000  ─┼─ PostgreSQL  100.95.177.124:5432
Docker          ─┘  interview-anvil-java-runner
```

### 1. Environment

```bash
cp .env.example backend/.env
# Edit backend/.env — set DATABASE_PASSWORD and a unique JWT_SECRET.
# Never commit real credentials.

cp frontend/.env.example frontend/.env.local
```

Create the application database on the existing server if it does not exist yet (once):

```bash
# From a machine that can reach 100.95.177.124
psql -h 100.95.177.124 -U postgres -c "CREATE DATABASE interview_anvil;"
```

### 2. Database schema and seed

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
alembic upgrade head
python -m app.seed
```

The seed loads 15 original problems (5 Easy, 7 Medium, 3 Hard) plus tags and hidden tests.

### 3. Java sandbox image

```bash
docker build -t interview-anvil-java-runner:local ./code-runner/java
```

### 4. FastAPI

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### 5. Next.js

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The Next.js dev server proxies `/api/*`, `/mcp`, and OAuth discovery/token routes to `http://localhost:8000`.

## Tests

```bash
# backend
cd backend && source .venv/bin/activate && pytest

# Java runner (requires javac on PATH)
cd code-runner && PYTHONPATH=../backend pytest

# frontend
cd frontend && npm test
```

## Deployment images

Dockerfiles live next to each service. Compose and Portainer stacks **do not** start PostgreSQL.

```text
yourdockerhub/interview-anvil-frontend
yourdockerhub/interview-anvil-api
yourdockerhub/interview-anvil-java-runner
```

CI on `main` runs tests, then builds and pushes SHA-tagged images. Production rollout is manual.

## API

Versioned under `/api/v1`. FastAPI Swagger: [http://localhost:8000/docs](http://localhost:8000/docs) (`/openapi.json`).

- `POST /auth/register` `POST /auth/login` `POST /auth/logout` `GET /auth/me`
- `GET /problems` `GET /problems/{slug}`
- `POST /problems/{id}/run` `POST /problems/{id}/submit`
- `GET /submissions` `GET /submissions/{id}`
- `GET /progress` `GET /activity`
- Learn, lists, notes, cheat sheets, interviews, and MCP token/OAuth client routes under `/api/v1`

Auth for the website is an HTTP-only JWT cookie. Hidden test inputs, expected outputs, and reference solutions are never returned to clients.

## MCP (Grok / ChatGPT)

Read-mostly Model Context Protocol at `/mcp`. The client model analyzes your Learn catalog, progress, notes, submissions, and completed interviews. It cannot run code, start interviews, or see hidden tests.

Production endpoint: `https://anvilprep.dev/mcp`

**Grok Custom Connector (OAuth 2.1 + PKCE)** — Settings → MCP → Create OAuth client, then paste:

| Field | Value |
|---|---|
| Server URL | `https://anvilprep.dev/mcp` |
| Client ID | `apc_…` from Settings |
| Client Secret | leave empty |
| Authorization Endpoint | `https://anvilprep.dev/oauth/authorize` |
| Token Endpoint | `https://anvilprep.dev/oauth/token` |
| Scopes | `mcp:read` |
| Token Auth Method | none (PKCE only) |

**Grok CLI (personal access token)** — Settings → MCP → create token (`ia_mcp_…`):

```bash
grok mcp add --transport http anvilprep https://anvilprep.dev/mcp \
  --header "Authorization: Bearer ia_mcp_YOUR_TOKEN"
```

Set `PUBLIC_BASE_URL=https://anvilprep.dev` in production so OAuth metadata uses the public host. After pulling schema changes, run `alembic upgrade head`.

Design and tool list: [docs/mcp.md](docs/mcp.md). Architecture: [docs/architecture.md](docs/architecture.md). Local notes: [docs/local-development.md](docs/local-development.md).
