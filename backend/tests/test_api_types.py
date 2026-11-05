"""The API keeps its public shape while the database got real types: money as JSON numbers, days as
YYYY-MM-DD, timestamps as ISO 8601. Bad input is a 422, never a database error."""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import models
from database import get_db
from error_handlers import register_error_handlers
from routers import chat, debts, goals, net_worth, recurring, transactions
from routers.auth import get_active_household_id, get_current_user


@pytest.fixture
def client(session_factory):
    Session = session_factory
    with Session() as db:
        db.add(models.User(id="u", email="u@x.y", hashed_password="x"))
        db.commit()

    def override_db():
        with Session() as db:
            yield db

    app = FastAPI()
    register_error_handlers(app)
    for r in (transactions, debts, goals, recurring, net_worth, chat):
        app.include_router(r.router, prefix="/api")
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: models.User(id="u", email="u@x.y")
    app.dependency_overrides[get_active_household_id] = lambda: None
    return TestClient(app, raise_server_exceptions=False)


TX = {"amount": 12.5, "category": "Food", "description": "lunch", "type": "expense", "date": "2025-03-04"}


def test_a_transaction_round_trips_with_a_plain_day_and_a_number(client):
    created = client.post("/api/transactions", json=TX)
    assert created.status_code == 200
    body = created.json()
    assert body["date"] == "2025-03-04" and body["amount"] == 12.5 and body["necessity"] == "variable"
    assert client.get("/api/transactions").json()[0]["date"] == "2025-03-04"


@pytest.mark.parametrize("bad_date", ["2025-3-4", "20250304", "2025-03-04T10:00:00Z", "2025-02-30", 20250304, "", None])
def test_only_a_canonical_day_is_accepted(client, bad_date):
    assert client.post("/api/transactions", json={**TX, "date": bad_date}).status_code == 422


@pytest.mark.parametrize("field,value", [
    ("amount", 0), ("amount", -1), ("amount", 1e13), ("amount", float("nan")),
    ("type", "transfer"), ("necessity", "optional"),
])
def test_invalid_transaction_values_are_422_not_a_database_error(client, field, value):
    resp = client.post("/api/transactions", json={**TX, field: value})
    assert resp.status_code == 422, resp.text


def test_amounts_are_rounded_to_cents_so_the_response_matches_what_is_stored(client):
    resp = client.post("/api/transactions", json={**TX, "amount": 10.126})
    assert resp.json()["amount"] == 10.13


def test_goal_totals_do_not_drift_across_repeated_float_deposits(client):
    goal = client.post("/api/goals", json={"name": "Trip", "targetAmount": 100}).json()
    for _ in range(3):
        assert client.post(f"/api/goals/{goal['id']}/contribute", json={"amount": 0.1, "date": "2025-03-04"}).status_code == 200
    assert client.get("/api/goals").json()[0]["currentAmount"] == 0.3
    resp = client.post(f"/api/goals/{goal['id']}/contribute", json={"amount": -0.3, "date": "2025-03-04"})
    assert resp.status_code == 200 and resp.json()["goal"]["currentAmount"] == 0.0


def test_goal_dates_and_timestamps_serialize_as_iso(client):
    goal = client.post("/api/goals", json={"name": "Trip", "targetAmount": 100, "targetDate": "2026-01-31"}).json()
    assert goal["targetDate"] == "2026-01-31"
    client.post(f"/api/goals/{goal['id']}/contribute", json={"amount": 5, "date": "2025-03-04"})
    contribution = client.get("/api/goals").json()[0]["contributions"][0]
    assert contribution["created_at"].startswith("20") and ("T" in contribution["created_at"])


def test_debt_and_plan_dates_and_enums(client):
    debt = client.post("/api/debts", json={"personName": "Raj", "amount": 50, "direction": "receivable", "dueDate": "2025-06-30"})
    assert debt.status_code == 200 and debt.json()["dueDate"] == "2025-06-30"
    assert client.post("/api/debts", json={"personName": "Raj", "amount": 50, "direction": "owed"}).status_code == 422
    plan = client.post("/api/recurring_plans", json={"name": "Rent", "amount": 1000, "type": "expense", "frequency": "monthly", "expectedDate": "1", "endDate": "2026-12-31"})
    assert plan.status_code == 200 and plan.json()["endDate"] == "2026-12-31"
    assert client.post("/api/recurring_plans", json={"name": "X", "amount": 1, "type": "expense", "frequency": "daily", "expectedDate": "1"}).status_code == 422


def test_materialized_recurring_occurrences_are_dated_days_and_not_duplicated(client):
    client.post("/api/recurring_plans", json={"name": "Rent", "amount": 1000, "type": "expense", "frequency": "monthly", "expectedDate": "1"})
    first = client.get("/api/recurring_plans")
    second = client.get("/api/recurring_plans")  # a second load must not create a second occurrence
    assert first.status_code == second.status_code == 200
    rows = [t for t in client.get("/api/transactions").json() if t["recurring_plan_id"]]
    assert len(rows) == len({t["date"] for t in rows}) >= 1
    assert all(len(t["date"]) == 10 for t in rows)


def test_net_worth_and_chat_timestamps_and_validation(client):
    asset = client.post("/api/net-worth/assets", json={"name": "Cash", "category": "cash", "current_value": 100.5})
    assert asset.status_code == 200 and "T" in asset.json()["created_at"]
    assert client.post("/api/net-worth/assets", json={"name": "Cash", "category": "cash", "current_value": -1}).status_code == 422
    snapshot = client.get("/api/net-worth/snapshots").json()[0]
    assert snapshot["total_assets"] == 100.5 and "T" in snapshot["recorded_at"]
    assert client.post("/api/chat/sessions", json={"mode": "coach"}).status_code == 422
    session = client.post("/api/chat/sessions", json={"mode": "analyst"})
    assert session.status_code == 200 and "T" in session.json()["created_at"]
    sid = session.json()["id"]
    assert client.post(f"/api/chat/sessions/{sid}/messages", json={"role": "system", "content": "x"}).status_code == 422
    assert client.post(f"/api/chat/sessions/{sid}/messages", json={"role": "user", "content": "hello"}).status_code == 200
