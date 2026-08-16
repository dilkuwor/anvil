# InterviewAnvil Coding Module Architecture

## Goal

V1 is a **modular monolith** that delivers Java coding practice: accounts, problem discovery, sandboxed execution, submissions, and progress.

AI interviews, extra languages, Redis, Kafka, and Kubernetes are intentionally out of scope. Domain packages are isolated so those features can land later without a rewrite.

## Runtime topology

Local development (default):

```text
Browser  →  Next.js :3000  →  FastAPI :8000  →  PostgreSQL 100.95.177.124:5432
                                      └── docker run → interview-anvil-java-runner
```

Next.js proxies `/api/*` to FastAPI so auth cookies stay first-party on the app origin.

FastAPI never executes user Java in-process. Each run/submit writes a temporary workspace and starts an ephemeral Docker container. When the API itself is a container (Portainer), that workspace must live on a host bind-mount (`CODE_RUNNER_JOB_DIR`) so the host Docker daemon can see the files. The API image ships a Docker CLI; its entrypoint joins the host `docker.sock` group and then drops to uid 1000.

- no network
- memory / CPU / PID limits
- read-only root filesystem
- non-root user
- no Docker socket, no application env, no database credentials

`CODE_RUNNER_URL` can replace the local `docker run` path with a remote executor later. The job contract stays the same.

## Backend packages

| Package | Responsibility |
|---|---|
| `app/auth` | Register, login, logout, current user, HTTP-only JWT cookie |
| `app/users` | User persistence |
| `app/problems` | Catalog queries, filters, detail (hidden tests stripped) |
| `app/execution` | Harness generation + sandbox invocation |
| `app/submissions` | Official history; users can only read their own source |
| `app/progress` | Per-problem status, daily activity, streaks |
| `app/common` | Config, DB, security, errors, logging |

API models are Pydantic schemas. ORM models stay inside their domain package.

## Java contract

Users implement a `Solution` class. The platform generates `Main.java` from `problems.function_signature` and compiles it with shared helpers (`ListNode`, `TreeNode`, parsers). Different signatures can be added by extending the type map in `app/execution/harness.py`.

Before compilation, `app/execution/imports.py` scans the submitted source and injects any missing JDK imports for types that were actually used (`HashMap`, `List`, `PriorityQueue`, `Stream`, `BigInteger`, and other common `java.*` classes). `java.lang` types are left alone. Existing imports and user-defined types of the same name are not duplicated.

## Progress rules

- **Run** executes visible tests only. It counts as practice (activity / streak) but does not write a submission or mark a problem solved.
- **Submit** executes every test, stores history, updates `user_problem_progress`, and increments daily activity. An accepted submit marks the problem `SOLVED`.
- Login does not create activity.

## Configuration

All secrets and database settings come from the environment. See `.env.example`. Never commit real credentials.

## Deployment later

Dockerfiles exist for frontend, API, and the Java runner. `docker-compose.yml` and `infrastructure/portainer` describe Portainer-oriented deployment against the existing PostgreSQL server. Compose does **not** start Postgres.
