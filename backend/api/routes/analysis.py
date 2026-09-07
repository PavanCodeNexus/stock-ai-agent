# api/routes/analysis.py
from fastapi import APIRouter, BackgroundTasks
from agents.graph import analyze_stock
from typing import Optional
import os
from supabase import create_client

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])

# In-memory cache
analysis_cache = {}

# Supabase client
def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if url and key:
        return create_client(url, key)
    return None

@router.post("/analyze/{symbol}")
async def analyze(
    symbol: str,
    background_tasks: BackgroundTasks,
    query: Optional[str] = None
):
    if not query:
        query = f"Should I invest in {symbol}?"
    background_tasks.add_task(run_analysis, symbol, query)
    return {
        "message": f"Analysis started for {symbol}",
        "symbol": symbol,
        "status": "processing"
    }

@router.get("/result/{symbol}")
async def get_result(symbol: str):
    result = analysis_cache.get(symbol.upper())
    if not result:
        return {"status": "processing", "symbol": symbol}
    return result

@router.post("/analyze-sync/{symbol}")
async def analyze_sync(
    symbol: str,
    query: Optional[str] = None,
    user_id: Optional[str] = None
):
    if not query:
        query = f"Should I invest in {symbol}?"

    try:
        result = analyze_stock(symbol, query)
        analysis_cache[symbol.upper()] = result

        # Save to Supabase if user_id provided
        if user_id:
            try:
                sb = get_supabase()
                if sb:
                    sb.table("reports").insert({
                        "user_id": user_id,
                        "symbol": symbol.upper(),
                        "recommendation": result.get("recommendation"),
                        "confidence": result.get("confidence"),
                        "target_price": result.get("target_price"),
                        "stop_loss": result.get("stop_loss"),
                        "full_report": result.get("final_report"),
                    }).execute()
            except Exception as e:
                print(f"Failed to save report: {e}")

        return result
    except Exception as e:
        return {"error": str(e), "symbol": symbol}

def run_analysis(symbol: str, query: str):
    result = analyze_stock(symbol, query)
    analysis_cache[symbol.upper()] = result