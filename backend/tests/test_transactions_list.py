import random

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import models
from database import get_db
from routers import transactions
from routers.auth import get_active_household_id, get_current_user


@pytest.fixture
def client(session_factory):
    Session = session_factory

    with Session() as db:
        db.add(models.User(id="u1", email="a@b.c", hashed_password="x"))
        db.add(models.User(id="u2", email="d@e.f", hashed_password="x"))
        db.commit()

    def seed(user_id, n, prefix):
        rng = random.Random(1)
        days = list(range(1, n + 1))
        rng.shuffle(days)  # insertion order must not matter
        with Session() as db:
            for i, d in enumerate(days):
                db.add(models.Transaction(
                    id=f"{prefix}{i}", user_id=user_id, amount=1.0, type="expense", necessity="variable",
                    category="Food", description="x", merchant="m",
                    date=f"2025-{(d - 1) // 28 + 1:02d}-{(d - 1) % 28 + 1:02d}",
                ))
            db.commit()

    seed("u1", 150, "t")
    seed("u2", 5, "other")

    def override_db():
        with Session() as db:
            yield db

    app = FastAPI()
    app.include_router(transactions.router, prefix="/api")
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: models.User(id="u1", email="a@b.c")
    app.dependency_overrides[get_active_household_id] = lambda: None
    return TestClient(app)


def test_list_is_newest_first_with_stable_order(client):
    rows = client.get("/api/transactions?limit=150").json()
    assert len(rows) == 150
    dates = [r["date"] for r in rows]
    assert dates == sorted(dates, reverse=True)


def test_pages_cover_every_row_exactly_once(client):
    seen = []
    for skip in range(0, 150, 40):
        seen += [r["id"] for r in client.get(f"/api/transactions?skip={skip}&limit=40").json()]
    assert len(seen) == 150 and len(set(seen)) == 150


def test_only_own_rows_are_listed(client):
    ids = {r["id"] for r in client.get("/api/transactions?limit=150").json()}
    assert not any(i.startswith("other") for i in ids)


def test_limit_has_a_hard_cap(client):
    assert client.get("/api/transactions?limit=100000").status_code == 422
    assert client.get("/api/transactions?limit=0").status_code == 422
    assert client.get("/api/transactions?skip=-1").status_code == 422


def test_dates_stay_newest_first_across_page_boundaries(client):
    first = client.get("/api/transactions?skip=0&limit=75").json()
    second = client.get("/api/transactions?skip=75&limit=75").json()
    dates = [r["date"] for r in first + second]
    assert dates == sorted(dates, reverse=True)


def test_default_limit_and_limit_boundary(client):
    assert len(client.get("/api/transactions").json()) == 100
    assert client.get("/api/transactions?limit=1000").status_code == 200
    assert client.get("/api/transactions?limit=1001").status_code == 422


def test_same_day_rows_tie_break_by_id_and_mixed_formats_group_by_day(client):
    app = client.app
    db = next(app.dependency_overrides[get_db]())
    for tx_id, date in (("z1", "2030-01-01"), ("z2", "2030-01-01"), ("z3", "2030-01-01T09:30:00"), ("z0", "2029-12-31")):
        db.add(models.Transaction(id=tx_id, user_id="u1", amount=1.0, type="expense", necessity="variable",
                                  category="Food", description="x", merchant="m", date=date))
    db.commit()
    top = [(r["id"], r["date"]) for r in client.get("/api/transactions?limit=4").json()]
    # all three 2030-01-01 rows come before 2029-12-31, and the order is deterministic
    assert [d[:10] for _, d in top] == ["2030-01-01"] * 3 + ["2029-12-31"]
    assert top == [(r["id"], r["date"]) for r in client.get("/api/transactions?limit=4").json()]
