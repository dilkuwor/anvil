# AnvilPrep MCP

A read-mostly Model Context Protocol server that lets ChatGPT, Grok, and similar clients analyze **your** AnvilPrep learning and programming work.

This is a study copilot, not a second copy of the REST API and not a second Ask AI. The client model does the analysis. AnvilPrep only supplies context.

## Goal

Give an external model enough catalog, progress, notes, submissions, and completed-interview data to:

- explain where you are weak and what to study next
- quiz you on a lesson or topic
- review **your** Java submission against the public problem statement
- review a completed mock interview (coding or system design)
- optionally save that insight back as a note

It is not for driving the product: no run/submit, no live interviewer, no tutor stream, no auth or LLM-key mutation.

## Why not wrap OpenAPI

FastAPI already exposes `/docs` and `/openapi.json`. Generating one MCP tool per route would:

- dump ~40 CRUD tools into ChatGPT/Grok
- pull payloads that blow the context window (full catalogs, lesson bodies, transcripts)
- risk leaking fields the routers already strip (`reference_solution`, hidden tests, LLM keys)
- invite the model to call run/submit or Ask AI

MCP tools are a small, analysis-shaped surface. `/docs` stays for humans and app clients.

## Architecture

MCP lives **next to** FastAPI in the same backend process and calls existing domain services in-process. It does not HTTP-call itself.

```text
ChatGPT   ── OAuth 2.1 ──┐
Grok TUI  ── PAT ────────┤
Claude/Cursor stdio ─────┤  (optional later, same tools)
                         ▼
                AnvilPrep MCP  (/mcp)
                         │  in-process service calls
                         ▼
        FastAPI domain packages  →  Postgres
```

| Piece | Choice |
|---|---|
| Transport (v1) | Streamable HTTP at `/mcp` |
| Transport (later) | Same implementations behind a stdio wrapper for local Grok/Claude |
| Implementation | Adapter in the backend, reusing `learn`, `problems`, `progress`, `notes`, `submissions`, `interviews`, `lists`, `cheatsheets` |
| Analysis | Client model only. MCP must not call Ollama or any user LLM provider |

A separate MCP process that only talks REST is extra auth and extra mapping, and it is easier to leak stripped fields. Keep one adapter.

## Auth

Browser cookie JWT is the wrong credential for MCP clients.

### v1 — personal access token

Created in Settings, shown once, revoked from Settings.

- header: `Authorization: Bearer ia_mcp_...`
- store a hash, last-used timestamp, and label — never the raw token again
- scopes: `mcp:read` now; `mcp:notes` when write lands
- every request maps to **one user**; ownership rules match the REST API

### v2 — OAuth 2.1 + PKCE

Used by Grok Custom Connector (and later ChatGPT). PAT remains for the Grok CLI.

| Grok field | Value |
|---|---|
| Server URL | `https://anvilprep.dev/mcp` |
| Client ID | Create in Settings → MCP → **Create OAuth client** (`apc_…`) |
| Client Secret | leave empty |
| Authorization Endpoint | `https://anvilprep.dev/oauth/authorize` |
| Token Endpoint | `https://anvilprep.dev/oauth/token` |
| Scopes | `mcp:read` |
| Token Auth Method | **none (PKCE only)** |

Flow: Grok opens `/oauth/authorize` → you sign in and Allow → PKCE code → `/oauth/token` issues a JWT (`typ=mcp_at`) → `Authorization: Bearer <JWT>` on `/mcp`.

Discovery: `/.well-known/oauth-authorization-server` and `/.well-known/oauth-protected-resource`. Unauthenticated `POST /mcp` returns `WWW-Authenticate` with `resource_metadata`. Dynamic client registration is at `POST /oauth/register`.

Set `PUBLIC_BASE_URL=https://anvilprep.dev` in production so metadata URLs are not internal rewrite hosts.

Unauthenticated catalog-only MCP is out of scope. The value is *your* content. Catalog resources may be public, but progress-enriched fields (problem status, completed lessons) require the token.

## Data the model may see

Four layers, all scoped to the token owner where they are personal:

| Layer | Sources | Purpose |
|---|---|---|
| Catalog | lessons, topics, categories, problems (public fields), cheatsheets, system-design scenarios | source material |
| Your state | learn progress, problem status, streaks, interview readiness, custom lists | personalization |
| Your work | notes, your submissions, completed interview transcripts and feedback | analysis |
| Derived views | weak topics, recommendations, “what I studied this week” | stop the model from guessing |

Reuse the readiness and topic-progress already computed in `app/progress/insights.py`. Do not invent a second recommendation engine inside MCP.

## Never expose

The REST API already has this boundary. MCP must use the same one.

- `problems.reference_solution`
- hidden test input / output / error text
- other users’ notes, code, or interview transcripts
- user LLM API keys, hints, or provider secrets
- password hashes, session cookies, raw MCP tokens
- in-progress interview control (phase machine, sending messages, architecture writes)
- Ask AI / tutor streams
- `run_code` / `submit_code`

Treat ChatGPT and Grok as third-party processors of personal study data. Settings copy when a token is created must say that. A “recent MCP access” list (token, tool, resource URI, timestamp — not full bodies) is enough audit for v1.

Rate-limit per token. MCP clients loop.

## Tools

Keep the set small. Pattern: **search → fetch → me**.

### v1 (read)

| Tool | Role |
|---|---|
| `search_anvil` | One search across learn, problems, cheatsheets, notes, lists, interviews. Args: `query`, optional `types[]`, `limit`. Returns hits `{ uri, type, title, snippet, status? }`, not full bodies. |
| `get_resource` | Fetch one object by URI. The only get-by-id tool — do not add `get_lesson` / `get_problem` / `get_cheatsheet`. |
| `get_my_overview` | Compact snapshot: solved counts, streak, learn % by category, interview readiness, weak topics, a few recommendations. First call for “how am I doing?” |
| `get_my_progress` | Filtered view: topic slug, date range, activity calendar. |
| `list_my_work` | Notes, submissions, completed interviews, problem lists. Filter by `kind` and `source`. |
| `get_submission` | Your source, compile output, **visible** test results. Hidden I/O stripped the same way as `app/submissions/router.py`. |
| `get_interview_review` | Completed sessions only: scores, signals (`missing` / `partial` / `demonstrated`), transcript, architecture summary for system design. |

Mark all of these `readOnlyHint: true`.

### v1.5 (optional write)

| Tool | Role |
|---|---|
| `save_note` | Attach a note to a lesson, problem, or system-design source. Same 20k body cap as the notes API. Scope `mcp:notes`. |

### Out of scope

- run / submit
- Ask AI
- start or continue an interview
- update architecture canvas
- anything under `/auth` except identity implied by the token
- “compare me” against other public profiles

## Resources

Stable URIs so the client can fetch instead of re-searching:

```text
anvil://me
anvil://me/overview
anvil://learn/catalog
anvil://learn/topics/{slug}
anvil://learn/lessons/{slug}
anvil://problems/{slug}
anvil://cheatsheets/{slug}
anvil://notes/{id}
anvil://submissions/{id}
anvil://interviews/{id}
anvil://lists/{id}
```

Resources are a short summary plus a body. Lesson `content` is allowed. Problem `reference_solution` and hidden tests are not. Interview resources are completed sessions; skip in-progress unless a later explicit “live session” flag is added.

Always include slugs and app URLs (`/learn/...`, `/problems/...`) so the model can point the user back into AnvilPrep.

## Response shape

Optimize for the client context window, not for mirroring REST.

- Search: ~200–400 characters per hit, hard cap (about 10).
- Lesson fetch: title, takeaways, interview questions, body. Truncate long bodies with `next_offset`.
- Problem fetch: statement, constraints, examples, tags, **your** status, related lesson slugs. No hidden tests, no reference solution.
- Overview: one JSON object the model can reason over in a single turn.

## Prompts

MCP prompts are the product surface. Ship these with the server:

| Prompt | Inputs it pulls | Intended output |
|---|---|---|
| `analyze_gaps` | overview, topic progress, interviews | three weak areas, why, what to study next (real slugs) |
| `quiz_me` | one lesson or topic | interview-style questions, then grade against the lesson |
| `review_solution` | public problem statement + your latest submission | complexity, edge cases, Java style — no canonical solution dump |
| `review_interview` | completed session | where signals were `missing`, what to drill |
| `plan_week` | readiness, lists, learn progress | a 5-day plan tied to real slugs |

Analysis stays in ChatGPT/Grok. AnvilPrep already has an in-app tutor; calling Ollama from MCP would duplicate cost and contradict it.

## ChatGPT vs Grok

Same tools and resources. Only auth and transport differ.

| Client | Transport | Auth |
|---|---|---|
| ChatGPT | Streamable HTTP | OAuth 2.1 for a public connector; PAT only for private tests |
| Grok (TUI / local) | HTTP or stdio | PAT |
| Cursor / Claude | stdio or HTTP | PAT |

Do not special-case tools per client. ChatGPT in particular needs a tiny tool list and precise descriptions; that constraint is why the surface is seven tools, not the OpenAPI catalog.

A public ChatGPT listing also needs a privacy policy and a disconnect path that revokes the OAuth grant. That does not change the tool design.

## Rollout

1. **PAT + HTTP MCP + seven read tools + five prompts.** Connect Grok and ChatGPT yourself. Prove `analyze_gaps` and `review_solution`.
2. **`save_note`.** Insights land in AnvilPrep instead of a chat transcript.
3. **OAuth 2.1** when other people should connect ChatGPT.
4. Code execution and live interviews stay out unless the product later becomes an agent that *practices*, not one that *reviews*. That is a different MCP.

## How to connect

v1 is live on the API process.

**Grok Custom Connector (OAuth):** Settings → MCP → Create OAuth client. Paste Server URL, Client ID, authorize/token endpoints, scope `mcp:read`, token auth **none (PKCE only)**. Leave the secret empty.

**Grok CLI (PAT):** Settings → MCP → create token. Then:

```bash
grok mcp add --transport http anvilprep https://anvilprep.dev/mcp \
  --header "Authorization: Bearer ia_mcp_YOUR_TOKEN"
```

Revoke the token in Settings to disconnect. Recent tool names are listed there; bodies and source are not.

REST for tokens (cookie session, same as the rest of the app):

- `POST /api/v1/mcp/tokens` `{ "name": "Grok" }` — returns the raw token once
- `GET /api/v1/mcp/tokens`
- `DELETE /api/v1/mcp/tokens/{id}`
- `GET /api/v1/mcp/access`

## Related

- Backend API: FastAPI on `:8000`, Swagger at `/docs`, OpenAPI at `/openapi.json`
- Domain packages and interview/learn rules: [architecture.md](./architecture.md)
- Local run: [local-development.md](./local-development.md)
