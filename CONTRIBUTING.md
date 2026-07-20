# Contributing to BuFin

Thanks for your interest in contributing.

## Workflow

1. Fork the repo and create a branch off `main`: `type/short-description` (e.g. `fix/ledger-hover`, `feat/net-worth-page`).
2. Make your changes.
3. Open a PR against `main`. Describe what changed and why.
4. `main` is protected — PRs need at least one approval before merging. A maintainer will review and merge.

## Local setup

- Backend: `cd backend && uvicorn main:app --reload` (port 8000)
- Frontend: `npm run dev` (port 5173)
- Schema changes go through Alembic: `cd backend && alembic revision --autogenerate -m "..."` then `alembic upgrade head`

## Before opening a PR

- `npm run build` — must pass clean
- Backend: `python3 -c "import main"` — must import without errors
- No test suite exists yet; verify money-math changes by reading the code path end to end.

## Commit messages

One line, imperative mood, describes what changed (`fix: ...`, `feat: ...`, `chore: ...`).
