import asyncio
import datetime

import pytest

import ai_service

D = datetime.date


def plan(amount, expected="1", frequency="monthly", type="expense", end=None):
    return {"type": type, "amount": amount, "expectedDate": expected, "frequency": frequency, "endDate": end, "name": "p"}


def tx(date, amount, type="expense"):
    return {"date": date, "amount": amount, "type": type}


def safe_daily(balance, transactions=(), plans=(), today=D(2026, 11, 10)):
    return ai_service.compute_safe_daily(list(transactions), balance, list(plans), today)


def test_baseline_is_balance_over_days_left_including_today():
    # 21 days left in November from the 10th, inclusive
    result = safe_daily(2100)
    assert result.safe_daily == 100 and result.days_remaining == 21


def test_next_years_same_month_expense_is_not_subtracted_now():
    assert safe_daily(2100, [tx("2027-11-20", 5000)]).safe_daily == 100


def test_a_later_expense_this_month_is_subtracted_and_a_past_one_is_not():
    assert safe_daily(2100, [tx("2026-11-20", 1050)]).safe_daily == 50
    assert safe_daily(2100, [tx("2026-11-05", 1050)]).safe_daily == 100


def test_timestamped_dates_are_read_by_their_date_part():
    assert safe_daily(2100, [tx("2026-11-20T09:30:00", 1050)]).safe_daily == 50


def test_a_31st_plan_in_a_short_month_is_clamped_to_the_last_day_not_dropped():
    # February has 28 days in 2026; a plan on the 31st still falls due on the 28th
    result = safe_daily(2800, plans=[plan(1400, expected="31")], today=D(2026, 2, 10))
    assert result.safe_daily == (2800 - 1400) / 19


def test_a_monthly_plan_due_today_is_already_in_the_balance_but_a_weekly_one_is_not():
    monthly = safe_daily(2100, plans=[plan(1050, expected="10", frequency="monthly")])
    weekly = safe_daily(2100, plans=[plan(1050, expected="10", frequency="weekly")])
    assert monthly.safe_daily == 100          # materialized today, so not subtracted twice
    assert weekly.safe_daily == 50            # never materialized, so still upcoming (matches the app)


def test_last_working_day_resolves_like_the_frontend():
    # 30 Nov 2026 is a Monday, so "last-working" is the 30th and is still upcoming on the 10th
    assert safe_daily(2100, plans=[plan(1050, expected="last-working")]).safe_daily == 50


def test_plans_past_their_end_date_and_income_plans_are_ignored():
    assert safe_daily(2100, plans=[plan(1050, expected="20", end="2026-10-31")]).safe_daily == 100
    assert safe_daily(2100, plans=[plan(1050, expected="20", type="income")]).safe_daily == 100


def test_an_unreadable_plan_is_skipped_not_fatal():
    assert safe_daily(2100, plans=[plan(1050, expected="banana")]).safe_daily == 100


def test_never_negative_and_spent_today_comes_from_todays_expenses_only():
    result = safe_daily(100, [tx("2026-11-10", 40), tx("2026-11-10", 500, "income"), tx("2026-11-09", 70)],
                        plans=[plan(900, expected="20")])
    assert result.safe_daily == 0 and result.spent_today == 40


def test_classify_uses_the_clients_date_not_the_servers(monkeypatch):
    class Stop(Exception):
        pass

    seen = {}

    def fake_prompt(today):
        seen["today"] = today
        raise Stop

    monkeypatch.setattr(ai_service, "_classify_prompt", fake_prompt)
    with pytest.raises(Stop):
        asyncio.run(ai_service.classify_transaction("Lunch 250", today="2031-01-02"))
    assert seen["today"] == "2031-01-02"


def test_the_classify_prompt_embeds_the_given_date():
    assert "Current Date Reference: 2031-01-02" in ai_service._classify_prompt("2031-01-02")
