# backend/main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from core.config import settings
from api.routes.market import router as market_router
from api.routes.analysis import router as analysis_router
import time
from collections import defaultdict

app = FastAPI(
    title=settings.APP_NAME,
    description="Agentic AI for Indian Stock Market",
    version="1.0.0"
)

# ── CORS ────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Simple Rate Limiter ──────────────────────────────────────
request_counts: dict = defaultdict(list)
RATE_LIMIT     = 200  # requests
RATE_WINDOW    = 60   # seconds

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()

    # Clean old requests
    request_counts[client_ip] = [
        t for t in request_counts[client_ip]
        if now - t < RATE_WINDOW
    ]

    if len(request_counts[client_ip]) >= RATE_LIMIT:
        return JSONResponse(
            status_code=429,
            content={"error": "Too many requests. Please wait a moment."}
        )

    request_counts[client_ip].append(now)
    response = await call_next(request)
    return response

# ── Routes ──────────────────────────────────────────────────
app.include_router(market_router)
app.include_router(analysis_router)

@app.get("/")
async def root():
    return {
        "message": "Stock AI Agent API ✅",
        "version": "1.0.0",
        "status": "healthy"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}