# BuFin: Scalability and architecture roadmap

Ordered by what breaks first and what blocks the rest. Each item says why, what changes, and how to know it is done. Items are filed as issues (labels `architecture`, `enhancement`); the tooling to help execute each is in `TOOLING.md`.

## P0: correctness and security (do before any public deployment)

### P0.1 JWT secret and auth hardening
Why: `SECRET_KEY` is a literal in `backend/auth_utils.py`; anyone can forge a token. Tokens last 24 hours with no revocation and the SPA keeps them in `localStorage`.
Change: read the secret from the environment and refuse to start without it in production; add a `kid`-based key-rotation path; short-lived access token plus refresh token in an HttpOnly cookie; password rules and breached-password check; login rate limiting and lockout.
Done when: no secret in the repo, rotating the key invalidates old tokens, auth tests cover expiry and tampering.

### P0.2 Money as integers, dates as real types
Why: `Float` amounts and string dates already caused two production-class bugs (#69, "upcoming" listing). Float totals drift; string dates mix UTC and local days.
Change: store amounts as integer paise (or `Numeric(14,2)`); store `occurred_on` as a `DATE` (the user's local calendar day) plus `created_at` as `TIMESTAMPTZ`; one Alembic data migration; Pydantic types accept decimal rupees on the wire.
Done when: no `Float` on money columns, a property test proves `sum(parts) == total` for random ledgers, all date comparisons use the `DATE` column.

### P0.3 Test net for the rules that already broke
Why: there is no test suite and the app is a money app.
Change: pytest for scoping (IDOR across two users, household isolation), recurring materialization (idempotency, clamping, catch-up), goal contribution diff, household sole-owner guards; Vitest for `resolveExpectedDay`, streak, safe-to-spend; Playwright smoke for login, add transaction, privacy mode.
Done when: CI runs them on every PR and they cover each bug that has shipped.

## P1: data layer

### P1.1 PostgreSQL
Why: SQLite is a single writer in one file; a second app instance or a worker cannot share it safely.
Change: `DATABASE_URL` from env; Postgres in dev via Docker Compose (extends PR #83) and managed Postgres (for example Neon) in deployment; fix the baseline Alembic migration so an empty database upgrades cleanly.
Done when: the app and the test suite run against Postgres and `alembic upgrade head` works on an empty database.

### P1.2 Indexes and constraints
Why: only `id`, `email` and invite `code` are indexed; every list query filters by `user_id` and often `date`.
Change: composite indexes `(user_id, date DESC)` and `(household_id, date DESC)` on transactions, `user_id` on every owned table, `(recurring_plan_id, date)`; `CHECK` constraints for `type`, `direction`, `status`, `role`; `NOT NULL` where the code assumes it.
Done when: `EXPLAIN` on the main list queries shows index scans and bad enum values are rejected by the database.

### P1.3 Server-side aggregates and pagination
Why: the SPA downloads the whole ledger (in pages of 500; it silently received only 100 rows before PR #170) and computes balance, safe-to-spend, forecasts and category totals itself. That is slow at scale and duplicates money rules in the client.
Change: endpoints for `GET /summary` (balance, income, expense for a window), `GET /safe-to-spend`, `GET /spending/by-category?from&to`, `GET /spending/trend?category`, `GET /forecast`; keyset pagination for the ledger; the SPA keeps only presentation logic.
Done when: the dashboard loads from a constant number of small requests regardless of ledger size.

### P1.4 Row-level security
Why: tenant isolation currently depends on every handler remembering its filter.
Change: Postgres RLS policies keyed on a per-request `app.user_id` and `app.household_id` setting; handlers keep their filters as defence in depth.
Done when: a deliberately unfiltered query in a test returns only the caller's rows.

## P2: backend structure and async

### P2.1 Layering (ports and adapters)
Why: routers hold query logic, business rules and ORM calls together, which is why scoping rules were copied into two files and the materializer lives inside a router.
Change: `routers` (HTTP only) -> `services` (rules: scoping, materialization, contribution diff, safe-to-spend) -> `repositories` (SQLAlchemy). Move the day-resolution rule into one tested module and generate the JavaScript twin from shared fixtures (closes #75, #76).
Done when: services are unit-testable without HTTP or a database session.

### P2.2 Non-blocking I/O
Why: the CRUD handlers are plain `def` (threadpool), but `get_current_user` is `async def` with a synchronous query on the event loop, and the AI handlers call synchronous model clients; one slow AI call stalls other requests.
Change: either make handlers plain `def` (FastAPI runs them in a threadpool) or move to async SQLAlchemy and `httpx.AsyncClient`; AI calls always off the request thread or streamed.
Done when: a 20-second model call does not delay an unrelated `GET /transactions`.

### P2.3 Background jobs
Why: there is no scheduler, so time-based work happens on page load (materialization) or on mutation (net-worth snapshots), and notifications (#36) cannot exist.
Change: a worker on a Postgres-backed queue (Procrastinate or PGQueuer; see ADR-6 in `DECISIONS.md`; Redis only if throughput later demands it) for nightly materialization with backfill (fixes #74), net-worth snapshots, anomaly scans, alert generation, statement import parsing; idempotent jobs keyed by `(user, day)`.
Done when: loading the app performs no writes and a missed day is recovered by the next run.

### P2.4 AI gateway
Why: model calls are spread across `ai_service.py` with a process-local skip cache, no per-user limits, no cache, prompts as inline strings, and no way to measure quality.
Change: a gateway module with a Gemini-only model access (ADR-1; Ollama is removed), per-user daily budget and token accounting, retries with a circuit breaker kept in Postgres, scoped per key source (replacing the process-local `_ollama_unavailable_until`), versioned prompts, structured-output (JSON schema) calls instead of regex JSON extraction, and an offline evaluation set (see `AI-FEATURES.md`).
Done when: every model call goes through one function that records cost, latency, provider and prompt version.

## P3: frontend

### P3.1 Server state and bundle
Change: TanStack Query for server state (cache, retries, optimistic updates) so `FinancialContext` shrinks to UI state; route-level `React.lazy` splitting (the single 1 MB bundle is the largest build warning); virtualized ledger list.

### P3.2 Types and design system
Change: incremental TypeScript (start with `lib/` and the API client, generate types from the OpenAPI schema); the revamp tokens in `index.css` become a documented design system; Storybook or an equivalent catalog for `ui/`.

## P4: operations

### P4.1 CI/CD and environments
GitHub Actions for build, lint on changed files, backend import check, Alembic single-head check, tests; Docker images; preview deployments per PR; secrets only through the environment.

### P4.2 Observability
OpenTelemetry traces and metrics from API and worker, Sentry for errors on both sides, request ids propagated to logs, a dashboard for AI cost, latency and fallback rate, uptime check.

### P4.3 Compliance and privacy
Data export and delete-my-data endpoints, PII redaction before any cloud model call, a local-only AI mode, audit log for sensitive actions, retention policy. Required before any bank or UPI data is ingested.

## Suggested sequence

This order is superseded by the delivery order in `AGENT-HARNESS.md` section 11 (Postgres comes before the AI gateway). In short:

1. P0.1, P0.3 (secret fix, first tests, CI, Dockerfiles). The live bugs from the baseline review are fixed first (issues #152 to #163).
2. P1.1 and P1.2 (Postgres, baseline migration, indexes, constraints), then the P0.2 money/date type migration on Postgres.
3. P2.4 gateway (Gemini only, Settings page, key storage, redaction, quotas, run tables), then the LangGraph harness.
4. P1.3 server-side aggregates one endpoint at a time, which unlock the Analyst and Planner agents; P2.1 layering as the services appear.
5. P2.3 worker and the Curator; the shared knowledge graph.
6. P3 alongside design v2; P4.2 and P4.3 before a public launch.
