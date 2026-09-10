# backend/main.py
import os
import time
from collections import defaultdict
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from core.config import settings
from api.routes.market import router as market_router
from api.routes.analysis import router as analysis_router

app = FastAPI(
    title=settings.APP_NAME,
    description="Agentic AI for Indian Stock Market",
    version="1.0.0"
)

# ── CORS ────────────────────────────────────────────────────
frontend_url_env = os.getenv("FRONTEND_URL", "http://localhost:3000")
# Parse comma-separated list of origins
allowed_origins = [
    url.strip() for url in frontend_url_env.split(",") if url.strip()
]
# Ensure local development origins are always present
for local_origin in ["http://localhost:3000", "http://127.0.0.1:3000"]:
    if local_origin not in allowed_origins:
        allowed_origins.append(local_origin)

allow_vercel_previews = os.getenv("ALLOW_VERCEL_PREVIEWS", "true").lower() == "true"
vercel_origin_regex = r"https://.*\.vercel\.app" if allow_vercel_previews else None

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=vercel_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
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