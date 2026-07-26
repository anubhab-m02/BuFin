# Security Policy

BuFin handles financial data — transactions, bank statements, account balances. If you find a security vulnerability, please don't open a public GitHub issue for it.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting for this repository: go to the **Security** tab → **Report a vulnerability**. This opens a private draft advisory visible only to the maintainer, not a public issue.

Please include:
- A description of the vulnerability and its potential impact
- Steps to reproduce, or a proof of concept if you have one
- Which part of the app is affected (frontend, backend, a specific endpoint, the AI/statement-import pipeline, etc.)

## Scope

This is a personal project in active development, not a hardened production service. Reports about the following are especially relevant given what this app handles:
- Authentication/authorization bypass (accessing another user's transactions, goals, or account data)
- Injection vulnerabilities (SQL injection, XSS, etc.)
- Sensitive data exposure — in particular, anything that would leak unredacted PII (account numbers, card numbers, PAN) from the statement/receipt import pipeline, which already applies redaction specifically to prevent this
- Anything that would let a request from one user affect another user's data

Reports about missing rate limiting, lack of CSRF protection on a hobby-scale dev deployment, or similar hardening gaps expected of a project at this stage are welcome as regular issues rather than private reports, unless you believe there's a real, exploitable impact.
