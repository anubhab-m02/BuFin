import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import models
from database import get_db
from routers import auth, budgets, debts, goals, recurring, transactions
from routers.auth import get_active_household_id, get_current_user

TABLES_OWNED_BY_A = [
    models.Transaction, models.RecurringPlan, models.Debt, models.WishlistItem, models.Goal,
    models.Budget, models.Asset, models.Liability, models.NetWorthSnapshot, models.ChatSession,
]


@pytest.fixture
def env():
    # Throwaway in-memory database with foreign keys enforced, like Postgres. Never touches bufin.db.
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
            models.Household(id="h1", name="Shared", created_by="a", created_at="2025-01-01"),
            models.Household(id="h2", name="Solo", created_by="a", created_at="2025-01-01"),
        ])
        db.flush()
        db.add_all([
            models.HouseholdMember(id="m1", household_id="h1", user_id="a", role="owner", joined_at="2025-01-01"),
            models.HouseholdMember(id="m2", household_id="h1", user_id="b", role="owner", joined_at="2025-01-01"),
            models.HouseholdMember(id="m3", household_id="h2", user_id="a", role="owner", joined_at="2025-01-01"),
            models.RecurringPlan(id="plan-a", user_id="a", name="Rent", amount=1.0, type="expense",
                                 frequency="monthly", expectedDate="1"),
            models.Debt(id="debt-a", user_id="a", personName="Raj", amount=5.0, direction="owed", status="active"),
            models.Debt(id="debt-b", user_id="b", personName="Sam", amount=5.0, direction="owed", status="active"),
        ])
        db.flush()

        def tx(id, user, household=None, **extra):
            return models.Transaction(id=id, user_id=user, household_id=household, amount=1.0, type="expense",
                                      necessity="variable", category="Food", description="x", merchant="m",
                                      date="2025-01-01", **extra)

        db.add_all([
            tx("t-personal", "a"),
            tx("t-shared", "a", "h1", recurring_plan_id="plan-a", linked_debt_id="debt-a"),
            tx("t-solo", "a", "h2"),
            tx("t-b", "b"),
            models.Goal(id="g-personal", user_id="a", name="Trip", targetAmount=9.0),
            models.Goal(id="g-shared", user_id="a", name="Sofa", targetAmount=9.0, household_id="h1"),
            models.Budget(id="bud", user_id="a", category="Food", monthlyLimit=1.0),
            models.WishlistItem(id="w", user_id="a", name="Phone", cost=1.0, addedAt="2025-01-01"),
            models.Asset(id="as", user_id="a", name="Cash", category="cash", current_value=1.0, created_at="2025-01-01"),
            models.Liability(id="li", user_id="a", name="Loan", category="loan", current_balance=1.0, created_at="2025-01-01"),
            models.NetWorthSnapshot(id="nw", user_id="a", total_assets=1.0, total_liabilities=0.0, recorded_at="2025-01-01"),
            models.ChatSession(id="cs", user_id="a", mode="coach", title="t", created_at="2025-01-01", updated_at="2025-01-01"),
            models.HouseholdInvite(id="inv-a", household_id="h1", code="AAAA", created_by="a", expires_at="2030-01-01"),
            models.HouseholdInvite(id="inv-b", household_id="h1", code="BBBB", created_by="b", expires_at="2030-01-01", used_by="a"),
        ])
        db.flush()
        db.add_all([
            models.ChatMessage(id="cm", session_id="cs", role="user", content="hi"),
            models.GoalContribution(id="gc-p", goal_id="g-personal", user_id="a", amount=1.0, created_at="2025-01-01"),
            models.GoalContribution(id="gc-a", goal_id="g-shared", user_id="a", amount=1.0, created_at="2025-01-01"),
            models.GoalContribution(id="gc-b", goal_id="g-shared", user_id="b", amount=1.0, created_at="2025-01-02"),
        ])
        db.commit()

    def override_db():
        with Session() as db:
            yield db

    state = {"user": "a"}

    def override_user(db=Depends(get_db)):
        return db.get(models.User, state["user"])

    app = FastAPI()
    app.include_router(auth.router, prefix="/api/auth")
    for r in (transactions, budgets, debts, recurring, goals):
        app.include_router(r.router, prefix="/api")
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_active_household_id] = lambda: None
    return TestClient(app), Session, state


def test_deleting_an_account_removes_personal_data_and_keeps_household_data_anonymized(env):
    client, Session, _ = env
    assert client.delete("/api/auth/me").status_code == 200

    with Session() as db:
        assert db.get(models.User, "a") is None
        for model in TABLES_OWNED_BY_A:
            leftovers = [r.id for r in db.query(model).filter(model.user_id == "a")]
            only_shared = {"t-shared", "g-shared"}
            assert not leftovers, f"{model.__tablename__} still has {leftovers}"

        # the household's shared ledger survives, with the leaver detached from it
        shared_tx = db.get(models.Transaction, "t-shared")
        assert shared_tx and shared_tx.user_id is None and shared_tx.household_id == "h1"
        assert shared_tx.recurring_plan_id is None and shared_tx.linked_debt_id is None
        shared_goal = db.get(models.Goal, "g-shared")
        assert shared_goal and shared_goal.user_id is None
        contributions = {c.id: c.user_id for c in db.query(models.GoalContribution)}
        assert contributions == {"gc-a": None, "gc-b": "b"}
        assert db.get(models.Household, "h1").created_by is None
        assert db.get(models.HouseholdInvite, "inv-b").used_by is None
        assert db.get(models.HouseholdInvite, "inv-a") is None

        # a household the leaver was alone in goes away with all its rows
        assert db.get(models.Household, "h2") is None
        assert db.get(models.Transaction, "t-solo") is None

        # other people's data is untouched
        assert db.get(models.Transaction, "t-b") and db.get(models.Debt, "debt-b")


def test_a_sole_owner_with_other_members_is_blocked_and_nothing_is_deleted(env):
    client, Session, _ = env
    with Session() as db:
        db.query(models.HouseholdMember).filter(models.HouseholdMember.id == "m2").update({"role": "member"})
        db.commit()
    assert client.delete("/api/auth/me").status_code == 400
    with Session() as db:
        assert db.get(models.User, "a") and db.get(models.Transaction, "t-personal")


def test_anonymized_household_goals_still_serialize_and_stay_editable(env):
    client, _, state = env
    assert client.delete("/api/auth/me").status_code == 200
    state["user"] = "b"
    client.app.dependency_overrides[get_active_household_id] = lambda: "h1"
    listed = client.get("/api/goals").json()
    shared = next(g for g in listed if g["id"] == "g-shared")
    assert shared["user_id"] is None
    assert client.get("/api/transactions").status_code == 200


@pytest.mark.parametrize("path,body", [
    ("/api/transactions", {"amount": 1, "category": "c", "description": "d", "type": "expense", "date": "2025-01-01"}),
    ("/api/budgets", {"category": "Rent", "monthlyLimit": 1}),
    ("/api/debts", {"personName": "p", "amount": 1, "direction": "owed"}),
    ("/api/recurring_plans", {"name": "n", "amount": 1, "type": "expense", "frequency": "monthly", "expectedDate": "1"}),
])
def test_client_supplied_ids_are_ignored_on_create(env, path, body):
    client, Session, state = env
    state["user"] = "b"
    taken = {"/api/transactions": "t-personal", "/api/budgets": "bud", "/api/debts": "debt-a",
             "/api/recurring_plans": "plan-a"}[path]
    response = client.post(path, json={**body, "id": taken})
    assert response.status_code == 200
    assert response.json()["id"] != taken


def test_linked_debt_must_belong_to_the_caller(env):
    client, _, state = env
    state["user"] = "b"
    row = {"amount": 1, "category": "c", "description": "d", "type": "expense", "date": "2025-01-01"}
    assert client.post("/api/transactions", json={**row, "linked_debt_id": "debt-a"}).status_code == 404
    created = client.post("/api/transactions", json={**row, "linked_debt_id": "debt-b"})
    assert created.status_code == 200
    tx_id = created.json()["id"]
    assert client.put(f"/api/transactions/{tx_id}", json={**row, "linked_debt_id": "debt-a"}).status_code == 404
    assert client.put(f"/api/transactions/{tx_id}", json={**row, "linked_debt_id": "debt-b"}).status_code == 200
