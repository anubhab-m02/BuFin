# Contributing to BuFin

Thanks for your interest in contributing.

## Workflow

1. Fork the repo and create a branch off `main`: `type/short-description` (e.g. `fix/ledger-hover`, `feat/net-worth-page`).
2. Make your changes.
3. Open a PR against `main`. Describe what changed and why.
4. `main` is protected — PRs need at least one approval before merging. A maintainer will review and merge.

## Local setup

- Database: `docker compose up -d postgres`, then `cd backend && alembic upgrade head` (PostgreSQL only; `DATABASE_URL` from `.env.example`). Tests need that Postgres too: they build a throwaway `bufin_test` database from the migrations
- Backend: `cd backend && uvicorn main:app --reload` (port 8000)
- Whole stack in containers: `docker compose --profile full up --build` (needs `JWT_SECRET_KEY` in a root `.env`; see the README). CI builds and starts it on every PR.
- Backend tests: `cd backend && python -m pytest` (needs the compose Postgres running; CI runs the same tests against a Postgres service container)
- Frontend: `npm run dev` (port 5173)
- Schema changes go through Alembic: `cd backend && alembic revision --autogenerate -m "..."` then `alembic upgrade head`

## Before opening a PR

Run the commands this repo actually supports (there is **no** full automated test suite yet):

- Frontend production build: `npm run build` (must pass clean)
- Frontend lint (if configured in `package.json`): `npm run lint`
- Backend import sanity check from `backend/`: `python3 -c "import main"`
- Optional syntax check: `python3 -m py_compile main.py` (and any modules you touched)

For money-math or ledger changes, also walk the code path end to end in the UI — unit tests are not a substitute here yet.

## Commit messages

One line, imperative mood, describes what changed (`fix: ...`, `feat: ...`, `chore: ...`).
