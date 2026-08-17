from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas
from database import get_db
from .auth import get_current_user
import uuid
import calendar
from datetime import date, timedelta

router = APIRouter()

# --- Materialization helpers ---

def _resolve_expected_day(expected_date: str, year: int, month: int) -> Optional[int]:
    """Python port of src/lib/utils.js's resolveExpectedDay - the frontend's single
    source of truth for turning a plan's `expectedDate` (a day-of-month string, or the
    sentinels 'last'/'last-working') into an actual day for a given month. Returns None
    if expectedDate can't be parsed at all (matches the JS side's effective behavior of
    a garbage value simply never matching any day, rather than fabricating one).

    Unlike the JS version, an out-of-range day (e.g. "31" in February) is clamped to
    the month's actual last day instead of left to roll over into the next month - the
    billing-cycle convention most recurring-charge systems use, and a materialized
    Transaction rolling into a different month than intended would be a worse surprise
    than clamping.
    """
    last_day = calendar.monthrange(year, month)[1]
    if expected_date == 'last':
        return last_day
    if expected_date == 'last-working':
        d = date(year, month, last_day)
        while d.weekday() >= 5:  # 5=Saturday, 6=Sunday
            d -= timedelta(days=1)
        return d.day
    try:
        day = int(expected_date)
    except (TypeError, ValueError):
        return None
    return max(1, min(day, last_day))

def _add_month(year: int, month: int):
    return (year + 1, 1) if month == 12 else (year, month + 1)

def _materialize_recurring_plans(db: Session, current_user: models.User):
    """Lazily converts each due monthly-recurring plan occurrence into a real
    Transaction, tagged with recurring_plan_id. Called on every GET /recurring_plans -
    there's no scheduler in this backend (same reasoning as the household snapshot
    mechanism), so this runs on access instead of on a schedule.

    Only frequency == 'monthly' plans are handled: RecurringPlan has no month field for
    yearly plans or day-of-week field for weekly ones, so there's no reliable data to
    materialize those from without inventing semantics nobody asked for - they stay
    forecast-only, unchanged from today.
    """
    today = date.today()
    plans = db.query(models.RecurringPlan).filter(
        models.RecurringPlan.user_id == current_user.id,
        models.RecurringPlan.frequency == 'monthly'
    ).all()

    for plan in plans:
        end_date = None
        if plan.endDate:
            try:
                end_date = date.fromisoformat(plan.endDate[:10])
            except ValueError:
                end_date = None

        last_tx = db.query(models.Transaction).filter(
            models.Transaction.recurring_plan_id == plan.id
        ).order_by(models.Transaction.date.desc()).first()

        if last_tx:
            try:
                last_date = date.fromisoformat(last_tx.date[:10])
            except ValueError:
                continue
            year, month = _add_month(last_date.year, last_date.month)
        else:
            # No materialized history yet, and RecurringPlan has no created_at field to
            # know how far back this plan "should" go - only ever consider the current
            # month for a plan's first-ever materialization. Every later login anchors
            # off this point going forward, never guessing further into the past.
            year, month = today.year, today.month

        while (year, month) <= (today.year, today.month):
            occurrence_day = _resolve_expected_day(plan.expectedDate, year, month)
            if occurrence_day is None:
                break  # can't determine this plan's occurrence dates at all - skip it

            occurrence_date = date(year, month, occurrence_day)

            if end_date and occurrence_date > end_date:
                break  # plan ended before this occurrence - stop, nothing further to do

            is_current_month = (year, month) == (today.year, today.month)
            is_due = occurrence_date <= today if is_current_month else True
            # (every month strictly before the current one is unconditionally due -
            # the whole month has already elapsed by construction)

            if is_due:
                db.add(models.Transaction(
                    id=str(uuid.uuid4()),
                    user_id=current_user.id,
                    date=occurrence_date.isoformat(),
                    amount=plan.amount,
                    category='Income' if plan.type == 'income' else 'Bills',
                    description=plan.name,
                    merchant=None,
                    type=plan.type,
                    necessity='fixed',
                    remarks='Auto-generated from recurring plan',
                    recurring_plan_id=plan.id
                ))

            year, month = _add_month(year, month)

    db.commit()

# --- Endpoints ---

@router.get("/recurring_plans", response_model=List[schemas.RecurringPlan])
def read_recurring_plans(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    _materialize_recurring_plans(db, current_user)
    return db.query(models.RecurringPlan).filter(models.RecurringPlan.user_id == current_user.id).all()

@router.post("/recurring_plans", response_model=schemas.RecurringPlan)
def create_recurring_plan(plan: schemas.RecurringPlanCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_plan = models.RecurringPlan(**plan.dict(), user_id=current_user.id)
    if not db_plan.id:
        db_plan.id = str(uuid.uuid4())
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan

@router.delete("/recurring_plans/{plan_id}")
def delete_recurring_plan(plan_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_plan = db.query(models.RecurringPlan).filter(models.RecurringPlan.id == plan_id, models.RecurringPlan.user_id == current_user.id).first()
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # Preserve any already-materialized transactions as real history - just unlink them
    # from the plan being deleted rather than deleting real financial data (same "revert
    # to unlinked rather than delete" precedent used for household deletion).
    db.query(models.Transaction).filter(models.Transaction.recurring_plan_id == plan_id).update(
        {models.Transaction.recurring_plan_id: None}, synchronize_session=False
    )

    db.delete(db_plan)
    db.commit()
    return {"ok": True}

@router.put("/recurring_plans/{plan_id}", response_model=schemas.RecurringPlan)
def update_recurring_plan(plan_id: str, plan: schemas.RecurringPlanCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_plan = db.query(models.RecurringPlan).filter(models.RecurringPlan.id == plan_id, models.RecurringPlan.user_id == current_user.id).first()
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    for key, value in plan.dict().items():
        if key != 'id':
            setattr(db_plan, key, value)

    db.commit()
    db.refresh(db_plan)
    return db_plan
