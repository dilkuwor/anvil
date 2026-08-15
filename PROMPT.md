# InterviewAnvil — Coding Module Implementation Prompt

You are the lead software architect and senior full-stack engineer responsible for building the first production-quality module of **InterviewAnvil**, a software engineering interview preparation platform.

## 1. Project Goal

Build the **Coding Practice module** of InterviewAnvil first.

The initial version should allow a user to:

1. Sign up / log in.
2. Browse coding problems.
3. Filter problems by difficulty and tags.
4. Open a problem and read its description.
5. Write Java code in a Monaco-based editor.
6. Run code against visible/sample test cases.
7. Submit code against hidden test cases.
8. Execute Java code safely inside an isolated Docker sandbox.
9. See compilation/runtime/test results.
10. View submission history.
11. Track whether a problem has been solved.
12. Track basic coding activity/progress.

Do **not** implement AI interviews, system design, behavioral interviews, leaderboards, Redis, Kafka, Kubernetes, or other advanced features yet.

The architecture must, however, make it easy to add these features later.

---

## 2. Existing Infrastructure and Local Development

The project will be developed locally first and deployed to the existing infrastructure later.

### Local development machine

Local development will be performed on a **MacBook**.

The developer should be able to run:

- Next.js frontend directly on the MacBook
- FastAPI backend directly on the MacBook using a Python virtual environment (`venv`)
- Java code-runner components using Docker on the MacBook
- Database access through the existing PostgreSQL server

For local development, do **not** require the frontend or FastAPI backend to run inside Docker.

The goal is to keep the local development loop fast:

```text
MacBook
│
├── Next.js
│   └── npm run dev
│
├── FastAPI
│   └── Python venv
│
└── Docker
    └── Java code sandbox
         │
         └── User-submitted Java code
```

### Existing PostgreSQL server

PostgreSQL is already running through Portainer on the existing infrastructure.

For local development, the PostgreSQL server is reachable at:

```text
100.95.177.124
```

Use the existing PostgreSQL instance rather than creating another database server.

The database connection should be configurable through environment variables, for example:

```text
DATABASE_HOST=100.95.177.124
DATABASE_PORT=5432
DATABASE_NAME=interview_anvil
DATABASE_USER=postgres
DATABASE_PASSWORD=example
```

The password may be provided separately during local setup. **Never hardcode real credentials in source code, Dockerfiles, Git history, or documentation.**

If a placeholder/example password is needed in `.env.example`, use a clearly fake value such as:

```text
DATABASE_PASSWORD=example
```

The application must support overriding all database settings through environment variables.

Prefer a single `DATABASE_URL` internally if that is cleaner:

```text
DATABASE_URL=postgresql+psycopg://<user>:<password>@100.95.177.124:5432/interview_anvil
```

Do not assume the database is running locally.

### Existing application infrastructure

The eventual deployment infrastructure includes:

- Proxmox environment
- Docker
- Portainer
- Existing PostgreSQL server running through Portainer
- Docker Hub for container images
- GitHub for source control
- GitHub Actions for CI/CD

Docker images will be used for deployment later, but **local development should not require building the frontend and API Docker images**.

### AI infrastructure

There is a separate Linux ML server with:

- GPU
- Ollama
- Local LLM models
- TTS

The AI server is **not part of this coding-module implementation**.

Do not integrate Ollama or TTS yet.

### Infrastructure constraints

Do not create another PostgreSQL server.

Do not introduce Redis at this stage.

Do not introduce Kafka.

Do not introduce Kubernetes.

Do not introduce microservices unless there is a concrete architectural requirement.

Use a clean **modular monolith** for the main application.

The architecture should remain deployable to Docker/Portainer later without making Docker mandatory for local development.

---

## 3. Technology Stack

### Frontend

Use:

- Next.js
- TypeScript
- React
- Tailwind CSS
- shadcn/ui
- Monaco Editor
- TanStack Query

Use a clean, modern, professional UI.

The design should feel like a serious developer platform similar in quality to LeetCode, HackerRank, or modern engineering tools.

Do not copy their UI exactly.

### Backend

Use:

- Python
- FastAPI
- SQLAlchemy
- Alembic
- Pydantic
- PostgreSQL

Structure the backend by domain/module rather than putting everything into a few large files.

### Code execution

For V1, support **Java only**.

Use Docker-based sandboxed execution.

Do NOT execute user-submitted Java code directly inside the FastAPI process or API container.

---

## 4. Repository Structure

Use a monorepo.

Recommended structure:

```text
interview-anvil/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── Dockerfile
│
├── backend/
│   ├── app/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── problems/
│   │   ├── submissions/
│   │   ├── progress/
│   │   ├── execution/
│   │   └── common/
│   ├── tests/
│   ├── alembic/
│   ├── Dockerfile
│   └── requirements.txt
│
├── code-runner/
│   ├── java/
│   │   ├── Dockerfile
│   │   └── runner/
│   └── tests/
│
├── database/
│   └── seeds/
│
├── infrastructure/
│   ├── docker/
│   └── portainer/
│
├── docs/
│
├── .github/
│   └── workflows/
│
├── docker-compose.yml
└── README.md
```

Adjust the structure if you have a better reason, but keep clear separation between frontend, backend, and code execution.

---

## 5. Database

Use the existing PostgreSQL server.

Create a dedicated database/user for InterviewAnvil.

Do not create a PostgreSQL Docker container.

Use Alembic migrations.

Initial entities should include:

### users

- id
- email
- username
- password_hash
- role
- is_active
- created_at
- updated_at

### problems

- id
- title
- slug
- description
- difficulty
- constraints
- input_format
- output_format
- explanation
- time_complexity
- space_complexity
- created_at
- updated_at
- is_active

### tags

- id
- name
- slug

### problem_tags

- problem_id
- tag_id

### test_cases

- id
- problem_id
- input
- expected_output
- is_hidden
- execution_order

Never expose hidden test cases through the API.

### submissions

- id
- user_id
- problem_id
- language
- source_code
- status
- runtime_ms
- memory_kb
- created_at

### submission_test_results

- id
- submission_id
- test_case_id
- status
- actual_output
- expected_output
- runtime_ms
- error_message

Do not expose hidden test case input/expected output to normal users.

### user_problem_progress

- id
- user_id
- problem_id
- status
- attempts
- accepted_attempts
- first_solved_at
- last_attempted_at
- best_runtime_ms
- updated_at

Possible status values:

- NOT_STARTED
- ATTEMPTED
- SOLVED

### activity

- id
- user_id
- activity_date
- problems_solved
- submissions
- practice_minutes

Design the schema so additional modules can be added later.

---

## 6. Authentication

Implement:

- Registration
- Login
- Logout
- Current user endpoint
- Password hashing
- Authentication middleware/dependencies
- Protected API routes

Use secure password hashing.

Do not store plaintext passwords.

Use secure HTTP-only authentication cookies or another secure production-appropriate mechanism.

Do not implement social login yet.

---

## 7. Problem List

Create a problem discovery page.

Features:

- Search by title
- Filter by difficulty
- Filter by tags
- Sort
- Pagination
- Problem status

Example UI:

| Problem | Difficulty | Tags | Status |
|---|---|---|---|
| Two Sum | Easy | Array, HashMap | Solved |

Add:

- Easy
- Medium
- Hard

Use proper database queries rather than loading every problem into memory.

---

## 8. Problem Detail Page

Create a page such as:

```text
/problems/two-sum
```

Layout:

### Left

- Problem title
- Difficulty
- Tags
- Description
- Examples
- Constraints
- Input format
- Output format
- Hints

### Right

- Monaco Editor
- Java syntax highlighting
- Run button
- Submit button
- Test result panel

The editor should preserve the user's code while navigating appropriately.

---

## 9. Java Code Format

Initially require the user to implement:

```java
class Solution {
    public int[] twoSum(int[] nums, int target) {
        // implementation
    }
}
```

The platform controls the entry point/test harness.

Do not require users to write:

```java
public static void main(String[] args)
```

The platform should generate the necessary runner/test harness around the submitted Solution class.

Design this carefully so different problem signatures can eventually be supported.

---

## 10. Code Execution Architecture

Use this architecture:

```text
Browser
   ↓
Next.js
   ↓
FastAPI
   ↓
Code Execution Service
   ↓
Docker Sandbox
   ↓
Java/JDK
```

The API should never execute arbitrary user code directly.

Each submission should execute in an isolated environment.

At minimum enforce:

- CPU limit
- Memory limit
- Execution timeout
- Process limit where practical
- Network disabled
- Non-root execution
- Restricted filesystem
- Temporary workspace
- Automatic cleanup

The runner must never have access to:

- PostgreSQL credentials
- API secrets
- host filesystem
- Docker socket
- application environment secrets

---

## 11. Execution Results

Support these statuses:

- ACCEPTED
- WRONG_ANSWER
- COMPILATION_ERROR
- RUNTIME_ERROR
- TIME_LIMIT_EXCEEDED
- MEMORY_LIMIT_EXCEEDED
- INTERNAL_ERROR

The API should return structured results.

Example:

```json
{
  "status": "WRONG_ANSWER",
  "runtime_ms": 42,
  "passed": 2,
  "total": 3,
  "test_results": []
}
```

For hidden tests, do not expose hidden input or expected output.

---

## 12. Run vs Submit

Implement two operations.

### Run

Runs only visible/sample test cases.

Purpose:

- Fast feedback
- Debugging
- Development

### Submit

Runs all test cases including hidden tests.

Purpose:

- Official submission
- Updates progress
- Stores submission history
- Determines whether the problem is solved

---

## 13. Submission History

On the problem page provide:

- Status
- Language
- Runtime
- Memory
- Timestamp

Allow the user to open their previous submission and view the source code.

Example:

```text
Accepted | Java | 42ms | Today 14:31
Wrong Answer | Java | 31ms | Today 14:20
```

Do not allow users to view another user's source code.

---

## 14. Progress

Implement basic progress tracking.

Dashboard should show:

- Total problems solved
- Easy solved
- Medium solved
- Hard solved
- Total submissions
- Problems attempted
- Current streak
- Longest streak
- Recent activity

Problem list should visually indicate:

- Not attempted
- Attempted
- Solved

---

## 15. Daily Activity / Streak

Activity should be based on meaningful practice.

A day can qualify through:

- Accepted submission
- Meaningful coding activity

Do not count simple login as practice.

Track:

- Current streak
- Longest streak
- Activity by day

Eventually this will support a GitHub-style activity heatmap.

---

## 16. API Design

Use versioned APIs.

Example:

```text
/api/v1/auth/register
/api/v1/auth/login
/api/v1/auth/logout
/api/v1/auth/me

/api/v1/problems
/api/v1/problems/{slug}

/api/v1/problems/{id}/run
/api/v1/problems/{id}/submit

/api/v1/submissions
/api/v1/submissions/{id}

/api/v1/progress
/api/v1/activity
```

Keep API models separate from database models.

Use Pydantic schemas.

Return consistent error responses.

---

## 17. Frontend Architecture

Use reusable components.

Suggested:

```text
components/
├── layout/
├── problems/
├── editor/
├── submissions/
├── dashboard/
├── auth/
└── ui/
```

Use TanStack Query for server state.

Do not put server state unnecessarily into Zustand.

Keep the application responsive.

The coding editor should work well on desktop first.

---

## 18. Seed Data

Create seed data for at least 15 coding problems.

Include a variety of:

- Arrays
- Strings
- HashMap
- Two Pointers
- Sliding Window
- Binary Search
- Stack
- Queue
- Linked List
- Trees

Difficulty distribution:

- 5 Easy
- 7 Medium
- 3 Hard

Each problem should contain:

- Description
- Constraints
- Examples
- Tags
- Visible test cases
- Hidden test cases
- Expected Java solution/reference solution
- Time complexity
- Space complexity

Use original problem content or appropriately licensed/public-domain content. Do not copy copyrighted problem statements from LeetCode.

---

## 19. Testing

Implement automated tests.

### Backend

- Unit tests
- API tests
- Database tests
- Authentication tests
- Submission tests

### Code runner

Test:

- Compilation success
- Compilation failure
- Correct solution
- Wrong solution
- Runtime exception
- Timeout
- Memory/resource limits

### Frontend

- Important component tests
- Critical user flows

---

## 20. Docker

Create production-ready Dockerfiles.

### Frontend

- Multi-stage build
- Minimal runtime image

### Backend

- Production Python image
- Non-root user where practical

### Java runner

- Minimal JDK/JRE environment appropriate for compilation/execution
- Non-root user
- Resource limits controlled by execution layer

Do not put PostgreSQL into docker-compose because PostgreSQL already exists externally.

The application should receive PostgreSQL configuration through environment variables.

Example:

```text
DATABASE_URL
```

Do not hardcode credentials.

---

## 21. Environment Configuration

Use environment variables.

Example:

```text
DATABASE_URL
JWT_SECRET
CORS_ORIGINS
CODE_RUNNER_URL
APP_ENV
LOG_LEVEL
```

Never commit secrets.

Provide:

```text
.env.example
```

with safe placeholder values.

---

## 22. GitHub Actions

Prepare CI/CD for:

- frontend
- backend
- code-runner

On push/merge to main:

1. Run tests.
2. Build Docker images.
3. Tag images using commit SHA.
4. Push images to Docker Hub.

Docker images:

```text
yourdockerhub/interview-anvil-frontend
yourdockerhub/interview-anvil-api
yourdockerhub/interview-anvil-java-runner
```

Also optionally maintain:

```text
latest
```

but immutable SHA/version tags should be preferred for deployment.

Do not implement automatic production deployment yet unless explicitly requested.

---

## 24. Local Development Workflow

The primary development workflow is on a MacBook.

### Start PostgreSQL connection

Use the existing remote PostgreSQL instance:

```text
100.95.177.124:5432
```

Do not start a local PostgreSQL container unless explicitly requested.

### Start the FastAPI backend

Create and use a Python virtual environment:

```bash
cd backend

python3 -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt

uvicorn app.main:app --reload
```

The exact commands may be adjusted to match the final project structure.

The backend should read database configuration from `.env`.

### Start the Next.js frontend

Run directly on the MacBook:

```bash
cd frontend

npm install
npm run dev
```

The frontend should communicate with the locally running FastAPI backend.

### Run Java code execution

Docker may be used locally for the Java sandbox.

The code runner should be isolated from the FastAPI process and should not require the entire application to be containerized during development.

### Local development architecture

```text
                         MacBook
┌──────────────────────────────────────────────────────┐
│                                                      │
│  Next.js                                             │
│  localhost:3000                                      │
│       │                                              │
│       ▼                                              │
│  FastAPI + Python venv                               │
│  localhost:8000                                      │
│       │                                              │
│       ├───────────────┐                              │
│       │               │                              │
│       ▼               ▼                              │
│  PostgreSQL       Java Code Runner                  │
│  100.95.177.124   Docker Sandbox                    │
│  :5432                                             │
│                                                      │
└──────────────────────────────────────────────────────┘
```

The local environment should be the default development target.

Do not require Docker Compose to start the frontend or backend during normal development.

Docker/Portainer deployment configuration should still be maintained for later deployment.

---

## 24. Logging

Use structured application logging.

Every submission should have a traceable:

- submission ID
- user ID
- problem ID
- execution status
- execution duration

Never log:

- passwords
- authentication tokens
- database passwords
- sensitive secrets

---

## 25. Error Handling

The user should never see raw stack traces.

Return useful errors such as:

- "Unable to execute submission."
- "Compilation failed."
- "Execution timed out."
- "Internal server error."

Log detailed technical information server-side.

---

## 26. Security Requirements

Treat user-submitted code as hostile.

Never trust:

- submitted Java source
- input values
- query parameters
- uploaded content

Prevent:

- command injection
- path traversal
- container escape
- network access
- host filesystem access
- secret exposure
- resource exhaustion

Do not expose Docker socket to the frontend or user-facing API.

---

## 27. Non-Goals

Do NOT implement yet:

- Python
- C++
- JavaScript
- Redis
- Kafka
- Kubernetes
- AI interviewer
- Ollama integration
- TTS
- System design
- Behavioral interviews
- Leaderboards
- Social features
- Payments
- Mobile app

Design interfaces so these can be added later.

---

## 28. Development Principles

Follow these principles:

1. Keep the architecture simple.
2. Avoid premature microservices.
3. Use clear domain boundaries.
4. Write maintainable production-quality code.
5. Prefer explicit code over clever abstractions.
6. Use type safety.
7. Validate all external input.
8. Write tests for critical functionality.
9. Document important architectural decisions.
10. Do not introduce infrastructure without a concrete reason.

---

## 29. Definition of Done

The first milestone is complete when a new user can:

1. Register.
2. Log in.
3. Open the problem list.
4. Filter/search problems.
5. Open a problem.
6. Write Java code.
7. Run sample tests.
8. Submit code.
9. Have the submission executed inside the Java sandbox.
10. Receive the result.
11. See which tests passed.
12. See compilation/runtime errors when applicable.
13. View submission history.
14. See the problem marked as solved after an accepted submission.
15. See their dashboard progress update.
16. Build their daily activity streak.

The complete system must run locally using Docker and be deployable through the existing Portainer infrastructure.

Before implementing major features, inspect the repository and existing code. Do not overwrite existing functionality blindly.

When making architectural decisions, favor the simplest solution that satisfies the requirements and document significant decisions in `/docs`.
