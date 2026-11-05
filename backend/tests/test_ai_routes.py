import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import ai_service
from error_handlers import register_error_handlers
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
    register_error_handlers(app)
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


def test_alert_rejects_impossible_date_but_accepts_null_balance(app, stub_ai):
    app.dependency_overrides[get_current_user] = lambda: object()
    client = TestClient(app)
    body = {**ROUTES["/api/ai/alert"], "today": "2026-13-99"}
    assert client.post("/api/ai/alert", json=body).status_code == 422
    assert client.post("/api/ai/alert", json={**ROUTES["/api/ai/alert"], "balance": None}).status_code == 200
    assert client.post("/api/ai/tips", json={"transactions": [], "balance": None}).status_code == 200


def test_analyze_requires_context_but_accepts_a_list(app, stub_ai):
    app.dependency_overrides[get_current_user] = lambda: object()
    client = TestClient(app)
    assert client.post("/api/ai/analyze", json={"query": "q", "context": None}).status_code == 422
    assert client.post("/api/ai/analyze", json={"query": "q"}).status_code == 422
    assert client.post("/api/ai/analyze", json={"query": "q", "context": [{"amount": 1}]}).status_code == 200


def test_rejects_nan_inf_deep_nesting_and_bad_item_shapes(app, stub_ai):
    app.dependency_overrides[get_current_user] = lambda: object()
    client = TestClient(app)
    base = ROUTES["/api/ai/alert"]
    assert client.post("/api/ai/alert", content='{"transactions": [], "balance": NaN}',
                       headers={"Content-Type": "application/json"}).status_code == 422
    assert client.post("/api/ai/alert", json={**base, "balance": 1e15}).status_code == 422
    assert client.post("/api/ai/alert", json={**base, "transactions": [{"date": "2026-11-01", "type": "expense"}]}).status_code == 422
    assert client.post("/api/ai/alert", json={**base, "transactions": [{"date": "2026-11-01", "type": "expense", "amount": "ten"}]}).status_code == 422
    ok = {**base, "transactions": [{"date": "2026-11-01", "type": "expense", "amount": 10, "category": "Food"}]}
    assert client.post("/api/ai/alert", json=ok).status_code == 200
    nested = {"context": []}
    node = nested["context"]
    for _ in range(3000):
        child = []
        node.append(child)
        node = child
    assert client.post("/api/coach/chat", json={"message": "hi", "mode": "analyst", **nested}).status_code != 500


def test_validation_errors_do_not_echo_the_submitted_input(app, stub_ai):
    app.dependency_overrides[get_current_user] = lambda: object()
    response = TestClient(app).post("/api/ai/classify", json={"text": "", "secret": "hunter2"})
    assert response.status_code == 422
    assert "hunter2" not in response.text and '"input"' not in response.text
