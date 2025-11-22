from pydantic import BaseModel, EmailStr
from typing import Optional, List

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    full_name: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    currency: Optional[str] = None
    monthly_income: Optional[float] = None
    current_balance: Optional[float] = None
    savings_goal: Optional[float] = None
    financial_literacy: Optional[str] = None
    risk_tolerance: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class User(UserBase):
    id: str
    full_name: Optional[str] = None
    currency: Optional[str] = "INR"
    monthly_income: Optional[float] = 0.0
    current_balance: Optional[float] = 0.0
    savings_goal: Optional[float] = 0.0
    financial_literacy: Optional[str] = "beginner"
    risk_tolerance: Optional[str] = "low"
    goals: Optional[str] = "[]" # JSON string

    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class TransactionBase(BaseModel):
    amount: float
    category: str
    description: str
    merchant: Optional[str] = None
    type: str
    necessity: str = 'variable'
    date: str
    remarks: Optional[str] = None

class TransactionCreate(TransactionBase):
    id: Optional[str] = None

class Transaction(TransactionBase):
    id: str
    class Config:
        orm_mode = True

class RecurringPlanBase(BaseModel):
    name: str
    amount: float
    type: str
    frequency: str
    expectedDate: str
    endDate: Optional[str] = None

class RecurringPlanCreate(RecurringPlanBase):
    id: Optional[str] = None

class RecurringPlan(RecurringPlanBase):
    id: str
    class Config:
        orm_mode = True

class DebtBase(BaseModel):
    personName: str
    amount: float
    direction: str
    dueDate: Optional[str] = None
    status: str = 'active'

class DebtCreate(DebtBase):
    id: Optional[str] = None

class Debt(DebtBase):
    id: str
    class Config:
        orm_mode = True

class WishlistItemBase(BaseModel):
    name: str
    cost: float
    addedAt: str

class WishlistItemCreate(WishlistItemBase):
    id: Optional[str] = None

class WishlistItem(WishlistItemBase):
    id: str
    class Config:
        orm_mode = True
