from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db
from .auth import get_current_user
import uuid

router = APIRouter()

@router.get("/debts", response_model=List[schemas.Debt])
def read_debts(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Debt).filter(models.Debt.user_id == current_user.id).all()

@router.post("/debts", response_model=schemas.Debt)
def create_debt(debt: schemas.DebtCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_debt = models.Debt(**debt.dict(), user_id=current_user.id)
    if not db_debt.id:
        db_debt.id = str(uuid.uuid4())
    db.add(db_debt)
    db.commit()
    db.refresh(db_debt)
    return db_debt

@router.delete("/debts/{debt_id}")
def delete_debt(debt_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_debt = db.query(models.Debt).filter(models.Debt.id == debt_id, models.Debt.user_id == current_user.id).first()
    if not db_debt:
        raise HTTPException(status_code=404, detail="Debt not found")
    db.delete(db_debt)
    db.commit()
    return {"ok": True}

@router.put("/debts/{debt_id}", response_model=schemas.Debt)
def update_debt(debt_id: str, debt: schemas.DebtCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_debt = db.query(models.Debt).filter(models.Debt.id == debt_id, models.Debt.user_id == current_user.id).first()
    if not db_debt:
        raise HTTPException(status_code=404, detail="Debt not found")
    
    for key, value in debt.dict().items():
        if key != 'id':
            setattr(db_debt, key, value)

    db.commit()
    db.refresh(db_debt)
    return db_debt
