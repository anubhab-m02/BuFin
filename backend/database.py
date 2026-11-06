import os

from dotenv import load_dotenv
from sqlalchemy import MetaData, create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv()


def _load_database_url() -> str:
    """BuFin runs on PostgreSQL only (ADR-6). The URL is required: no silent fallback to a
    local file, which would hide a missing configuration behind an empty database."""
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not set. Start the local database with `docker compose up -d postgres` "
            "and copy DATABASE_URL from .env.example."
        )
    # Hosted providers hand out plain postgres:// or postgresql:// URLs; pin the psycopg 3 driver.
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            url = "postgresql+psycopg://" + url[len(prefix):]
    if not url.startswith("postgresql+psycopg://"):
        raise RuntimeError("DATABASE_URL must be a PostgreSQL URL (postgresql+psycopg://...); SQLite is no longer supported.")
    return url


def _int_env(name: str, default: int) -> int:
    raw = os.getenv(name, str(default))
    try:
        value = int(raw)
    except ValueError:
        raise RuntimeError(f"{name} must be an integer, got {raw!r}") from None
    if value < 1:  # SQLAlchemy treats pool_size=0 as an unlimited pool
        raise RuntimeError(f"{name} must be at least 1, got {value}")
    return value


SQLALCHEMY_DATABASE_URL = _load_database_url()

# Small pool: free Postgres tiers allow few connections, and the LangGraph checkpointer
# (ADR-6) will hold its own pool beside this one. pool_pre_ping drops connections the
# server closed while idle instead of failing the first request after a quiet period.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 5},  # a down database fails fast (and /api/ready answers 503) instead of hanging
    pool_size=_int_env("DB_POOL_SIZE", 5),
    max_overflow=_int_env("DB_MAX_OVERFLOW", 5),
)
# Readiness probe: its own one-connection pool, so a saturated request pool can neither delay nor be
# starved by the probe, and a hung database fails it within ~2 s (pool_timeout, statement_timeout).
probe_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=1,
    max_overflow=0,
    pool_timeout=2,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 3, "options": "-c statement_timeout=2000"},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Deterministic constraint and index names: Alembic autogenerate and the baseline migration
# must agree on them, and Postgres otherwise invents names that differ between databases.
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

Base = declarative_base(metadata=MetaData(naming_convention=NAMING_CONVENTION))

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
