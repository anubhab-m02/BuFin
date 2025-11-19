from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import SessionLocal, engine, get_db
import uuid

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Transactions ---
@app.get("/transactions", response_model=List[schemas.Transaction])
def read_transactions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    transactions = db.query(models.Transaction).offset(skip).limit(limit).all()
    return transactions

@app.post("/transactions", response_model=schemas.Transaction)
def create_transaction(transaction: schemas.TransactionCreate, db: Session = Depends(get_db)):
    db_transaction = models.Transaction(**transaction.dict())
    if not db_transaction.id:
        db_transaction.id = str(uuid.uuid4())
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@app.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: str, db: Session = Depends(get_db)):
    db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(db_transaction)
    db.commit()
    return {"ok": True}

@app.put("/transactions/{transaction_id}", response_model=schemas.Transaction)
def update_transaction(transaction_id: str, transaction: schemas.TransactionCreate, db: Session = Depends(get_db)):
    db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    for key, value in transaction.dict().items():
        if key != 'id': # Don't update ID
            setattr(db_transaction, key, value)

    db.commit()
    db.refresh(db_transaction)
    return db_transaction

# --- Recurring Plans ---
@app.get("/recurring_plans", response_model=List[schemas.RecurringPlan])
def read_recurring_plans(db: Session = Depends(get_db)):
    return db.query(models.RecurringPlan).all()

@app.post("/recurring_plans", response_model=schemas.RecurringPlan)
def create_recurring_plan(plan: schemas.RecurringPlanCreate, db: Session = Depends(get_db)):
    db_plan = models.RecurringPlan(**plan.dict())
    if not db_plan.id:
        db_plan.id = str(uuid.uuid4())
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan

@app.delete("/recurring_plans/{plan_id}")
def delete_recurring_plan(plan_id: str, db: Session = Depends(get_db)):
    db_plan = db.query(models.RecurringPlan).filter(models.RecurringPlan.id == plan_id).first()
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    db.delete(db_plan)
    db.commit()
    return {"ok": True}

@app.put("/recurring_plans/{plan_id}", response_model=schemas.RecurringPlan)
def update_recurring_plan(plan_id: str, plan: schemas.RecurringPlanCreate, db: Session = Depends(get_db)):
    db_plan = db.query(models.RecurringPlan).filter(models.RecurringPlan.id == plan_id).first()
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    for key, value in plan.dict().items():
        if key != 'id':
            setattr(db_plan, key, value)

    db.commit()
    db.refresh(db_plan)
    return db_plan

# --- Debts ---
@app.get("/debts", response_model=List[schemas.Debt])
def read_debts(db: Session = Depends(get_db)):
    return db.query(models.Debt).all()

@app.post("/debts", response_model=schemas.Debt)
def create_debt(debt: schemas.DebtCreate, db: Session = Depends(get_db)):
    db_debt = models.Debt(**debt.dict())
    if not db_debt.id:
        db_debt.id = str(uuid.uuid4())
    db.add(db_debt)
    db.commit()
    db.refresh(db_debt)
    return db_debt

@app.delete("/debts/{debt_id}")
def delete_debt(debt_id: str, db: Session = Depends(get_db)):
    db_debt = db.query(models.Debt).filter(models.Debt.id == debt_id).first()
    if not db_debt:
        raise HTTPException(status_code=404, detail="Debt not found")
    db.delete(db_debt)
    db.commit()
    db.delete(db_debt)
    db.commit()
    return {"ok": True}

@app.put("/debts/{debt_id}", response_model=schemas.Debt)
def update_debt(debt_id: str, debt: schemas.DebtCreate, db: Session = Depends(get_db)):
    db_debt = db.query(models.Debt).filter(models.Debt.id == debt_id).first()
    if not db_debt:
        raise HTTPException(status_code=404, detail="Debt not found")
    
    for key, value in debt.dict().items():
        if key != 'id':
            setattr(db_debt, key, value)

    db.commit()
    db.refresh(db_debt)
    return db_debt

# --- Wishlist ---
@app.get("/wishlist", response_model=List[schemas.WishlistItem])
def read_wishlist(db: Session = Depends(get_db)):
    return db.query(models.WishlistItem).all()

@app.post("/wishlist", response_model=schemas.WishlistItem)
def create_wishlist_item(item: schemas.WishlistItemCreate, db: Session = Depends(get_db)):
    db_item = models.WishlistItem(**item.dict())
    if not db_item.id:
        db_item.id = str(uuid.uuid4())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/wishlist/{item_id}")
def delete_wishlist_item(item_id: str, db: Session = Depends(get_db)):
    db_item = db.query(models.WishlistItem).filter(models.WishlistItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(db_item)
    db.commit()
    return {"ok": True}

# --- AI Endpoints ---
import ai_service

@app.post("/ai/classify")
async def classify_transaction(request: dict):
    # Expects {"text": "..."}
    text = request.get("text")
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    return await ai_service.classify_transaction(text)

@app.post("/ai/analyze")
async def analyze_purchase(request: dict):
    # Expects {"query": "...", "context": {...}}
    query = request.get("query")
    context = request.get("context")
    if not query or not context:
        raise HTTPException(status_code=400, detail="Query and Context are required")
    return await ai_service.analyze_purchase(query, context)

@app.post("/ai/alert")
async def generate_alert(request: dict):
    # Expects {"transactions": [...], "balance": 100, "recurringPlans": [...]}
    transactions = request.get("transactions")
    balance = request.get("balance")
    recurring_plans = request.get("recurringPlans")
    return await ai_service.generate_spending_alert(transactions, balance, recurring_plans)

from google.api_core.exceptions import ResourceExhausted

@app.exception_handler(ResourceExhausted)
async def resource_exhausted_handler(request, exc):
    return JSONResponse(
        status_code=429,
        content={"detail": "AI Quota Exceeded. Please try again later."},
    )

@app.post("/ai/tips")
async def generate_tips(request: dict):
    # Expects {"transactions": [...], "balance": 100}
    transactions = request.get("transactions")
    balance = request.get("balance")
    return await ai_service.generate_financial_tips(transactions, balance)

