# InterviewAnvil

Java coding-practice module for software engineering interview prep.

A candidate can register, browse problems, write Java in Monaco, run sample tests, submit against hidden tests, and track progress. User code runs in an isolated Docker sandbox — never inside the FastAPI process.

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

Open [http://localhost:3000](http://localhost:3000). The Next.js dev server proxies `/api/*` to `http://localhost:8000`.

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

Versioned under `/api/v1`:

- `POST /auth/register` `POST /auth/login` `POST /auth/logout` `GET /auth/me`
- `GET /problems` `GET /problems/{slug}`
- `POST /problems/{id}/run` `POST /problems/{id}/submit`
- `GET /submissions` `GET /submissions/{id}`
- `GET /progress` `GET /activity`

Auth is an HTTP-only JWT cookie. Hidden test inputs and expected outputs are never returned to clients.

See `docs/architecture.md` for design decisions.
