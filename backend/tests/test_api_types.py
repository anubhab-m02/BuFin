"""The API keeps its public shape while the database got real types: money as JSON numbers, days as
YYYY-MM-DD, timestamps as ISO 8601. Bad input is a 422, never a database error."""
import datetime as dt

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import models
from database import get_db
from error_handlers import register_error_handlers
from routers import chat, debts, goals, net_worth, recurring, transactions
import schemas
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


@pytest.mark.parametrize("expected_day", [0, 32, "0", "32", "soon", "last-working-day"])
def test_recurring_plan_rejects_invalid_expected_day(client, expected_day):
    response = client.post("/api/recurring_plans", json={
        "name": "Rent", "amount": 1, "type": "expense", "frequency": "monthly",
        "expectedDate": expected_day,
    })
    assert response.status_code == 422


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


# --- forms send '' for "no date" ---

def test_a_blank_optional_day_means_no_date_but_a_required_day_still_must_be_real(client):
    assert client.post("/api/debts", json={"personName": "Raj", "amount": 5, "direction": "payable", "dueDate": ""}).json()["dueDate"] is None
    assert client.post("/api/goals", json={"name": "Trip", "targetAmount": 5, "targetDate": ""}).json()["targetDate"] is None
    plan = client.post("/api/recurring_plans", json={"name": "Rent", "amount": 5, "type": "expense", "frequency": "monthly", "expectedDate": "1", "endDate": ""})
    assert plan.status_code == 200 and plan.json()["endDate"] is None
    assert client.post("/api/transactions", json={**TX, "date": ""}).status_code == 422


# --- PUT keeps what the client did not send ---

def test_editing_a_debt_without_a_status_does_not_un_repay_it(client, session_factory):
    debt = client.post("/api/debts", json={"personName": "Raj", "amount": 50, "direction": "payable"}).json()
    assert client.post(f"/api/debts/{debt['id']}/repay", json={"date": "2025-03-04"}).status_code == 200
    resp = client.put(f"/api/debts/{debt['id']}", json={"personName": "Rajesh", "amount": 50, "direction": "payable"})
    assert resp.status_code == 200 and resp.json()["status"] == "repaid" and resp.json()["personName"] == "Rajesh"


def test_editing_a_transaction_without_a_necessity_keeps_it(client):
    tx_id = client.post("/api/transactions", json={**TX, "necessity": "fixed"}).json()["id"]
    body = {k: v for k, v in TX.items()}
    resp = client.put(f"/api/transactions/{tx_id}", json={**body, "date": "2025-04-05", "amount": 20})
    assert resp.status_code == 200 and resp.json()["necessity"] == "fixed" and resp.json()["date"] == "2025-04-05"


def test_transaction_put_rejects_timestamp_dates(client):
    tx_id = client.post("/api/transactions", json=TX).json()["id"]
    resp = client.put(f"/api/transactions/{tx_id}", json={**TX, "date": "2025-04-05T12:30:00Z"})
    assert resp.status_code == 422


def test_recurring_transaction_move_to_occupied_date_returns_409(client, session_factory):
    with session_factory() as db:
        db.add(models.RecurringPlan(id="rent", user_id="u", name="Rent", amount=100.0,
                                    type="expense", frequency="monthly", expectedDate="1"))
        db.add_all([
            models.Transaction(id="one", user_id="u", date=dt.date(2026, 11, 1), amount=100.0,
                               category="Bills", description="Rent", type="expense", necessity="fixed",
                               recurring_plan_id="rent"),
            models.Transaction(id="two", user_id="u", date=dt.date(2026, 11, 2), amount=100.0,
                               category="Bills", description="Rent", type="expense", necessity="fixed",
                               recurring_plan_id="rent"),
        ])
        db.commit()

    resp = client.put("/api/transactions/two", json={**TX, "date": "2026-11-01"})
    assert resp.status_code == 409
    assert "2026-11-01" in resp.json()["detail"]


def test_manual_transaction_may_share_recurring_date(client, session_factory):
    with session_factory() as db:
        db.add(models.RecurringPlan(id="rent", user_id="u", name="Rent", amount=100.0,
                                    type="expense", frequency="monthly", expectedDate="1"))
        db.add_all([
            models.Transaction(id="recurring", user_id="u", date=dt.date(2026, 11, 1), amount=100.0,
                               category="Bills", description="Rent", type="expense", necessity="fixed",
                               recurring_plan_id="rent"),
            models.Transaction(id="manual", user_id="u", date=dt.date(2026, 11, 2), amount=100.0,
                               category="Bills", description="Lunch", type="expense", necessity="fixed"),
        ])
        db.commit()

    resp = client.put("/api/transactions/manual", json={**TX, "date": "2026-11-01"})
    assert resp.status_code == 200


def test_unrelated_integrity_error_is_not_converted_to_409(client, monkeypatch):
    from sqlalchemy.exc import IntegrityError
    from sqlalchemy.orm import Session

    tx_id = client.post("/api/transactions", json=TX).json()["id"]

    def fail_commit(self):
        raise IntegrityError("update", {}, RuntimeError("unrelated constraint"))

    monkeypatch.setattr(Session, "commit", fail_commit)
    resp = client.put(f"/api/transactions/{tx_id}", json={**TX, "date": "2025-04-05"})
    assert resp.status_code == 500


@pytest.mark.parametrize("payload", [{"targetAmount": None}, {"name": None}, {"currentAmount": None}])
def test_an_explicit_null_in_a_goal_update_means_unchanged_not_a_500(client, payload):
    goal = client.post("/api/goals", json={"name": "Trip", "targetAmount": 100}).json()
    resp = client.put(f"/api/goals/{goal['id']}", json=payload)
    assert resp.status_code == 200 and resp.json()["name"] == "Trip" and resp.json()["targetAmount"] == 100


def test_a_goal_edit_that_sets_the_saved_amount_records_a_clean_cent_delta(client):
    goal = client.post("/api/goals", json={"name": "Trip", "targetAmount": 100}).json()
    client.put(f"/api/goals/{goal['id']}", json={"currentAmount": 0.3})
    resp = client.put(f"/api/goals/{goal['id']}", json={"currentAmount": 0.6})
    assert [c["amount"] for c in resp.json()["contributions"]] == [0.3, 0.3]


# --- bounds that match the columns ---

@pytest.mark.parametrize("cost", [-1, 1e13])
def test_wishlist_cost_is_bounded_like_the_column(client, cost):
    assert client.post("/api/wishlist", json={"name": "Phone", "cost": cost}).status_code == 422


def test_a_goal_cannot_be_pushed_past_what_the_column_holds(client):
    goal = client.post("/api/goals", json={"name": "Trip", "targetAmount": 100}).json()
    big = {"amount": schemas.MAX_MONEY, "date": "2025-03-04"}
    assert client.post(f"/api/goals/{goal['id']}/contribute", json=big).status_code == 200
    resp = client.post(f"/api/goals/{goal['id']}/contribute", json={"amount": 1, "date": "2025-03-04"})
    assert resp.status_code == 400 and "cannot hold" in resp.json()["detail"]


def test_responses_do_not_reapply_input_bounds_to_stored_rows(client, session_factory):
    with session_factory() as db:  # a row that bypassed the API but is valid for the database
        db.add(models.Transaction(id="big", user_id="u", date=dt.date(2025, 1, 1), amount=5_000_000_000_000.0, category="c", description="d", type="income"))
        db.commit()
    resp = client.get("/api/transactions")
    assert resp.status_code == 200 and resp.json()[0]["amount"] == 5_000_000_000_000.0


# --- recurring materialization under a race ---

def test_a_lost_race_on_one_plan_does_not_discard_the_other_plans_new_rows(session_factory):
    from routers import recurring

    class FixedDate(dt.date):
        @classmethod
        def today(cls):
            return cls(2026, 12, 15)

    with session_factory() as setup:
        setup.add(models.User(id="u", email="u@x.y", hashed_password="x"))
        setup.flush()
        for pid, day in (("a", "1"), ("b", "2")):
            setup.add(models.RecurringPlan(id=pid, user_id="u", name=pid, amount=10.0, type="expense", frequency="monthly", expectedDate=day))
        setup.commit()

    with session_factory() as db:
        user = db.get(models.User, "u")

        class RacingSession:
            raced = False

            def query(self, *a, **k):
                return db.query(*a, **k)

            @property
            def bind(self):
                return db.bind

            def execute(self, statement):
                if not RacingSession.raced:  # another request materializes plan a's December occurrence first
                    RacingSession.raced = True
                    with session_factory() as other:
                        other.add(models.Transaction(id="other", user_id="u", date=dt.date(2026, 12, 1), amount=10.0, category="Bills",
                                                     description="a", type="expense", recurring_plan_id="a"))
                        other.commit()
                return db.execute(statement)

            def commit(self):
                return db.commit()

        from unittest.mock import patch
        with patch.object(recurring, "date", FixedDate):
            recurring._materialize_recurring_plans(RacingSession(), user)

    with session_factory() as check:
        rows = {(t.recurring_plan_id, t.date): t.id for t in check.query(models.Transaction)}
    assert rows[("a", dt.date(2026, 12, 1))] == "other"  # exactly one row for the contested occurrence
    assert ("b", dt.date(2026, 12, 2)) in rows  # the other plan still got its row
