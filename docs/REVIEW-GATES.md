# BuFin: required review gates

Every pull request and every non-trivial change goes through the gates below before it is called done. The gates exist because this is a money app with AI and key handling; a gap in review has already let bugs ship (#69, the double Alembic head, the unverified API names in the harness design).

Rules:
1. Gate 0 and Gate 1 are mandatory for every PR. Gate 2 rows apply when the change touches that area. Gate 3 runs at each milestone boundary and before any public deployment.
2. A finding is either fixed, or answered in the PR with a reason. "Not run" is stated, never silent.
3. Reviews are read-only. Fixes are separate commits so the review can be re-run.
4. Money logic and key handling are written test-first (`superpowers:test-driven-development` or `ecc:tdd-guide`).
5. Library APIs (LangChain, LangGraph, SQLAlchemy, Alembic, FastAPI, Neo4j) are checked against current docs through `context7` before they are used in code or in design docs. If `context7` is not authorized, say so in the PR and mark the API as unverified.

## Gate 0: before writing code

| Check | Tool |
|---|---|
| Decision grilled; related files that depend on it identified | `grilling` skill (required by the global CLAUDE.md) |
| Creative or design work | `superpowers:brainstorming` |
| Plan for a multi-step task | `superpowers:writing-plans`, `agent-skills:planning-and-task-breakdown` |
| What else changes when this changes | `ecc:change-impact` |
| Existing helper that already does it | `ponytail:ponytail` ladder, `ecc:search-first` |

## Gate 1: every PR

Run all of these on the diff. Findings are summarized in the PR.

| Concern | Tool |
|---|---|
| General quality, bugs, conventions | `pr-review-toolkit:review-pr` (code-reviewer, silent-failure-hunter, pr-test-analyzer, type-design-analyzer, comment-analyzer, code-simplifier) |
| Standards plus spec match against the issue | `code-review` skill |
| Language reviewers by changed files | `ecc:python-reviewer` (backend), `ecc:react-reviewer` and `ecc:typescript-reviewer` (frontend) |
| API layer | `ecc:fastapi-reviewer` |
| Security of the diff | `ecc:security-reviewer` agent |
| Over-engineering | `ponytail:ponytail-review` |
| Repo rules (ownership, household scope, local dates, Privacy Mode, single Alembic head) | `bufin-reviewer` subagent in `.claude/agents` |
| Tests present and meaningful | `ecc:pr-test-analyzer` |
| Verified before "done" | `superpowers:verification-before-completion` (run it, do not just read it) |

## Gate 2: by area touched

| Area | Tools |
|---|---|
| Database, migrations, Postgres | `ecc:database-reviewer`, `ecc:database-migrations`, `ecc:postgres-patterns`, `python scripts/check_alembic_heads.py` |
| Auth, keys, encryption, redaction, secrets | `agent-skills:security-auditor`, `agent-skills:security-and-hardening`, `ecc:security-review`, `ecc:agent-security-hardening`; Anthropic `security-guidance` plugin if installed |
| AI gateway, agents, prompts, tools | `ecc:agent-architecture-audit`, `ecc:agent-eval`, `ecc:eval-harness`, `ecc:ai-regression-testing`, `ecc:cost-aware-llm-pipeline`, `ecc:prompt-caching-strategy`, `ecc:mle-reviewer` |
| Knowledge graph, retrieval | `ecc:rag-pipeline-reviewer`, `ecc:mcp-dependency-review` (for any MCP server added) |
| API contract and OpenAPI | `agent-skills:api-and-interface-design`, `ecc:api-design`, `ecc:contract-first`; `42crunch` plugin if installed |
| Architecture and layering | `ecc:architect`, `engineering:architecture`, `engineering:system-design`, `ecc:hexagonal-architecture`, `ecc:architecture-decision-records` |
| Frontend UI | `ecc:a11y-architect`, `ecc:frontend-a11y`, `design:accessibility-review`, `ecc:react-performance`, `agent-skills:web-performance-auditor`, `taste-skill` lint for visual regressions |
| Docker, CI, deploy | `ecc:docker-patterns`, `ecc:deployment-patterns`, `agent-skills:ci-cd-and-automation` |
| Observability | `agent-skills:observability-and-instrumentation` |
| Performance | `ecc:performance-optimizer`, `agent-skills:performance-optimization` |
| Tests being added | `ecc:python-testing`, `ecc:react-testing`, `ecc:e2e-runner`, `agent-skills:test-engineer` |
| Docs | `ecc:doc-updater`, `agent-skills:documentation-and-adrs` |
| Commit message | `ecc:commit-reviewer` |

## Gate 3: milestone boundary and before deployment

`ecc:council` or `ecc:council-multi-model` on the whole milestone, `ecc:production-audit`, `ecc:click-path-audit` on the UI flows, `agent-skills:doubt-driven-development`, `ecc:santa-method`, `ponytail:ponytail-audit` for the whole repository, `agent-skills:shipping-and-launch`, `engineering:deploy-checklist`. A fresh baseline audit (prompt B below) is re-run.

## Third-party plugins worth installing (you decide; they run third-party code)

| Plugin | Publisher tier | Why |
|---|---|---|
| `security-guidance` | Anthropic | Edit-time pattern warnings and a diff review on Stop; covers injection, SSRF, hardcoded secrets |
| `code-review` | Anthropic | Multi-agent PR review with confidence scoring |
| `claude-code-review-council` | community | Six specialists over a diff |
| `OWASP Security Audit` | community | Evidence-backed OWASP Top 10:2025 report |
| `42crunch-api-security-testing` | partner | Audit and scan the OpenAPI document FastAPI generates |
| `finecomb` | community | Exhaustive checklist-style audit |
| `AWS Startups Solution Architecture` | community | Multi-tenant isolation patterns; only if AWS becomes the host |
| `agentic-council` | directory | Architecture specialists (ADR, schema, load model, threat model) |

## Prompts

### A: gate for the open PRs (run per PR, replace the number)

```
Run the BuFin review gates on PR #<N>. Read docs/REVIEW-GATES.md first.
1. Gate 1 in full on the PR diff: pr-review-toolkit:review-pr, the code-review skill against the linked issue, ecc:python-reviewer / react-reviewer / typescript-reviewer for the languages changed, ecc:fastapi-reviewer for backend routes, ecc:security-reviewer, ponytail:ponytail-review, and the bufin-reviewer agent.
2. Then every Gate 2 row whose area the diff touches.
3. Verify library APIs through context7. If context7 is not authorized, say so and list the APIs as unverified.
4. Report findings ranked by severity, each with file:line, impact and a suggested fix. List every tool you did not run and why.
5. Do not edit code. Do not merge. Post nothing to GitHub; give me the draft review text.
```

### B: baseline audit of the existing codebase (run once now, again at each milestone)

```
Audit the whole BuFin repository on main against docs/REVIEW-GATES.md, read-only.
Run in parallel where possible:
- Security: agent-skills:security-auditor, ecc:security-reviewer, ecc:security-review, ecc:agent-security-hardening. Focus: auth_utils, routers/auth.py, household scoping (IDOR), the Gemini key and URL handling in backend/ai_service.py, CORS, input validation, unbounded AI endpoints.
- Backend: ecc:python-reviewer, ecc:fastapi-reviewer, ecc:database-reviewer (models, missing indexes, Float money, string dates, Alembic chain), ecc:silent-failure-hunter.
- Frontend: ecc:react-reviewer, ecc:typescript-reviewer, ecc:a11y-architect, ecc:react-performance, agent-skills:web-performance-auditor (the 1 MB bundle).
- Architecture: ecc:architect against docs/architecture/HLD.md, LLD.md and AGENT-HARNESS.md, and flag where the docs disagree with the code.
- AI: ecc:agent-architecture-audit, ecc:cost-aware-llm-pipeline, ecc:mle-reviewer on backend/ai_service.py and the prompts.
- Quality: ponytail:ponytail-audit, ecc:production-audit.
Deliver one consolidated report: findings by severity with file:line, duplicates merged, a list of tools that did not run, and a proposed issue list. Do not change code and do not file issues until I approve the list.
```

### C: before any new code (paste at the start of each task)

```
Before editing, apply Gate 0 from docs/REVIEW-GATES.md: grill the decision, list the files and docs that depend on what is changing, check library APIs with context7, and write the failing test first for money logic and key handling. After editing, run Gate 1 and the Gate 2 rows for the areas touched and report what was run, what was not, and every finding.
```
