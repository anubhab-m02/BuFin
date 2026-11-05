from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas
from database import get_db
from .auth import get_current_user, get_active_household_id
import uuid

router = APIRouter()

MAX_PAGE_SIZE = 1000

# Household scope means "every transaction tagged to that household"; personal scope
# (no active household) means "my own untagged transactions" - never a mix of both, so
# switching persona always shows a clean, non-overlapping set of transactions.
def _scope_filter(current_user: models.User, household_id: Optional[str]):
    if household_id:
        return models.Transaction.household_id == household_id
    return and_(models.Transaction.user_id == current_user.id, models.Transaction.household_id.is_(None))

@router.get("/transactions", response_model=List[schemas.Transaction])
def read_transactions(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=MAX_PAGE_SIZE), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user), active_household_id: Optional[str] = Depends(get_active_household_id)):
    # Newest first, with id as a tiebreaker: an unordered LIMIT/OFFSET returns an arbitrary
    # (and on Postgres, unstable) slice, so pages could skip or repeat rows.
    transactions = (
        db.query(models.Transaction)
        .filter(_scope_filter(current_user, active_household_id))
        .order_by(func.substr(models.Transaction.date, 1, 10).desc(), models.Transaction.date.desc(), models.Transaction.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return transactions

@router.post("/transactions", response_model=schemas.Transaction)
def create_transaction(transaction: schemas.TransactionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user), active_household_id: Optional[str] = Depends(get_active_household_id)):
    db_transaction = models.Transaction(**transaction.dict(), user_id=current_user.id, household_id=active_household_id)
    if not db_transaction.id:
        db_transaction.id = str(uuid.uuid4())
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@router.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user), active_household_id: Optional[str] = Depends(get_active_household_id)):
    db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id, _scope_filter(current_user, active_household_id)).first()
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(db_transaction)
    db.commit()
    return {"ok": True}

@router.put("/transactions/{transaction_id}", response_model=schemas.Transaction)
def update_transaction(transaction_id: str, transaction: schemas.TransactionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user), active_household_id: Optional[str] = Depends(get_active_household_id)):
    db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id, _scope_filter(current_user, active_household_id)).first()
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    for key, value in transaction.dict().items():
        if key != 'id': # Don't update ID
            setattr(db_transaction, key, value)

    db.commit()
    db.refresh(db_transaction)
    return db_transaction
