# backend/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from api.routes.market import router as market_router

app = FastAPI(
    title=settings.APP_NAME,
    description="Agentic AI for Indian Stock Market",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(market_router)

@app.get("/")
async def root():
    return {
        "message": "Stock AI Agent API Running ✅",
        "version": "1.0.0",
        "status": "healthy"
    }