import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import ai_service
from routers import ai
from routers.auth import get_current_user

ROUTES = {
    "/api/ai/classify": {"text": "Lunch 250"},
    "/api/ai/analyze": {"query": "Buy a phone?", "context": {"balance": 1}},
    "/api/ai/alert": {"transactions": [], "balance": 100.0, "recurringPlans": [], "today": "2026-11-05"},
    "/api/ai/tips": {"transactions": [], "balance": 100.0},
    "/api/coach/chat": {"message": "hi", "mode": "analyst"},
}


@pytest.fixture
def app():
    app = FastAPI()
    app.include_router(ai.router, prefix="/api")
    return app


@pytest.fixture
def stub_ai(monkeypatch):
    async def fake(*args, **kwargs):
        return {"ok": True}

    for name in ("classify_transaction", "analyze_purchase", "generate_spending_alert",
                 "generate_financial_tips", "coach_chat"):
        monkeypatch.setattr(ai_service, name, fake)


@pytest.mark.parametrize("path,body", ROUTES.items())
def test_requires_authentication(app, stub_ai, path, body):
    response = TestClient(app).post(path, json=body)
    assert response.status_code == 401


@pytest.mark.parametrize("path,body", ROUTES.items())
def test_authenticated_call_succeeds(app, stub_ai, path, body):
    app.dependency_overrides[get_current_user] = lambda: object()
    response = TestClient(app).post(path, json=body)
    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_rejects_missing_and_oversized_fields(app, stub_ai):
    app.dependency_overrides[get_current_user] = lambda: object()
    client = TestClient(app)
    assert client.post("/api/ai/classify", json={}).status_code == 422
    assert client.post("/api/ai/classify", json={"text": "x" * 2001}).status_code == 422
    assert client.post("/api/coach/chat", json={"message": "hi"}).status_code == 422
    assert client.post("/api/ai/tips", json={"transactions": [{}] * 5001, "balance": 1}).status_code == 422
    assert client.post("/api/ai/alert", json={**ROUTES["/api/ai/alert"], "today": "yesterday"}).status_code == 422


def test_rejects_oversized_context(app, stub_ai):
    app.dependency_overrides[get_current_user] = lambda: object()
    big = {"blob": "x" * 600_000}
    response = TestClient(app).post("/api/ai/analyze", json={"query": "q", "context": big})
    assert response.status_code == 422
