import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import models
from database import get_db
from error_handlers import register_error_handlers
from routers import debts, goals, transactions
from routers.auth import get_active_household_id, get_current_user


@pytest.fixture
def env():
    # Throwaway in-memory database with foreign keys enforced. Never touches bufin.db.
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)

    @event.listens_for(engine, "connect")
    def _fk_on(conn, _):
        conn.execute("PRAGMA foreign_keys=ON")

    models.Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)

    with Session() as db:
        db.add_all([
            models.User(id="a", email="a@x.y", hashed_password="x"),
            models.User(id="b", email="b@x.y", hashed_password="x"),
        ])
        db.flush()
        db.add_all([
            models.Debt(id="owe", user_id="a", personName="Raj", amount=500.0, direction="payable", status="active"),
            models.Debt(id="lent", user_id="a", personName="Sam", amount=300.0, direction="receivable", status="active"),
            models.Debt(id="b-debt", user_id="b", personName="Zed", amount=9.0, direction="payable", status="active"),
            models.Goal(id="trip", user_id="a", name="Trip", targetAmount=1000.0, currentAmount=200.0),
            models.Goal(id="b-goal", user_id="b", name="Car", targetAmount=1000.0, currentAmount=0.0),
        ])
        db.commit()

    def override_db():
        with Session() as db:
            yield db

    app = FastAPI()
    register_error_handlers(app)
    for r in (debts, goals, transactions):
        app.include_router(r.router, prefix="/api")
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: models.User(id="a", email="a@x.y")
    app.dependency_overrides[get_active_household_id] = lambda: None
    return TestClient(app, raise_server_exceptions=False), Session


def txs(Session):
    with Session() as db:
        return db.query(models.Transaction).all()


def test_repaying_a_payable_debt_marks_it_repaid_and_records_one_expense(env):
    client, Session = env
    response = client.post("/api/debts/owe/repay", json={"date": "2026-11-05"})
    assert response.status_code == 200
    body = response.json()
    assert body["debt"]["status"] == "repaid"
    tx = body["transaction"]
    assert (tx["type"], tx["amount"], tx["category"], tx["date"], tx["linked_debt_id"]) == \
        ("expense", 500.0, "Debt Repayment", "2026-11-05", "owe")
    assert len(txs(Session)) == 1


def test_a_receivable_repayment_is_income(env):
    client, _ = env
    tx = client.post("/api/debts/lent/repay", json={"date": "2026-11-05"}).json()["transaction"]
    assert (tx["type"], tx["amount"]) == ("income", 300.0)


def test_repaying_twice_or_someone_elses_debt_is_rejected_and_records_nothing_extra(env):
    client, Session = env
    assert client.post("/api/debts/owe/repay", json={"date": "2026-11-05"}).status_code == 200
    assert client.post("/api/debts/owe/repay", json={"date": "2026-11-05"}).status_code == 409
    assert client.post("/api/debts/b-debt/repay", json={"date": "2026-11-05"}).status_code == 404
    assert client.post("/api/debts/owe/repay", json={"date": "05-11-2026"}).status_code == 422
    assert len(txs(Session)) == 1


def test_a_failure_while_recording_the_repayment_leaves_the_debt_active(env, monkeypatch):
    client, Session = env

    def boom(*args, **kwargs):
        raise RuntimeError("disk full")

    monkeypatch.setattr(debts, "new_transaction", boom)
    assert client.post("/api/debts/owe/repay", json={"date": "2026-11-05"}).status_code == 500
    with Session() as db:
        assert db.get(models.Debt, "owe").status == "active"
    assert txs(Session) == []


def test_borrowing_records_income_in_the_same_request_and_lending_does_not(env):
    client, Session = env
    borrowed = client.post("/api/debts", json={"personName": "Kim", "amount": 1000, "direction": "payable", "cash_in_date": "2026-11-05"})
    assert borrowed.status_code == 200
    assert borrowed.json()["transaction"]["type"] == "income"
    lent = client.post("/api/debts", json={"personName": "Lee", "amount": 50, "direction": "receivable", "cash_in_date": "2026-11-05"})
    assert lent.json()["transaction"] is None
    plain = client.post("/api/debts", json={"personName": "Max", "amount": 5, "direction": "payable"})
    assert plain.json()["transaction"] is None
    assert len(txs(Session)) == 1


def test_depositing_to_a_goal_updates_the_goal_and_records_a_savings_expense(env):
    client, Session = env
    response = client.post("/api/goals/trip/contribute", json={"amount": 150, "date": "2026-11-05"})
    assert response.status_code == 200
    body = response.json()
    assert body["goal"]["currentAmount"] == 350.0
    assert (body["transaction"]["type"], body["transaction"]["category"], body["transaction"]["amount"]) == ("expense", "Savings", 150.0)
    with Session() as db:
        assert [c.amount for c in db.query(models.GoalContribution)] == [150.0]


def test_withdrawing_is_income_and_cannot_overdraw_the_goal(env):
    client, Session = env
    ok = client.post("/api/goals/trip/contribute", json={"amount": -50, "date": "2026-11-05"})
    assert ok.json()["goal"]["currentAmount"] == 150.0
    assert ok.json()["transaction"]["type"] == "income"
    too_much = client.post("/api/goals/trip/contribute", json={"amount": -9999, "date": "2026-11-05"})
    assert too_much.status_code == 400
    with Session() as db:
        assert db.get(models.Goal, "trip").currentAmount == 150.0
    assert len(txs(Session)) == 1


def test_goal_contribution_rejects_zero_other_peoples_goals_and_bad_dates(env):
    client, Session = env
    assert client.post("/api/goals/trip/contribute", json={"amount": 0, "date": "2026-11-05"}).status_code == 422
    assert client.post("/api/goals/b-goal/contribute", json={"amount": 5, "date": "2026-11-05"}).status_code == 404
    assert client.post("/api/goals/trip/contribute", json={"amount": 5, "date": "yesterday"}).status_code == 422
    assert txs(Session) == []


def test_a_failure_while_recording_a_goal_transfer_leaves_the_goal_unchanged(env, monkeypatch):
    client, Session = env
    monkeypatch.setattr(goals, "new_transaction", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("boom")))
    assert client.post("/api/goals/trip/contribute", json={"amount": 100, "date": "2026-11-05"}).status_code == 500
    with Session() as db:
        assert db.get(models.Goal, "trip").currentAmount == 200.0
        assert db.query(models.GoalContribution).count() == 0


def test_deleting_a_repayment_transaction_reverts_the_debt_in_the_same_request(env):
    client, Session = env
    tx_id = client.post("/api/debts/owe/repay", json={"date": "2026-11-05"}).json()["transaction"]["id"]
    response = client.delete(f"/api/transactions/{tx_id}")
    assert response.status_code == 200
    assert response.json()["reverted_debt_id"] == "owe"
    with Session() as db:
        assert db.get(models.Debt, "owe").status == "active"
    assert txs(Session) == []


def test_deleting_an_ordinary_transaction_reports_no_reverted_debt(env):
    client, Session = env
    with Session() as db:
        db.add(models.Transaction(id="plain", user_id="a", amount=1.0, type="expense", necessity="variable",
                                  category="c", description="d", merchant="m", date="2026-11-05"))
        db.commit()
    assert client.delete("/api/transactions/plain").json()["reverted_debt_id"] is None
