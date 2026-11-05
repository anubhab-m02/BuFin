import json
from typing import Any, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator

import ai_service
from .auth import get_current_user

# Every AI route spends the shared Gemini quota, so all of them require a logged-in user.
router = APIRouter(dependencies=[Depends(get_current_user)])

MAX_PAYLOAD_CHARS = 500_000


def _check_size(value: Any) -> Any:
    if value is not None and len(json.dumps(value, default=str)) > MAX_PAYLOAD_CHARS:
        raise ValueError("payload too large")
    return value


class ClassifyRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class AnalyzeRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    context: Any

    @field_validator("context")
    @classmethod
    def context_size(cls, value):
        return _check_size(value)


class AlertRequest(BaseModel):
    transactions: List[dict] = Field(max_length=5000)
    balance: float
    recurringPlans: List[dict] = Field(default_factory=list, max_length=500)
    today: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")

    @field_validator("transactions", "recurringPlans")
    @classmethod
    def lists_size(cls, value):
        return _check_size(value)


class TipsRequest(BaseModel):
    transactions: List[dict] = Field(max_length=5000)
    balance: float

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
    return await ai_service.classify_transaction(request.text)

@router.post("/ai/analyze")
async def analyze_purchase(request: AnalyzeRequest):
    return await ai_service.analyze_purchase(request.query, request.context)

@router.post("/ai/alert")
async def generate_alert(request: AlertRequest):
    return await ai_service.generate_spending_alert(request.transactions, request.balance, request.recurringPlans, request.today)

@router.post("/ai/tips")
async def generate_tips(request: TipsRequest):
    return await ai_service.generate_financial_tips(request.transactions, request.balance)

@router.post("/coach/chat")
async def coach_chat(request: CoachRequest):
    return await ai_service.coach_chat(request.message, request.mode, request.context)

# Note: Exception handlers are usually registered on the app, not the router.
# We will leave the exception handler in main.py or register it there.
