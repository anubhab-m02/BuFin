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
from routers import auth, goals, transactions, recurring, debts, ai

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(goals.router, prefix="/api", tags=["goals"])
app.include_router(transactions.router, prefix="/api", tags=["transactions"])
app.include_router(recurring.router, prefix="/api", tags=["recurring"])
app.include_router(debts.router, prefix="/api", tags=["debts"])
app.include_router(ai.router, prefix="/api", tags=["ai"])

from google.api_core.exceptions import ResourceExhausted

@app.exception_handler(ResourceExhausted)
async def resource_exhausted_handler(request, exc):
    return JSONResponse(
        status_code=429,
        content={"detail": "AI Quota Exceeded. Please try again later."},
    )

