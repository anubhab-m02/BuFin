import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from database import probe_engine

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health")
def liveness():
    """The process is up. Deliberately independent of the database: an orchestrator that restarts
    containers on this check must not turn a database blip into a restart loop."""
    return {"status": "ok"}


@router.get("/ready")
def readiness():
    """The database answers. For load balancers and start-up ordering, not for restarts. Anonymous
    and silent on failure: the reason goes to the log (one line, no traceback: a probe every few
    seconds during an outage would flood it), never to the caller. Uses its own bounded pool."""
    try:
        with probe_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        logger.warning("readiness check failed: %s", exc.__class__.__name__)
        return JSONResponse(status_code=503, content={"status": "unavailable"})
    return {"status": "ready"}
