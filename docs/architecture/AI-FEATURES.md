# BuFin: AI feature roadmap

What exists: Quick Add parsing (Ollama first, Gemini fallback, amount plausibility check), spending alert, tips, purchase analysis, coach chat with history, update-existing-plan phrasing. Open issues already cover notifications (#36, #37), anomaly detection (#38), agentic coach actions (#40), receipts (#43, #44) and an MCP server (#42).

Rule for everything below: the model proposes, the server validates, the user confirms anything that writes money data. No model output reaches the database unchecked.

## Foundation first: the AI gateway and evals
New features are only safe if quality is measurable.
- One gateway for all calls: provider interface, per-user budget, cache, shared circuit breaker, prompt versions, structured output.
- A golden set of real-shaped inputs ("Rent 15k every 1st till Dec", "Change Netflix to 649") with expected actions, run in CI against the local model and Gemini. Track exact-match on amount, date, type and action. The 53200 to 53000 bug and the "last working day" bug become permanent regression cases.
- Log provider, latency, tokens, fallback, and user corrections (the strongest training signal).

## Features, ranked by value over effort

| # | Feature | What it does | Needs |
|---|---|---|---|
| 1 | Agentic coach with tools | The coach calls typed tools (get spending by category, list upcoming bills, simulate a purchase, create a budget) and shows a confirmation card before any write. Issue #40. | Gateway, function-calling, tool schemas, confirmation UI |
| 2 | Ask your ledger | "How much did I spend on food in October versus September?" answered by calling the aggregate endpoints, never by text-to-SQL on raw tables. | P1.3 aggregates, tool calling |
| 3 | Learning categorization | Remember per-user merchant to category corrections; few-shot them into the prompt; normalize merchant names ("SWIGGY*ORDER 8842" to "Swiggy"). | Correction log, merchant table |
| 4 | Receipt and statement import | Multimodal parsing of receipt photos and bank PDFs into reviewable candidates with duplicate detection. Issue #43, UI #44/#90, statement import PR #10. | Object storage, worker, vision model |
| 5 | Proactive alerts and anomalies | Nightly job finds unusual spend, forgotten subscriptions, price hikes, bills due, budget pace; sends in-app and push. Issues #36, #37, #38. | Worker (P2.3), notification store |
| 6 | What-if and goal planner | "If I save 8k a month, when do I reach the Goa trip?" with scenario sliders; the model explains, deterministic code computes. | Server-side forecast |
| 7 | Probabilistic cash-flow forecast | Replace the fixed 8-week bars with an interval (p10 to p90) from income and spend variability. Plain statistics first, model-assisted later. | Aggregates, history |
| 8 | Household assistant | Fair split suggestions, settle-up reminders, shared-goal pacing per member. | Household aggregates |
| 9 | Voice and share-sheet capture | Speak or share an SMS/UPI notification into Quick Add. | PWA, speech-to-text |
| 10 | BuFin MCP server | Expose read and confirmed-write tools so any agent (including Claude) can work with your ledger under your permissions. Issue #42. | Auth tokens per app, scopes |
| 11 | Privacy modes | Local-only AI (Ollama) switch, PII redaction (account numbers, names) before cloud calls, per-feature consent. | Gateway |

## Order
Gateway and evals, then 1 and 2 (same tool layer), 3 (cheap, high perceived quality), 5 with the worker, then 4, 6 to 8. 9 to 11 are independent.

## Risks to design for
- Wrong numbers presented confidently: always show the source rows behind an answer.
- Prompt injection through merchant names or imported text: treat imported strings as data, never as instructions; tools take structured arguments only.
- Cost runaway: per-user budgets and caching in the gateway from day one.
- Regulatory: aggregating bank data in India implies Account Aggregator rules and consent flows; do not start before P4.3.
