# BuFin: architecture decisions (agent harness)

Ten decisions taken on 2026-11-05 while designing the agent harness, plus one standing rule. Each records the context, the choice, the alternatives rejected and the consequences. The design that follows from them is in `AGENT-HARNESS.md`. Status of all: accepted, not yet implemented.

## Standing rule: zero cost until revenue

No component may require a payment method or a paid plan until BuFin starts selling to users. Every external dependency must have a free tier that needs no card, or run locally in Docker. Consequences ripple through the decisions below: the shared Gemini key must be quota-limited, the queue lives in Postgres, and hosting is deferred.

## ADR-1: Gemini is the only model provider, orchestrated with LangChain and LangGraph

Context: Ollama support is spread through `backend/ai_service.py` with a process-local skip cache, and the code uses the deprecated `google.generativeai` SDK. Gemini's free tier is the reason to be Gemini-only.
Decision: remove Ollama entirely. Use `langchain-google-genai` for model calls and LangGraph for agent control flow. Model name is configurable per user.
Rejected: a thin in-house loop on `google-genai` (less code, but the owner prefers the LangChain ecosystem and its easy provider swap later); Google ADK (large, fast-moving, its session model would compete with ours).
Consequences: provider swaps become configuration, not rewrites. LangChain's surface area is large, so only a small set of its APIs is allowed in the codebase and all of it sits behind the gateway module.

## ADR-2: Hybrid API keys with Fernet encryption at rest

Context: one server-wide `GEMINI_API_KEY` exists today. A paid tier is planned later but is out of scope now.
Decision: key resolution order is the user's own key, then the server key, then AI disabled. User keys are entered in Settings together with the model, validated by a test call on save, and stored Fernet-encrypted (`MultiFernet`, master keys from `KEY_ENCRYPTION_KEYS`, newest first, for rotation). The API never returns a stored key, only a masked tail and validation status. Keys are decrypted only at the model-call boundary and never appear in logs, traces, agent state or checkpoints.
Rejected: browser-held key sent per request and never persisted (stronger privacy, but background agents cannot use it and keys must be re-entered per device); `pgcrypto` (keys travel in SQL and statement logs); a secrets manager (not free).
Consequences: losing the master key invalidates all stored user keys, so a runbook note and a "re-enter key" flow are required. Server-key calls must be quota-limited because the free tier's limits are tight.

## ADR-3: The knowledge graph holds shared world knowledge only, in Neo4j AuraDB Free

Context: per-user graphs would put financial relationships in a free cloud database with no backups, no per-tenant isolation and a hard size cap.
Decision: Neo4j holds only non-personal knowledge: merchant aliases, canonical merchants and their categories, the category taxonomy, Indian instruments and tax sections, bill types and benchmarks. Edges carry `source` (seed, consensus, llm), `confidence` and `updated_at`. No node or edge references a user. User facts, including personal merchant overrides, stay in SQL. Agents join both at query time. The graph is the single source of truth for world knowledge, and SQL is the single source of truth for user data. A nightly export keeps a versioned copy because the free tier has no backups.
Rejected: graph tables in the app database (simpler, but the owner chose a dedicated graph); a derived per-user graph (needs sync, duplicates data, tenant isolation falls to query discipline).
Consequences: no sync pipeline and no tenancy problem, and the data stays far below the free size cap. The instance pauses when idle, so graph reads need a timeout and a fallback to plain SQL-only behavior.

## ADR-4: The graph evolves by consensus, opt-in and admin approval

Decision: a user correction is always saved to SQL for that user. It is promoted to the shared graph only when at least three distinct opted-in users agree on the same normalized merchant to category pair, and only after an admin approves it. LLM-proposed edges from the Curator agent also wait in the same review queue. Only the normalized merchant string and category are promoted, never amounts, dates or identity. The opt-in toggle is in Settings and off by default.
Rejected: no learning from users (safest, slowest); automatic promotion (one user's mistake or an attacker's input would affect everyone).
Consequences: needs a promotion job, a review queue table, and an admin page.

## ADR-5: Supervisor plus specialist agents, with a confirmation interrupt on every money write

Decision: one supervisor classifies intent and routes to Capture (Quick Add parsing), Analyst (ask-your-ledger over aggregate tools), Planner (what-if, goals, safe-to-spend with deterministic maths), Coach (advice with grounded search) and Curator (background graph proposals). Each agent has its own tools and permissions; Analyst and Coach have no write tools. Any tool that writes money data calls LangGraph `interrupt()` and waits for the user to confirm in the UI, with the checkpoint held in Postgres so any API instance can resume the run.
Rejected: one ReAct agent with every tool (tool selection degrades, no permission boundary, a poisoned merchant name could reach a write tool); fixed pipelines only (no multi-step reasoning in the coach).
Consequences: more prompts and graphs to evaluate. Capture stays a mostly fixed workflow inside this structure because parsing is bounded.

## ADR-6: Postgres first, with the queue, quotas, cache and breaker in Postgres

Decision: migrate to Postgres before building the harness; LangGraph uses `PostgresSaver`. The job queue is Postgres-backed (Procrastinate or PGQueuer, chosen in implementation). Quota counters, rate limits, the response cache and the circuit-breaker state are Postgres tables with TTL cleanup, each behind a small interface so Valkey or Redis can replace it later without touching the agents.
Rejected: Redis from day one (free tiers cap commands and connections, and a polling queue worker can use up a free command budget in hours); building a Redis-compatible service from scratch (weeks of work, and durability is risky on the money path).
Consequences: an interface per concern (`Queue`, `RateLimiter`, `Cache`, `Breaker`), a migration milestone before AI work, and a documented upgrade path to Valkey. This moves Postgres (SCALING-ROADMAP P1.1) ahead of the AI gateway (P2.4).

## ADR-7: Interactive runs stream over SSE; background agents run in a worker

Decision: Coach, Analyst and Capture run in the FastAPI process with async LangGraph and stream tokens, tool steps and `interrupt` events to the browser over Server-Sent Events. Confirmation is a separate `POST /api/agent/runs/{id}/resume`. Curator, nightly alerts, graph promotion and imports run in the worker on a schedule.
Rejected: everything through the worker with polling (extra latency on every chat turn); plain request and response (a slow multi-step run holds a connection with no progress).
Consequences: the API tier is stateless and scales by adding instances. Background runs can only use the server key.

## ADR-8: Identifiers are redacted before every Gemini call

Context: the Gemini free tier may use prompts to improve Google's products (verify current terms); the free tier is the default.
Decision: the gateway redacts names, phone numbers, emails, account and card numbers, UPI IDs and household member names before any call. Amounts, dates, categories and cleaned merchant names pass through. Tool results are shaped to the fields a task needs. Settings shows a notice about free-tier data use and a per-feature AI toggle. Redaction is a tested module with a golden set.
Rejected: sending raw data; aggregates only (breaks Capture and merchant questions).
Consequences: a redaction map is kept in memory for the run so responses can be re-linked to real names for display.

## ADR-9: Observability is our own run tables, OpenTelemetry-ready, with golden-set evals

Decision: `agent_runs` and `agent_steps` tables record prompt version, tool calls, latency, tokens, fallback and corrections. They feed quotas, the Settings usage view and the admin queue. LangChain callbacks also emit OpenTelemetry spans so any backend can be added later. Evals are a pytest golden set (including the 53200 to 53000 amount bug and the "last working day" bug) run against a fake model on every PR and against Gemini nightly or on demand.
Rejected: LangSmith (hosted third party, would receive redacted but real prompts, limited free tier); self-hosted Langfuse (extra service now, remains an optional later add-on).

## ADR-10: Roles and permissions table, and a deployable shape without a chosen host

Decision: a roles and permissions model (roles such as `admin` and `reviewer`, permissions checked by name) rather than an `is_admin` flag. The first admin is seeded once from `ADMIN_EMAILS` at startup, after which roles are managed in the database. Deployment scope for now is containers only: images for `api` and `worker`, a Compose file for `api`, `worker`, `postgres` and the SPA, environment-only configuration, a health endpoint and graceful shutdown. A hosting provider is chosen later because free web tiers spin down on idle and would stop the worker.
Consequences: authorization checks go through one permission function, never inline role comparisons.
