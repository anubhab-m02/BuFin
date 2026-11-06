# BuFin backend image. Runs as the `api` service (and, later, the worker: same image, other command).
# Build context is backend/ (see docker-compose.yml).
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Dependencies first so code changes do not reinstall them. Production requirements only.
COPY requirements.txt .
RUN pip install -r requirements.txt

RUN useradd --create-home --uid 10001 bufin
COPY --chown=bufin:bufin . .
USER bufin

EXPOSE 8000

# Liveness only (never the database): a database outage must not make an orchestrator restart a healthy API.
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
    CMD ["python", "-c", "import urllib.request, sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=2).status == 200 else 1)"]

# Exec form: uvicorn is PID 1 and receives SIGTERM directly. It stops accepting connections, finishes
# in-flight requests for up to 20 s, then the app disposes the connection pool (main.py lifespan).
# --proxy-headers takes the real client address from X-Forwarded-For, but only from the addresses in
# FORWARDED_ALLOW_IPS (set in docker-compose.yml): the rate limiter keys on that address.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--timeout-graceful-shutdown", "20", "--proxy-headers"]
