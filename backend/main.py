from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import anyio

from database import engine, probe_engine
from routers import auth, goals, transactions, recurring, debts, ai, budgets, households, net_worth, chat, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        yield
    finally:
        # uvicorn runs this after in-flight requests finish (or --timeout-graceful-shutdown passes):
        # hand every pooled connection back to Postgres instead of leaving it to time out server-side.
        # dispose() is blocking, so it runs in a worker thread, not on the event loop.
        await anyio.to_thread.run_sync(engine.dispose)
        await anyio.to_thread.run_sync(probe_engine.dispose)


app = FastAPI(title="BuFin API", version="2.0.0", lifespan=lifespan)

from error_handlers import register_error_handlers
register_error_handlers(app)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(goals.router, prefix="/api", tags=["goals"])
app.include_router(transactions.router, prefix="/api", tags=["transactions"])
app.include_router(recurring.router, prefix="/api", tags=["recurring"])
app.include_router(debts.router, prefix="/api", tags=["debts"])
app.include_router(ai.router, prefix="/api", tags=["ai"])
app.include_router(budgets.router, prefix="/api", tags=["budgets"])
app.include_router(households.router, prefix="/api", tags=["households"])
app.include_router(net_worth.router, prefix="/api", tags=["net_worth"])
app.include_router(chat.router, prefix="/api", tags=["chat"])

from google.api_core.exceptions import ResourceExhausted

@app.exception_handler(ResourceExhausted)
async def resource_exhausted_handler(request, exc):
    return JSONResponse(
        status_code=429,
        content={"detail": "AI Quota Exceeded. Please try again later."},
    )

