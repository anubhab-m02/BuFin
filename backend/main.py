from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List
import models, schemas, auth_utils
from database import SessionLocal, engine, get_db
import uuid
from datetime import timedelta

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Auth Endpoints ---
@app.post("/auth/signup", response_model=schemas.Token)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth_utils.get_password_hash(user.password)
    db_user = models.User(
        id=str(uuid.uuid4()),
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    access_token_expires = timedelta(minutes=auth_utils.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_utils.create_access_token(
        data={"sub": db_user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/login", response_model=schemas.Token)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not auth_utils.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth_utils.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_utils.create_access_token(
        data={"sub": db_user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = auth_utils.jwt.decode(token, auth_utils.SECRET_KEY, algorithms=[auth_utils.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except auth_utils.JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user

@app.get("/auth/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.put("/auth/me", response_model=schemas.User)
def update_user_me(user_update: schemas.UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Update fields
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.currency is not None:
        current_user.currency = user_update.currency
    if user_update.monthly_income is not None:
        current_user.monthly_income = user_update.monthly_income
    if user_update.current_balance is not None:
        current_user.current_balance = user_update.current_balance
    if user_update.savings_goal is not None:
        current_user.savings_goal = user_update.savings_goal
    if user_update.financial_literacy is not None:
        current_user.financial_literacy = user_update.financial_literacy
    if user_update.risk_tolerance is not None:
        current_user.risk_tolerance = user_update.risk_tolerance
    
    db.commit()
    db.refresh(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

@app.post("/auth/change-password")
def change_password(passwords: schemas.UserChangePassword, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not auth_utils.verify_password(passwords.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    
    current_user.hashed_password = auth_utils.get_password_hash(passwords.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

@app.delete("/auth/me")
def delete_account(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Manually delete related data since we don't have cascade set up in models (safer for now)
    db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).delete()
    db.query(models.RecurringPlan).filter(models.RecurringPlan.user_id == current_user.id).delete()
    db.query(models.Debt).filter(models.Debt.user_id == current_user.id).delete()
    db.query(models.WishlistItem).filter(models.WishlistItem.user_id == current_user.id).delete()
    
    # Delete user
    db.delete(current_user)
    db.commit()
    return {"message": "Account deleted successfully"}


# --- Transactions ---
@app.get("/transactions", response_model=List[schemas.Transaction])
def read_transactions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    transactions = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).offset(skip).limit(limit).all()
    return transactions

@app.post("/transactions", response_model=schemas.Transaction)
def create_transaction(transaction: schemas.TransactionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_transaction = models.Transaction(**transaction.dict(), user_id=current_user.id)
    if not db_transaction.id:
        db_transaction.id = str(uuid.uuid4())
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@app.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id, models.Transaction.user_id == current_user.id).first()
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(db_transaction)
    db.commit()
    return {"ok": True}

@app.put("/transactions/{transaction_id}", response_model=schemas.Transaction)
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

# --- Recurring Plans ---
@app.get("/recurring_plans", response_model=List[schemas.RecurringPlan])
def read_recurring_plans(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.RecurringPlan).filter(models.RecurringPlan.user_id == current_user.id).all()

@app.post("/recurring_plans", response_model=schemas.RecurringPlan)
def create_recurring_plan(plan: schemas.RecurringPlanCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_plan = models.RecurringPlan(**plan.dict(), user_id=current_user.id)
    if not db_plan.id:
        db_plan.id = str(uuid.uuid4())
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan

@app.delete("/recurring_plans/{plan_id}")
def delete_recurring_plan(plan_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_plan = db.query(models.RecurringPlan).filter(models.RecurringPlan.id == plan_id, models.RecurringPlan.user_id == current_user.id).first()
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    db.delete(db_plan)
    db.commit()
    return {"ok": True}

@app.put("/recurring_plans/{plan_id}", response_model=schemas.RecurringPlan)
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

# --- Debts ---
@app.get("/debts", response_model=List[schemas.Debt])
def read_debts(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Debt).filter(models.Debt.user_id == current_user.id).all()

@app.post("/debts", response_model=schemas.Debt)
def create_debt(debt: schemas.DebtCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_debt = models.Debt(**debt.dict(), user_id=current_user.id)
    if not db_debt.id:
        db_debt.id = str(uuid.uuid4())
    db.add(db_debt)
    db.commit()
    db.refresh(db_debt)
    return db_debt

@app.delete("/debts/{debt_id}")
def delete_debt(debt_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_debt = db.query(models.Debt).filter(models.Debt.id == debt_id, models.Debt.user_id == current_user.id).first()
    if not db_debt:
        raise HTTPException(status_code=404, detail="Debt not found")
    db.delete(db_debt)
    db.commit()
    db.delete(db_debt)
    db.commit()
    return {"ok": True}

@app.put("/debts/{debt_id}", response_model=schemas.Debt)
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

# --- Wishlist ---
@app.get("/wishlist", response_model=List[schemas.WishlistItem])
def read_wishlist(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.WishlistItem).filter(models.WishlistItem.user_id == current_user.id).all()

@app.post("/wishlist", response_model=schemas.WishlistItem)
def create_wishlist_item(item: schemas.WishlistItemCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_item = models.WishlistItem(**item.dict(), user_id=current_user.id)
    if not db_item.id:
        db_item.id = str(uuid.uuid4())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/wishlist/{item_id}")
def delete_wishlist_item(item_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_item = db.query(models.WishlistItem).filter(models.WishlistItem.id == item_id, models.WishlistItem.user_id == current_user.id).first()
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

@app.post("/coach/chat")
async def coach_chat(request: dict):
    # Expects {"message": "...", "mode": "...", "context": {...}}
    message = request.get("message")
    mode = request.get("mode")
    context = request.get("context")
    if not message or not mode:
        raise HTTPException(status_code=400, detail="Message and Mode are required")
    return await ai_service.coach_chat(message, mode, context)

