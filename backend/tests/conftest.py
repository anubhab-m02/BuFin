import os
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker

# BuFin runs on PostgreSQL only, so the database tests run on it too: a throwaway database named
# *_test on the compose Postgres (`docker compose up -d postgres`). DATABASE_URL is forced to it, so
# nothing in the test process can reach the development database.
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://bufin:bufin_dev_password@localhost:5433/bufin_test"
)
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import database  # noqa: E402
import models  # noqa: E402

# database.py normalises postgres:// style URLs to the psycopg 3 driver; use its result everywhere.
TEST_URL = make_url(database.SQLALCHEMY_DATABASE_URL)


def _build_schema(engine):
    """Build the schema the way production does: from the Alembic migrations, not from the models,
    so every test run also proves the migration produces what the code expects."""
    from alembic import command
    from alembic.config import Config

    backend = Path(__file__).resolve().parents[1]
    cfg = Config(str(backend / "alembic.ini"))
    cfg.set_main_option("script_location", str(backend / "alembic"))
    command.upgrade(cfg, "head")


@pytest.fixture(scope="session")
def pg_engine():
    url = TEST_URL
    name = url.database
    assert name and name.endswith("_test"), f"refusing to run tests against {name!r}: the database name must end in _test"
    # The fixture drops the whole public schema, so it also refuses any non-local server unless told otherwise.
    assert url.host in (None, "localhost", "127.0.0.1", "::1") or os.environ.get("BUFIN_TEST_ALLOW_REMOTE") == "1", (
        f"refusing to run tests against remote host {url.host!r} (set BUFIN_TEST_ALLOW_REMOTE=1 to override)"
    )
    try:
        admin = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
        with admin.connect() as conn:
            if not conn.execute(text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": name}).scalar():
                conn.execute(text(f'CREATE DATABASE "{name}"'))
        admin.dispose()
    except OperationalError as exc:  # no server: say what to do instead of a wall of driver errors
        pytest.fail(f"Cannot reach the test database ({exc.__class__.__name__}). Start it with `docker compose up -d postgres`.", pytrace=False)

    engine = create_engine(url)
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
    _build_schema(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def session_factory(pg_engine):
    """A sessionmaker on an empty test database (every table truncated before each test)."""
    tables = ", ".join(f'"{t.name}"' for t in models.Base.metadata.sorted_tables)
    with pg_engine.begin() as conn:
        conn.execute(text(f"TRUNCATE TABLE {tables} RESTART IDENTITY CASCADE"))
    return sessionmaker(bind=pg_engine)
