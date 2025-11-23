from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import ai_service
from google.api_core.exceptions import ResourceExhausted

router = APIRouter()

@router.post("/ai/classify")
async def classify_transaction(request: dict):
    # Expects {"text": "..."}
    text = request.get("text")
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    return await ai_service.classify_transaction(text)

@router.post("/ai/analyze")
async def analyze_purchase(request: dict):
    # Expects {"query": "...", "context": {...}}
    query = request.get("query")
    context = request.get("context")
    if not query or not context:
        raise HTTPException(status_code=400, detail="Query and Context are required")
    return await ai_service.analyze_purchase(query, context)

@router.post("/ai/alert")
async def generate_alert(request: dict):
    # Expects {"transactions": [...], "balance": 100, "recurringPlans": [...]}
    transactions = request.get("transactions")
    balance = request.get("balance")
    recurring_plans = request.get("recurringPlans")
    return await ai_service.generate_spending_alert(transactions, balance, recurring_plans)

@router.post("/ai/tips")
async def generate_tips(request: dict):
    # Expects {"transactions": [...], "balance": 100}
    transactions = request.get("transactions")
    balance = request.get("balance")
    return await ai_service.generate_financial_tips(transactions, balance)

@router.post("/coach/chat")
async def coach_chat(request: dict):
    # Expects {"message": "...", "mode": "...", "context": {...}}
    message = request.get("message")
    mode = request.get("mode")
    context = request.get("context")
    if not message or not mode:
        raise HTTPException(status_code=400, detail="Message and Mode are required")
    return await ai_service.coach_chat(message, mode, context)

# Note: Exception handlers are usually registered on the app, not the router.
# We will leave the exception handler in main.py or register it there.
