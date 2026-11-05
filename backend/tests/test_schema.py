"""The database enforces its own rules: CHECK constraints, ondelete behaviour, unique and partial
indexes, exact money and real dates. These run on PostgreSQL against a schema built by the
Alembic baseline (see conftest.py)."""
import datetime as dt

import pytest
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import text
from sqlalchemy.exc import DataError, IntegrityError

import models

NOW = dt.datetime(2025, 1, 1, tzinfo=dt.timezone.utc)


@pytest.fixture
def db(session_factory):
    with session_factory() as session:
        session.add_all([
            models.User(id="a", email="a@x.y", hashed_password="x"),
            models.User(id="b", email="b@x.y", hashed_password="x"),
        ])
        session.commit()
        yield session


def tx(id="t", **over):
    row = dict(id=id, user_id="a", date=dt.date(2025, 1, 1), amount=10.0, category="Food", description="x", type="expense")
    row.update(over)
    return models.Transaction(**row)


def rejected(db, *rows):
    db.add_all(rows)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_the_migration_matches_the_models_exactly(pg_engine):
    with pg_engine.connect() as conn:
        diff = compare_metadata(MigrationContext.configure(conn, opts={"compare_type": True}), models.Base.metadata)
    assert diff == []


@pytest.mark.parametrize("bad", [
    dict(type="transfer"), dict(necessity="optional"), dict(amount=0), dict(amount=-5),
])
def test_transactions_reject_invalid_values(db, bad):
    rejected(db, tx(**bad))


def test_transactions_accept_every_value_the_app_writes(db):
    db.add_all([tx("t1", necessity="fixed"), tx("t2", necessity="variable"), tx("t3", necessity="essential", type="income")])
    db.commit()


@pytest.mark.parametrize("row", [
    lambda: models.Debt(id="d", user_id="a", personName="p", amount=5.0, direction="owed"),
    lambda: models.Debt(id="d", user_id="a", personName="p", amount=5.0, direction="payable", status="paid"),
    lambda: models.Goal(id="g", user_id="a", name="n", targetAmount=0.0),
    lambda: models.Goal(id="g", user_id="a", name="n", targetAmount=5.0, currentAmount=-1.0),
    lambda: models.Goal(id="g", user_id="a", name="n", targetAmount=5.0, type="gold"),
    lambda: models.RecurringPlan(id="p", user_id="a", name="n", amount=5.0, type="expense", frequency="daily", expectedDate="1"),
    lambda: models.ChatSession(id="c", user_id="a", mode="coach", created_at=NOW, updated_at=NOW),
    lambda: models.Budget(id="b1", user_id="a", category="Food", monthlyLimit=-1.0),
])
def test_other_tables_reject_invalid_values(db, row):
    rejected(db, row())


def test_membership_roles_and_double_membership_are_rejected(db):
    db.add(models.Household(id="h", name="H", created_by="a", created_at=NOW))
    db.commit()
    rejected(db, models.HouseholdMember(id="m", household_id="h", user_id="a", role="admin", joined_at=NOW))
    db.add(models.HouseholdMember(id="m1", household_id="h", user_id="a", role="owner", joined_at=NOW))
    db.commit()
    rejected(db, models.HouseholdMember(id="m2", household_id="h", user_id="a", role="member", joined_at=NOW))


def test_email_is_unique_ignoring_case(db):
    rejected(db, models.User(id="c", email="A@X.Y", hashed_password="x"))


def test_one_occurrence_per_recurring_plan_and_day_but_manual_rows_are_free(db):
    db.add(models.RecurringPlan(id="p", user_id="a", name="Rent", amount=1000.0, type="expense", frequency="monthly", expectedDate="1"))
    db.commit()
    db.add(tx("t1", recurring_plan_id="p"))
    db.commit()
    rejected(db, tx("t2", recurring_plan_id="p"))  # same plan, same day
    db.add_all([tx("t3", recurring_plan_id="p", date=dt.date(2025, 2, 1)), tx("m1"), tx("m2")])  # other day; two manual rows on one day
    db.commit()


def test_money_is_exact_and_bounded(db):
    db.add(tx("t1", amount=0.1 + 0.2))
    db.commit()
    assert db.execute(text("SELECT amount::text FROM transactions WHERE id = 't1'")).scalar() == "0.30"
    db.add(tx("big", amount=1e13))  # more than NUMERIC(15,2) holds
    with pytest.raises(DataError):
        db.commit()
    db.rollback()


def test_dates_are_real_dates(db):
    db.add(tx("t1", date="2025-02-30"))  # not a calendar day
    with pytest.raises(DataError):
        db.commit()
    db.rollback()
    db.add(tx("t2", date="2025-02-28"))
    db.commit()
    assert db.get(models.Transaction, "t2").date == dt.date(2025, 2, 28)


def test_deleting_a_goal_removes_its_contributions(db):
    db.add_all([models.Goal(id="g", user_id="a", name="n", targetAmount=5.0)])
    db.flush()
    db.add(models.GoalContribution(id="c", goal_id="g", user_id="a", amount=1.0, created_at=NOW))
    db.commit()
    db.execute(text("DELETE FROM goals WHERE id = 'g'"))
    assert db.execute(text("SELECT count(*) FROM goal_contributions")).scalar() == 0


def test_deleting_a_user_cascades_personal_rows_and_anonymises_shared_ones(db):
    db.add(models.Household(id="h", name="H", created_by="a", created_at=NOW))
    db.flush()
    db.add_all([
        models.Debt(id="d", user_id="a", personName="p", amount=5.0, direction="payable"),
        models.Budget(id="bud", user_id="a", category="Food", monthlyLimit=1.0),
        models.HouseholdMember(id="m", household_id="h", user_id="a", role="owner", joined_at=NOW),
        tx("shared", household_id="h"),
        models.HouseholdInvite(id="i", household_id="h", code="C", created_by="a", expires_at=NOW, created_at=NOW),
    ])
    db.commit()
    db.execute(text("DELETE FROM users WHERE id = 'a'"))
    count = lambda table: db.execute(text(f"SELECT count(*) FROM {table}")).scalar()
    assert (count("debts"), count("budgets"), count("household_members"), count("household_invites")) == (0, 0, 0, 0)
    assert db.execute(text("SELECT user_id FROM transactions WHERE id = 'shared'")).scalar() is None  # row stays, anonymised
    assert db.execute(text("SELECT created_by FROM households WHERE id = 'h'")).scalar() is None


def test_deleting_a_household_or_debt_or_plan_clears_pointers_but_keeps_the_rows(db):
    db.add_all([models.Household(id="h", name="H", created_by="a", created_at=NOW),
                models.Debt(id="d", user_id="a", personName="p", amount=5.0, direction="payable"),
                models.RecurringPlan(id="p", user_id="a", name="n", amount=5.0, type="expense", frequency="monthly", expectedDate="1")])
    db.flush()
    db.add(tx("t", household_id="h", linked_debt_id="d", recurring_plan_id="p"))
    db.commit()
    for table in ("households", "debts", "recurring_plans"):
        db.execute(text(f"DELETE FROM {table}"))
    row = db.execute(text("SELECT household_id, linked_debt_id, recurring_plan_id FROM transactions WHERE id = 't'")).one()
    assert tuple(row) == (None, None, None)


def test_the_indexes_the_queries_rely_on_exist(pg_engine):
    with pg_engine.connect() as conn:
        names = {r[0] for r in conn.execute(text("SELECT indexname FROM pg_indexes WHERE schemaname = 'public'"))}
    assert {"ix_transactions_user_date", "ix_transactions_household_date", "uq_transactions_recurring_plan_date",
            "uq_users_email_lower", "ix_goal_contributions_goal_id", "ix_goal_contributions_user_id",
            "ix_household_invites_created_by", "ix_household_invites_used_by", "ix_households_created_by",
            "ix_chat_messages_session_created"} <= names


def test_deleting_a_household_removes_rows_nobody_can_reach_but_returns_the_rest_to_their_owners(db):
    from routers.households import _delete_household

    db.add(models.Household(id="h", name="H", created_by="a", created_at=NOW))
    db.flush()
    db.add_all([tx("mine", household_id="h"), tx("orphan", household_id="h", user_id=None),
                models.Goal(id="g-mine", user_id="a", name="n", targetAmount=5.0, household_id="h"),
                models.Goal(id="g-orphan", user_id=None, name="n", targetAmount=5.0, household_id="h")])
    db.flush()
    db.add(models.GoalContribution(id="c", goal_id="g-orphan", user_id=None, amount=1.0, created_at=NOW))
    db.commit()
    _delete_household(db, "h")
    db.commit()
    assert [r[0] for r in db.execute(text("SELECT id FROM transactions"))] == ["mine"]
    assert db.execute(text("SELECT household_id FROM transactions WHERE id = 'mine'")).scalar() is None
    assert [r[0] for r in db.execute(text("SELECT id FROM goals"))] == ["g-mine"]
    assert db.execute(text("SELECT count(*) FROM goal_contributions")).scalar() == 0
