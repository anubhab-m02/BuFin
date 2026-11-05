import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
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


SQLALCHEMY_DATABASE_URL = _load_database_url()

# Small pool: free Postgres tiers allow few connections, and the LangGraph checkpointer
# (ADR-6) will hold its own pool beside this one. pool_pre_ping drops connections the
# server closed while idle instead of failing the first request after a quiet period.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
    max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "5")),
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
