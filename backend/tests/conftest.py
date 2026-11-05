import os
import sys
from pathlib import Path

# database.py refuses to import without DATABASE_URL. The unit tests never open a connection
# (each test builds its own in-memory engine and overrides get_db), so a placeholder is enough.
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://test:test@localhost:5432/test")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
