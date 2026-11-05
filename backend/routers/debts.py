from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas
from database import get_db
from .auth import get_current_user, get_active_household_id
from .transactions import new_transaction
import uuid

router = APIRouter()

@router.get("/debts", response_model=List[schemas.Debt])
def read_debts(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Debt).filter(models.Debt.user_id == current_user.id).all()

@router.post("/debts", response_model=schemas.DebtWithTransaction)
def create_debt(debt: schemas.DebtCreateRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user), active_household_id: Optional[str] = Depends(get_active_household_id)):
    # Ids are generated here; a client-sent id could collide with (and 500 on) another user's row.
    db_debt = models.Debt(**debt.dict(exclude={"id", "cash_in_date"}), user_id=current_user.id)
    if not db_debt.id:
        db_debt.id = str(uuid.uuid4())
    db.add(db_debt)

    # Borrowing is cash in. It is recorded in the same commit as the debt, so a failure cannot
    # leave a payable debt with no matching income.
    cash_in = None
    if debt.direction == 'payable' and debt.cash_in_date:
        cash_in = new_transaction(
            current_user, active_household_id, amount=debt.amount, category='Income',
            description=f"Borrowed from {debt.personName}", type='income', necessity='variable',
            date=debt.cash_in_date,
        )
        db.add(cash_in)

    db.commit()
    db.refresh(db_debt)
    if cash_in:
        db.refresh(cash_in)
    return {**schemas.Debt.model_validate(db_debt).model_dump(), "transaction": cash_in}


@router.post("/debts/{debt_id}/repay", response_model=schemas.RepayResponse)
def repay_debt(debt_id: str, body: schemas.RepayRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user), active_household_id: Optional[str] = Depends(get_active_household_id)):
    db_debt = db.query(models.Debt).filter(models.Debt.id == debt_id, models.Debt.user_id == current_user.id).first()
    if not db_debt:
        raise HTTPException(status_code=404, detail="Debt not found")

    # Conditional UPDATE: of two concurrent requests (double click, retry) only one flips the
    # status, so a debt can never be repaid - and its money moved - twice.
    flipped = db.query(models.Debt).filter(
        models.Debt.id == debt_id, models.Debt.user_id == current_user.id, models.Debt.status != 'repaid'
    ).update({"status": "repaid"}, synchronize_session=False)
    if not flipped:
        raise HTTPException(status_code=409, detail="This debt is already repaid")

    if db_debt.direction == 'payable':
        repayment = new_transaction(
            current_user, active_household_id, amount=db_debt.amount, category='Debt Repayment',
            description=f"Repaid {db_debt.personName}", type='expense', necessity='essential',
            date=body.date, linked_debt_id=debt_id,
        )
    else:
        repayment = new_transaction(
            current_user, active_household_id, amount=db_debt.amount, category='Debt Repayment',
            description=f"Repayment from {db_debt.personName}", type='income', necessity='variable',
            date=body.date, linked_debt_id=debt_id,
        )
    db.add(repayment)
    db.commit()
    db.refresh(db_debt)
    db.refresh(repayment)
    return {"debt": db_debt, "transaction": repayment}

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
