from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas
from database import get_db
from .auth import get_current_user, get_active_household_id
import uuid

router = APIRouter()

# Household scope means "every transaction tagged to that household"; personal scope
# (no active household) means "my own untagged transactions" - never a mix of both, so
# switching persona always shows a clean, non-overlapping set of transactions.
def _scope_filter(current_user: models.User, household_id: Optional[str]):
    if household_id:
        return models.Transaction.household_id == household_id
    return and_(models.Transaction.user_id == current_user.id, models.Transaction.household_id.is_(None))

@router.get("/transactions", response_model=List[schemas.Transaction])
def read_transactions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user), active_household_id: Optional[str] = Depends(get_active_household_id)):
    transactions = db.query(models.Transaction).filter(_scope_filter(current_user, active_household_id)).offset(skip).limit(limit).all()
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
