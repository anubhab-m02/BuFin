import datetime as dt
from unittest.mock import patch

from sqlalchemy import event

import models
from routers import recurring


def _plan(plan_id, **values):
    values.setdefault("expectedDate", "1")
    return models.RecurringPlan(
        id=plan_id,
        user_id="u",
        name=plan_id,
        amount=100.0,
        type="expense",
        frequency="monthly",
        **values,
    )


def _transaction(tx_id, plan_id, day):
    return models.Transaction(
        id=tx_id,
        user_id="u",
        date=day,
        amount=100.0,
        category="Bills",
        description=plan_id,
        type="expense",
        necessity="fixed",
        recurring_plan_id=plan_id,
    )


def _fixed_today(year, month, day):
    class FixedDate(dt.date):
        @classmethod
        def today(cls):
            return cls(year, month, day)

    return FixedDate


def test_catches_up_multiple_months_and_is_idempotent(session_factory):
    with session_factory() as db:
        user = models.User(id="u", email="u@example.com", hashed_password="x")
        db.add_all([user, _plan("rent"), _transaction("aug", "rent", dt.date(2026, 8, 1))])
        db.commit()

    with session_factory() as db, patch.object(recurring, "date", _fixed_today(2026, 12, 15)):
        recurring._materialize_recurring_plans(db, db.get(models.User, "u"))
        recurring._materialize_recurring_plans(db, db.get(models.User, "u"))

    with session_factory() as db:
        dates = [row[0] for row in db.query(models.Transaction.date)
                 .filter_by(recurring_plan_id="rent").order_by(models.Transaction.date)]
    assert dates == [dt.date(2026, month, 1) for month in range(8, 13)]


def test_skips_invalid_legacy_expected_day_without_blocking_valid_plan(session_factory, caplog):
    with session_factory() as db:
        user = models.User(id="u", email="u@example.com", hashed_password="x")
        db.add_all([user, _plan("bad", expectedDate="32"), _plan("good")])
        db.commit()

    with session_factory() as db, patch.object(recurring, "date", _fixed_today(2026, 11, 15)):
        recurring._materialize_recurring_plans(db, db.get(models.User, "u"))

    with session_factory() as db:
        assert db.query(models.Transaction).filter_by(recurring_plan_id="bad").count() == 0
        assert db.query(models.Transaction).filter_by(
            recurring_plan_id="good", date=dt.date(2026, 11, 1)
        ).count() == 1
    assert "invalid expectedDate" in caplog.text


def test_groups_history_once_and_commits_only_when_an_occurrence_is_inserted(session_factory):
    with session_factory() as db:
        user = models.User(id="u", email="u@example.com", hashed_password="x")
        db.add(user)
        db.add_all([_plan(f"p{i}") for i in range(5)])
        db.commit()

    queries = []

    def count_history_query(conn, cursor, statement, parameters, context, executemany):
        if "MAX(transactions.date)" in statement.upper():
            queries.append(statement)

    event.listen(session_factory.kw["bind"], "before_cursor_execute", count_history_query)
    try:
        class CountingSession:
            def __init__(self, inner):
                self.inner = inner
                self.commits = 0

            @property
            def bind(self):
                return self.inner.bind

            def __getattr__(self, name):
                return getattr(self.inner, name)

            def commit(self):
                self.commits += 1
                self.inner.commit()

        with session_factory() as db, patch.object(recurring, "date", _fixed_today(2026, 11, 15)):
            counter = CountingSession(db)
            recurring._materialize_recurring_plans(counter, db.get(models.User, "u"))
            assert counter.commits == 1

        with session_factory() as db, patch.object(recurring, "date", _fixed_today(2026, 11, 15)):
            counter = CountingSession(db)
            recurring._materialize_recurring_plans(counter, db.get(models.User, "u"))
            assert counter.commits == 0
    finally:
        event.remove(session_factory.kw["bind"], "before_cursor_execute", count_history_query)

    assert len(queries) == 2  # exactly one grouped-history read on each invocation


def test_lost_race_ignores_the_conflict_and_keeps_other_plan_rows(session_factory):
    with session_factory() as db:
        user = models.User(id="u", email="u@example.com", hashed_password="x")
        db.add_all([user, _plan("a"), _plan("b", expectedDate="2")])
        db.commit()

    with session_factory() as db, patch.object(recurring, "date", _fixed_today(2026, 12, 15)):
        user = db.get(models.User, "u")

        class RacingSession:
            raced = False

            def __init__(self, inner):
                self.inner = inner

            @property
            def bind(self):
                return self.inner.bind

            def query(self, *args, **kwargs):
                return self.inner.query(*args, **kwargs)

            def execute(self, statement):
                if not self.raced:
                    self.raced = True
                    with session_factory() as other:
                        other.add(_transaction("other", "a", dt.date(2026, 12, 1)))
                        other.commit()
                return self.inner.execute(statement)

            def commit(self):
                return self.inner.commit()

        recurring._materialize_recurring_plans(RacingSession(db), user)

    with session_factory() as db:
        rows = {(t.recurring_plan_id, t.date): t.id for t in db.query(models.Transaction)}
    assert rows[("a", dt.date(2026, 12, 1))] == "other"
    assert rows[("b", dt.date(2026, 12, 2))]  # other plans still materialize
