from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db
from .auth import get_current_user
import uuid

router = APIRouter()

@router.get("/recurring_plans", response_model=List[schemas.RecurringPlan])
def read_recurring_plans(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
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
