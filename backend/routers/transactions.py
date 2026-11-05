from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas
from database import get_db
from .auth import get_current_user, get_active_household_id
import uuid
from datetime import date as date_type

router = APIRouter()

MAX_PAGE_SIZE = 1000

# Household scope means "every transaction tagged to that household"; personal scope
# (no active household) means "my own untagged transactions" - never a mix of both, so
# switching persona always shows a clean, non-overlapping set of transactions.
def _scope_filter(current_user: models.User, household_id: Optional[str]):
    if household_id:
        return models.Transaction.household_id == household_id
    return and_(models.Transaction.user_id == current_user.id, models.Transaction.household_id.is_(None))

def new_transaction(current_user: models.User, household_id: Optional[str], *, amount: float,
                    category: str, description: str, type: str, necessity: str, date: date_type,
                    linked_debt_id: Optional[str] = None) -> models.Transaction:
    """Build (not add) a transaction owned by the caller, for the multi-step money operations
    (repay a debt, borrow, move money to a goal) that record it in the same commit as the
    change that caused it."""
    return models.Transaction(
        id=str(uuid.uuid4()), user_id=current_user.id, household_id=household_id,
        amount=amount, category=category, description=description, merchant=None, type=type,
        necessity=necessity, remarks='', date=date, linked_debt_id=linked_debt_id,
    )


def _check_linked_debt(db: Session, current_user: models.User, debt_id: Optional[str]):
    # A repayment may only link to the caller's own debt; otherwise deleting the transaction
    # would flip someone else's debt back to active.
    if debt_id is None:
        return
    owned = db.query(models.Debt.id).filter(models.Debt.id == debt_id, models.Debt.user_id == current_user.id).first()
    if not owned:
        raise HTTPException(status_code=404, detail="Debt not found")

@router.get("/transactions", response_model=List[schemas.Transaction])
def read_transactions(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=MAX_PAGE_SIZE), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user), active_household_id: Optional[str] = Depends(get_active_household_id)):
    # Newest first, with id as a tiebreaker: an unordered LIMIT/OFFSET returns an arbitrary
    # (and on Postgres, unstable) slice, so pages could skip or repeat rows.
    transactions = (
        db.query(models.Transaction)
        .filter(_scope_filter(current_user, active_household_id))
        .order_by(models.Transaction.date.desc(), models.Transaction.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return transactions

@router.post("/transactions", response_model=schemas.Transaction)
def create_transaction(transaction: schemas.TransactionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user), active_household_id: Optional[str] = Depends(get_active_household_id)):
    _check_linked_debt(db, current_user, transaction.linked_debt_id)
    # Ids are generated here; a client-sent id could collide with (and 500 on) another user's row.
    db_transaction = models.Transaction(**transaction.model_dump(exclude={"id"}), id=str(uuid.uuid4()), user_id=current_user.id, household_id=active_household_id)
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@router.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user), active_household_id: Optional[str] = Depends(get_active_household_id)):
    db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id, _scope_filter(current_user, active_household_id)).first()
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    # Deleting the record of a repayment un-repays the debt, in the same commit: otherwise the
    # debt stays marked repaid with no matching transaction.
    reverted_debt_id = None
    if db_transaction.linked_debt_id:
        # Only the debt's owner's repayment un-repays it: in a household another member can see
        # and delete this row, but the debt is personal to whoever made the repayment.
        debt = db.query(models.Debt).filter(
            models.Debt.id == db_transaction.linked_debt_id, models.Debt.user_id == current_user.id
        ).first()
        if debt and debt.status == 'repaid':
            debt.status = 'active'
            reverted_debt_id = debt.id
    db.delete(db_transaction)
    db.commit()
    return {"ok": True, "reverted_debt_id": reverted_debt_id}

@router.put("/transactions/{transaction_id}", response_model=schemas.Transaction)
def update_transaction(transaction_id: str, transaction: schemas.TransactionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user), active_household_id: Optional[str] = Depends(get_active_household_id)):
    db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id, _scope_filter(current_user, active_household_id)).first()
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    _check_linked_debt(db, current_user, transaction.linked_debt_id)
    for key, value in transaction.model_dump(exclude={"id"}, exclude_unset=True).items(): # Don't update ID; keep fields the client left out
        setattr(db_transaction, key, value)

    db.commit()
    db.refresh(db_transaction)
    return db_transaction
