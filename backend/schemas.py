from pydantic import BaseModel
from typing import Optional, List

class TransactionBase(BaseModel):
    amount: float
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
