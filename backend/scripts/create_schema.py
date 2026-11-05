"""Create the BuFin tables in the database DATABASE_URL points to. TEMPORARY.

The old Alembic chain was written for SQLite and cannot build a schema on PostgreSQL (its
baseline only adds a column to tables that `create_all` used to create). The Postgres schema
milestone replaces the whole chain with one new baseline migration and deletes this script.
Until then, run this once against a fresh database:

    cd backend && python scripts/create_schema.py

It only creates missing tables; it never alters or drops anything. A database created this
way must be recreated (`docker compose down -v`) before the new baseline is applied.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import models  # noqa: E402,F401 - registers every table on Base.metadata
from database import Base, engine  # noqa: E402

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    print(f"Schema ready ({len(Base.metadata.tables)} tables).")
