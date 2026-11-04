# BuFin: tooling map (plugins, skills, MCP servers, hooks)

Inventory taken on 2026-11-05 from the local Claude Code install, the claude.ai account and the plugin directory. "Use here" is what each is good for in this repository. Nothing below is claimed as used unless the last column says so.

## Installed locally (25 plugins)

| Plugin | Use here | In repo now |
|---|---|---|
| ecc (large bundle) | `fastapi-patterns`, `fastapi-reviewer`, `database-reviewer`, `database-migrations`, `api-design`, `hexagonal-architecture`, `architecture-decision-records`, `security-reviewer`, `tdd-guide`, `python-testing`, `react-testing`, `e2e-runner`, `docker-patterns`, `deployment-patterns`, `cost-aware-llm-pipeline`, `prompt-optimizer`, `regex-vs-llm-structured-text`, `mcp-server-patterns`, `agent-harness-construction`, `frontend-a11y`, `react-performance`, `vite-patterns`, `canary-watch`, `benchmark` | referenced by roadmap items |
| agent-skills | `ci-cd-and-automation`, `api-and-interface-design`, `security-and-hardening`, `test-driven-development`, `performance-optimization`, `observability-and-instrumentation`, `deprecation-and-migration`, `documentation-and-adrs`, `spec-driven-development` | CI workflow follows `ci-cd-and-automation` |
| feature-dev | guided feature builds (`code-explorer`, `code-architect`, `code-reviewer`) | used for new features |
| pr-review-toolkit | `review-pr` with silent-failure, test and type analyzers | used on every PR |
| commit-commands, claude-md-management | commits and PRs; keep CLAUDE.md current | in use |
| hookify, plugin-dev | author hooks, rules, plugins | hooks below |
| claude-code-setup | automation recommender | run once; output below |
| superpowers, ponytail, caveman | brainstorming/plans/debugging, minimal-diff review, terse output | in use |
| impeccable, taste-skill, ui-ux-pro-max, frontend-design, 21st | visual design | used for revamp; basis for design v2 |
| typesafe | typed AI judgments | candidate for categorization and anomaly flags |
| i-have-adhd, session-report | focus aid; session cost and usage | optional |
| typescript-lsp, pyright-lsp | type-aware navigation and diagnostics | active when editing |
| serena | semantic code navigation (LSP-backed) | connected; useful for refactors in P2.1 |
| playwright | browser automation | used to verify the revamp; `.mcp.json` pins it for the team |
| context7 | live library docs (FastAPI, SQLAlchemy, Recharts, TanStack) | in `.mcp.json`; needs OAuth once (`/mcp`) |

## claude.ai plugins (enabled)

| Plugin | Use here |
|---|---|
| engineering | `system-design`, `architecture` (ADR), `code-review`, `testing-strategy`, `tech-debt`, `deploy-checklist`, `incident-response`, `documentation` |
| design | `design-critique`, `design-system`, `accessibility-review`, `ux-copy`, `design-handoff` for design v2 |
| product-management | `write-spec` and `roadmap-update` for the AI features; `metrics-review` once usage exists |
| data | `sql-queries`, `explore-data`, `validate-data` for ledger analytics and anomaly design |
| cowork-plugin-management | build a BuFin-specific plugin from the hooks and agents below |

## MCP servers

| Server | State | Use |
|---|---|---|
| playwright (project and plugin copies) | connected | UI verification, e2e |
| chrome-devtools (via ecc) | connected | performance traces, Lighthouse, console and network |
| serena | connected | symbol-level navigation and edits |
| context7 | needs auth | docs lookup |
| 21st | needs auth | UI component search for design v2 |
| github, datadog, pagerduty, slack, linear, figma, notion, amplitude and others | need auth | github for PR automation; datadog/pagerduty only after P4.2; figma for design v2 handoff |
| definite (data plugin) | failed to connect, endpoint not found | ignore |

## In the plugin directory, not installed (user decision, they run third-party code)

| Plugin | Why it fits | Install |
|---|---|---|
| agentic-council | 20 specialist agents and skills including `adr-template`, `schema-design`, `load-modeling`, `caching-strategy`, `observability-design`, `failure-mode-analysis`, `threat-model`, `rag-architecture`, `ai-evaluation`, `prompt-engineering`. Matches the roadmap almost one to one. | `/plugin` then search "agentic-council" |
| claude-code-review-council | Six reviewers (correctness, security, trust boundary, tests, architecture, interface) over a diff | `/plugin` search |
| 42crunch-api-security-testing | Audit and scan the OpenAPI document FastAPI already generates | `/plugin` search |
| pyvar-arch-observability | Prometheus, Grafana, Sentry, Bandit, input validation guidance for Python services | `/plugin` search |
| AWS Startups Solution Architecture | multi-tenant isolation and batch LLM inference patterns, relevant to RLS and cost control | `/plugin` search |

Not relevant to this repository: social-media, life-sciences marketing, kernel, embedded, finance-close, HR councils.

## Implemented in this repository

| File | What it does |
|---|---|
| `.claude/settings.json` | Hooks: block edits to `.env*` and database files; after editing a migration run the single-head check; after editing a frontend file lint that file only (the repo-wide lint has existing failures, issue #91). |
| `.claude/hooks/*.sh` | The hook scripts. |
| `backend/scripts/check_alembic_heads.py` | Fails when the migration chain has more than one head. Used by the hook and by CI. |
| `.github/workflows/ci.yml` | Frontend build, backend import check, Alembic single-head check, lint on changed files. |
| `.mcp.json` | Project-scoped playwright and context7. |
| `.claude/agents/bufin-reviewer.md` | A reviewer subagent that checks this repository's own rules (ownership checks, household scope, local-date handling, Privacy Mode, single Alembic head). |

## Not yet possible without you
- Installing the third-party plugins above.
- Authorizing context7, 21st, github and figma MCP servers (OAuth).
- Merging PRs: the permission classifier blocks owner-bypass merges.
