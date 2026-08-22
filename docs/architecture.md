# InterviewAnvil Coding Module Architecture

## Goal

V1 is a **modular monolith** that delivers Java coding practice: accounts, problem discovery, sandboxed execution, submissions, progress, custom lists, Learn, and AI-backed mock interviews.

Extra languages, Redis, Kafka, and Kubernetes are intentionally out of scope. Domain packages are isolated so those features can land later without a rewrite.

## Runtime topology

Local development (default):

```text
Browser  →  Next.js :3000  →  FastAPI :8000  →  PostgreSQL 100.95.177.124:5432
                                      ├── docker run → interview-anvil-java-runner
                                      └── HTTP        → Ollama (OLLAMA_BASE_URL)
```

Next.js proxies `/api/*` to FastAPI so auth cookies stay first-party on the app origin.

The model never runs in the browser or in the Next.js process. FastAPI is the only caller of Ollama. Default settings are `OLLAMA_BASE_URL` (currently `http://100.120.169.81:11434`) and `OLLAMA_MODEL` (`gemma3:4b`).

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
| `app/auth` | Register, login, logout, current user, HTTP-only JWT cookie, email verification |
| `app/users` | User persistence |
| `app/problems` | Catalog queries, filters, detail (hidden tests stripped) |
| `app/execution` | Harness generation + sandbox invocation |
| `app/submissions` | Official history; users can only read their own source |
| `app/progress` | Per-problem status, daily activity, streaks |
| `app/lists` | Per-user custom problem lists |
| `app/learn` | Catalog + Ask AI tutor (topics/lessons) |
| `app/interviews` | Mock interview state machine + Ollama interviewer |
| `app/cheatsheets` | Static review sheets |
| `app/common` | Config, DB, security, errors, logging |
| `app/email` | Outbound email (Resend client + templates); the only module that talks to the provider |

API models are Pydantic schemas. ORM models stay inside their domain package.

Ollama access is centralized in `app/interviews/ollama.py`. Learn imports that client; it does not talk to the model itself.

## Java contract

Users implement a `Solution` class. The platform generates `Main.java` from `problems.function_signature` and compiles it with shared helpers (`ListNode`, `TreeNode`, parsers). Different signatures can be added by extending the type map in `app/execution/harness.py`.

Before compilation, `app/execution/imports.py` scans the submitted source and injects any missing JDK imports for types that were actually used (`HashMap`, `List`, `PriorityQueue`, `Stream`, `BigInteger`, and other common `java.*` classes). `java.lang` types are left alone. Existing imports and user-defined types of the same name are not duplicated.

## Mock interviews

A mock interview is a timed session bound to one problem. The editor stays the same; the left pane becomes the interviewer. Java correctness still comes from the sandbox — the model is not the judge.

`app/interviews/agent.py` (`MockInterviewAgent`) chooses the next question. The service still owns phase transitions, timers, and completion. The agent records structured signals as `missing` / `partial` / `demonstrated` and probes whatever is still missing.

**CODING** interviews stay bound to a problem and the Java sandbox. Signals are `requirements`, `approach`, `complexity`, `edge_cases`, `communication`, `testing`, `reasoning`.

**SYSTEM_DESIGN** interviews are a separate kind. They have no `problem_id`. The session stores a scenario snapshot and an architecture canvas (`nodes` + `edges`). The interviewer sees a live summary of the canvas and challenges gaps (missing cache, single store, no async path) instead of walking a fixed script. Signals are `requirements`, `capacity`, `high_level`, `deep_dive`, `scalability`, `reliability`, `tradeoffs`, `communication`.

The agent depends only on `LLMProvider`. Concrete backends live under `app/interviews/providers/` (`OllamaProvider`, `OpenAIProvider`, `GeminiProvider`, `OpenRouterProvider`). `INTERVIEW_LLM_PROVIDER` is the platform default (usually `ollama`). A signed-in user can pick a paid provider and save an API key and optional model slug per provider in `user_llm_keys`. Switching providers reuses a stored key and model when they exist. An empty model falls back to the server env default (`OPENROUTER_MODEL`, `OPENAI_MODEL`, `GEMINI_MODEL`). Keys are encrypted at rest and never returned to the client. Adding a vendor means a new provider class — not a change to the agent or the phase machine.

### Surfaces

| Surface | Auth | API | Limit |
|---|---|---|---|
| Landing preview | none | `POST /api/v1/interviews/preview` and `/preview/{id}/messages` | 4 candidate turns, then login required. Session has `user_id = null` and `is_preview = true`. Fixed problem `pair-target`. |
| Problem workspace | required | `POST /api/v1/interviews` | Full session. One active (unended) session per user per problem is reused. Duration is `INTERVIEW_DURATION_SECONDS` (default 45 minutes). |
| System design picker | none to browse | `GET /api/v1/interviews/scenarios` | Catalog of design prompts. Auth required to start. |
| System design workspace | required | `POST /api/v1/interviews/system-design`, `PUT /{id}/architecture` | Timed 3-panel session. One active session per user per scenario. Canvas JSON is persisted; the interviewer reads a summary of it. |

Preview sessions do not expire on the timer and do not write feedback. Authenticated sessions expire when remaining time hits zero; the API then records a `TIMEOUT` event and completes the interview.

### Phase machine

Owned by `app/interviews/service.py`, not by the model:

```text
INTRO → UNDERSTANDING → APPROACH → CODING → TESTING → FOLLOW_UP → FEEDBACK
```

- Start: Gemma writes the opening line, then the session moves to **Understanding**.
- Candidate replies advance **Understanding → Approach → Coding**.
- **Run** (visible tests) during Coding can move the session to **Testing**. The interviewer is told the authoritative `status` / `passed` / `total` and must not contradict it.
- **Submit** (all tests): `ACCEPTED` moves to **Follow-up**; a failed submit increments `wrong_attempts` and can send the session back to Coding.
- After two follow-up answers, or when the user ends the session, the phase becomes **Feedback** and `ended_at` is set.

The workspace reports Run/Submit into the session with `POST /api/v1/interviews/{id}/events` (`type` is `RUN` or `SUBMIT`). Hint requests increment `hints_used` and ask for a nudge only — no algorithm or code.

System design uses a different machine, owned by `app/interviews/system_design.py`:

```text
REQUIREMENTS → CAPACITY → HIGH_LEVEL → DEEP_DIVE → SCALABILITY → RELIABILITY → TRADEOFFS → FEEDBACK
```

The service advances after a minimum number of candidate turns in each phase. High-level design waits for a core canvas (compute + store) before moving on. Architecture updates do not change phase; the next chat turn sees the latest graph.

### What the interviewer is allowed to do

The system prompt in `_system_prompt` tells Gemma it is a live interviewer, not a tutor:

- one question at a time, 1–3 short sentences
- never write solution code or an optimal algorithm
- never invent constraints or hidden tests
- never decide correctness; trust the sandbox result when one is provided

The public problem statement (title, description, constraints, examples, tags) is included. Hidden tests and the reference solution are not.

If Ollama is down or returns an empty reply, the service uses a canned fallback so the session can continue.

### Feedback

On complete, `_build_feedback` mixes:

- **Objective correctness** from the last sandbox result (`ACCEPTED` = 10, otherwise `10 * passed / total`). This is not scored by the model.
- **Subjective scores** (understanding, approach, coding, communication, reasoning, complexity, follow-up) from a JSON-only Ollama eval, clamped to 1–10. If that call fails, heuristics from turn counts / hints / accepts are used.

Overall is a weighted blend (correctness 28%, approach 14%, understanding and coding 12% each, the rest 8–10%). Strengths, improvements, and a short interviewer-voiced summary are stored on `interview_sessions.feedback`.

Transcripts keep the last 12 messages when calling Ollama.

## Ask AI (Learn tutor)

Learn uses the same Ollama host and model, with a different prompt. The tutor (`app/learn/service.py`) explains the **current lesson or topic**. It may correct the learner and ask one interview-style follow-up. It must not dump a full problem solution unless the user asks.

Auth is required (`POST /api/v1/learn/topics/{slug}/ask`, `/lessons/{slug}/ask`, `/lessons/{id}/ask-ai`). The Ask AI panel can stream via `tutor_reply_stream` (`text/event-stream`). Interviewer chat is non-streaming and capped shorter (`num_predict` 220 / 900 characters) so the mock stays conversational.

## Progress rules

- **Run** executes visible tests only. It counts as practice (activity / streak) but does not write a submission or mark a problem solved.
- **Submit** executes every test, stores history, updates `user_problem_progress`, and increments daily activity. An accepted submit marks the problem `SOLVED`.
- Login does not create activity.

## Configuration

All secrets and database settings come from the environment. See `.env.example`. Never commit real credentials.

## Deployment later

Dockerfiles exist for frontend, API, and the Java runner. `docker-compose.yml` and `infrastructure/portainer` describe Portainer-oriented deployment against the existing PostgreSQL server. Compose does **not** start Postgres.
