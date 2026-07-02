from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db
from .auth import get_current_user
import uuid

router = APIRouter()

@router.get("/budgets", response_model=List[schemas.Budget])
def read_budgets(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Budget).filter(models.Budget.user_id == current_user.id).all()

@router.post("/budgets", response_model=schemas.Budget)
def create_budget(budget: schemas.BudgetCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    existing = db.query(models.Budget).filter(
        models.Budget.user_id == current_user.id,
        models.Budget.category == budget.category
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="A budget for this category already exists")

    db_budget = models.Budget(**budget.dict(), user_id=current_user.id)
    if not db_budget.id:
        db_budget.id = str(uuid.uuid4())
    db.add(db_budget)
    db.commit()
    db.refresh(db_budget)
    return db_budget

@router.put("/budgets/{budget_id}", response_model=schemas.Budget)
def update_budget(budget_id: str, budget: schemas.BudgetCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_budget = db.query(models.Budget).filter(models.Budget.id == budget_id, models.Budget.user_id == current_user.id).first()
    if not db_budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    for key, value in budget.dict().items():
        if key != 'id':
            setattr(db_budget, key, value)

    db.commit()
    db.refresh(db_budget)
    return db_budget

@router.delete("/budgets/{budget_id}")
def delete_budget(budget_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_budget = db.query(models.Budget).filter(models.Budget.id == budget_id, models.Budget.user_id == current_user.id).first()
    if not db_budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    db.delete(db_budget)
    db.commit()
    return {"ok": True}
