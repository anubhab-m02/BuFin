import json
from datetime import date
from typing import Any, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field, field_validator

import ai_service
import schemas
from .auth import get_current_user

# Every AI route spends the shared Gemini quota, so all of them require a logged-in user.
router = APIRouter(dependencies=[Depends(get_current_user)])

MAX_PAYLOAD_CHARS = 500_000


def _check_size(value: Any) -> Any:
    try:
        too_big = value is not None and len(json.dumps(value, default=str)) > MAX_PAYLOAD_CHARS
    except RecursionError:
        too_big = True
    if too_big:
        raise ValueError("payload too large")
    return value


MONEY_LIMITS = dict(allow_inf_nan=False, ge=-1e12, le=1e12)


class AlertTransaction(BaseModel):
    # Only the fields generate_spending_alert indexes directly; anything else passes through.
    model_config = ConfigDict(extra="allow")
    date: str
    type: str
    amount: float = Field(**MONEY_LIMITS)


class AlertPlan(BaseModel):
    model_config = ConfigDict(extra="allow")
    type: str
    amount: float = Field(**MONEY_LIMITS)


class ClassifyRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    # The client's local calendar day, used to resolve "tomorrow" / "3rd Nov" in the text.
    today: Optional[schemas.IsoDate] = None


class AnalyzeRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    context: Any

    @field_validator("context")
    @classmethod
    def context_size(cls, value):
        if value is None:
            raise ValueError("context is required")
        return _check_size(value)


class AlertRequest(BaseModel):
    transactions: List[AlertTransaction] = Field(max_length=5000)
    balance: Optional[float] = Field(default=None, **MONEY_LIMITS)
    recurringPlans: List[AlertPlan] = Field(default_factory=list, max_length=500)
    today: Optional[str] = None

    @field_validator("today")
    @classmethod
    def today_is_a_calendar_date(cls, value):
        if value is not None:
            date.fromisoformat(value)
        return value



class TipsRequest(BaseModel):
    transactions: List[dict] = Field(max_length=5000)
    balance: Optional[float] = Field(default=None, **MONEY_LIMITS)

    @field_validator("transactions")
    @classmethod
    def transactions_size(cls, value):
        return _check_size(value)


class CoachRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    mode: str = Field(min_length=1, max_length=50)
    context: Optional[Any] = None

    @field_validator("context")
    @classmethod
    def context_size(cls, value):
        return _check_size(value)


@router.post("/ai/classify")
async def classify_transaction(request: ClassifyRequest):
    return await ai_service.classify_transaction(request.text, request.today)

@router.post("/ai/analyze")
async def analyze_purchase(request: AnalyzeRequest):
    return await ai_service.analyze_purchase(request.query, request.context)

@router.post("/ai/alert")
async def generate_alert(request: AlertRequest):
    transactions = [t.model_dump() for t in request.transactions]
    plans = [p.model_dump() for p in request.recurringPlans]
    return await ai_service.generate_spending_alert(transactions, request.balance, plans, request.today)

@router.post("/ai/tips")
async def generate_tips(request: TipsRequest):
    return await ai_service.generate_financial_tips(request.transactions, request.balance)

@router.post("/coach/chat")
async def coach_chat(request: CoachRequest):
    return await ai_service.coach_chat(request.message, request.mode, request.context)

# Note: Exception handlers are usually registered on the app, not the router.
# We will leave the exception handler in main.py or register it there.
