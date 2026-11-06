"""Liveness says the process is up and never touches the database; readiness proves the database
answers and reveals nothing when it does not; shutdown releases the connection pool."""
import pytest
from fastapi.testclient import TestClient

import time

import database
import main


@pytest.fixture
def client():
    return TestClient(main.app)


def test_liveness_is_ok_without_touching_the_database(client, monkeypatch):
    def boom(*a, **k):
        raise AssertionError("liveness must not open a database connection")

    monkeypatch.setattr(database.engine, "connect", boom)
    monkeypatch.setattr(database.probe_engine, "connect", boom)
    resp = client.get("/api/health")
    assert resp.status_code == 200 and resp.json() == {"status": "ok"}


def test_readiness_is_ok_when_the_database_answers(client, pg_engine):
    resp = client.get("/api/ready")
    assert resp.status_code == 200 and resp.json() == {"status": "ready"}


def test_readiness_is_503_with_no_detail_when_the_database_is_down(client, monkeypatch):
    def down(*a, **k):
        raise RuntimeError("password authentication failed for user bufin at 10.0.0.5")

    monkeypatch.setattr(database.probe_engine, "connect", down)
    resp = client.get("/api/ready")
    assert resp.status_code == 503
    assert resp.json() == {"status": "unavailable"}
    assert "password" not in resp.text and "10.0.0.5" not in resp.text


def test_health_endpoints_need_no_credentials_and_expose_no_version(client, pg_engine):
    for path in ("/api/health", "/api/ready"):
        resp = client.get(path)  # no Authorization header
        assert resp.status_code == 200, path
        assert "version" not in resp.text.lower() and "bufin" not in resp.text.lower()


def test_readiness_does_not_compete_with_a_saturated_request_pool(client, pg_engine):
    held = [database.engine.connect() for _ in range(10)]  # pool_size 5 + max_overflow 5: every slot taken
    try:
        started = time.monotonic()
        resp = client.get("/api/ready")
        assert resp.status_code == 200 and time.monotonic() - started < 2
    finally:
        for conn in held:
            conn.close()


def test_readiness_fails_fast_when_its_own_connection_is_stuck(client, pg_engine):
    stuck = database.probe_engine.connect()  # the probe pool holds exactly one connection
    try:
        started = time.monotonic()
        resp = client.get("/api/ready")
        assert resp.status_code == 503 and time.monotonic() - started < 5  # pool_timeout is 2 s, not 30
    finally:
        stuck.close()


def test_shutdown_disposes_the_connection_pool(monkeypatch):
    calls = []
    monkeypatch.setattr(database.engine, "dispose", lambda *a, **k: calls.append("requests"))
    monkeypatch.setattr(database.probe_engine, "dispose", lambda *a, **k: calls.append("probe"))
    with TestClient(main.app):
        assert calls == []  # still serving
    assert calls == ["requests", "probe"]
