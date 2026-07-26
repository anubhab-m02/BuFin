## What changed and why

<!-- Describe the change and the problem it solves. Link the issue this closes, if any (e.g. "Fixes #12"). -->

## Checklist

- [ ] `npm run build` passes clean
- [ ] Backend changes: `python3 -c "import main"` (run from `backend/`) passes clean
- [ ] If this touches money-math (balance, safe-to-spend, budgets, etc.), I traced the calculation end to end rather than assuming it's correct — no test suite exists yet, so this is the verification bar
- [ ] If this adds/changes a database column, there's a new Alembic migration for it
- [ ] I only touched files relevant to this change (no unrelated reformatting/drive-by edits)

## Notes for the reviewer

<!-- Anything you're unsure about, deliberately left out of scope, or want specific feedback on. -->
