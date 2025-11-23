from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db
from .auth import get_current_user
import uuid

router = APIRouter()

@router.get("/transactions", response_model=List[schemas.Transaction])
def read_transactions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    transactions = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).offset(skip).limit(limit).all()
    return transactions

@router.post("/transactions", response_model=schemas.Transaction)
def create_transaction(transaction: schemas.TransactionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_transaction = models.Transaction(**transaction.dict(), user_id=current_user.id)
    if not db_transaction.id:
        db_transaction.id = str(uuid.uuid4())
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@router.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id, models.Transaction.user_id == current_user.id).first()
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(db_transaction)
    db.commit()
    return {"ok": True}

@router.put("/transactions/{transaction_id}", response_model=schemas.Transaction)
def update_transaction(transaction_id: str, transaction: schemas.TransactionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id, models.Transaction.user_id == current_user.id).first()
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    for key, value in transaction.dict().items():
        if key != 'id': # Don't update ID
            setattr(db_transaction, key, value)

    db.commit()
    db.refresh(db_transaction)
    return db_transaction
