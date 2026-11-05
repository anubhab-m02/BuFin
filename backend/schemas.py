from datetime import date
from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field
from typing import Annotated, Optional


def _iso_date(value: str) -> str:
    # fromisoformat also accepts forms like 20261105 or 2026-W45-3; only the canonical
    # YYYY-MM-DD may be stored, because dates are compared and sorted as strings.
    if date.fromisoformat(value).isoformat() != value:  # a ValueError becomes a 422
        raise ValueError("date must be YYYY-MM-DD")
    return value


# A calendar day as YYYY-MM-DD. The client sends its own local day, so the server never has
# to guess a timezone (the old flows stamped UTC timestamps, which land on the wrong day in IST).
IsoDate = Annotated[str, AfterValidator(_iso_date)]


def _strong_password(value: str) -> str:
    if len(value) < 10:
        raise ValueError("Password must be at least 10 characters")
    if len(value) > 128:
        raise ValueError("Password must be at most 128 characters")
    # bcrypt only ever uses the first 72 bytes; accepting more would silently ignore the rest.
    if len(value.encode("utf-8")) > 72:
        raise ValueError("Password is too long (at most 72 bytes; accented or non-Latin characters take more than one)")
    if not value.strip():
        raise ValueError("Password cannot be only spaces")
    return value


# Applied to NEW passwords only (sign-up, change-password). Sign-in does not enforce it, so
# existing accounts with shorter passwords can still log in and are nudged to change them.
StrongPassword = Annotated[str, AfterValidator(_strong_password)]

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: StrongPassword
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
    # Capped at the longest password the policy allows: an unbounded string would be hashed as-is.
    password: str = Field(max_length=128)

class UserChangePassword(BaseModel):
    old_password: str
    new_password: StrongPassword

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

    model_config = ConfigDict(from_attributes=True)

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
    linked_debt_id: Optional[str] = None

class TransactionCreate(TransactionBase):
    id: Optional[str] = None

class Transaction(TransactionBase):
    id: str
    household_id: Optional[str] = None  # null = personal transaction; server-derived, not client-writable
    recurring_plan_id: Optional[str] = None  # set for auto-materialized recurring occurrences; server-derived
    model_config = ConfigDict(from_attributes=True)

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
    model_config = ConfigDict(from_attributes=True)

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
    model_config = ConfigDict(from_attributes=True)

class WishlistItemBase(BaseModel):
    name: str
    cost: float
    addedAt: str

class WishlistItemCreate(WishlistItemBase):
    id: Optional[str] = None

class WishlistItem(WishlistItemBase):
    id: str
    model_config = ConfigDict(from_attributes=True)

class BudgetBase(BaseModel):
    category: str
    monthlyLimit: float

class BudgetCreate(BudgetBase):
    id: Optional[str] = None

class Budget(BudgetBase):
    id: str
    model_config = ConfigDict(from_attributes=True)


# --- Multi-step money operations (one request, one commit) ---
class DebtCreateRequest(DebtCreate):
    # The amount becomes a ledger transaction when cash_in_date is set, so it must be a real,
    # positive, bounded number.
    amount: float = Field(gt=0, le=1e12, allow_inf_nan=False)
    # Borrowing ("payable") is cash in. When set, the matching income transaction is recorded in
    # the same commit as the debt; unset keeps the old behaviour (debt only).
    cash_in_date: Optional[IsoDate] = None

class DebtWithTransaction(Debt):
    transaction: Optional[Transaction] = None

class RepayRequest(BaseModel):
    date: IsoDate

class RepayResponse(BaseModel):
    debt: Debt
    transaction: Transaction
