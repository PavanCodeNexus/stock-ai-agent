# api/routes/analysis.py
import asyncio
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from agents.graph import analyze_stock
from core.auth import get_optional_user, get_supabase_client

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])

# In-memory cache for quick turnaround (60s TTL)
analysis_cache = {}

# Timeout for synchronous analysis (seconds)
ANALYSIS_TIMEOUT_SECONDS = 60.0


@router.post("/analyze/{symbol}")
async def analyze_async(
    symbol: str,
    background_tasks: BackgroundTasks,
    query: Optional[str] = None,
    user: Optional[dict] = Depends(get_optional_user)
):
    clean_symbol = symbol.strip().upper()
    while clean_symbol.endswith(".NS") or clean_symbol.endswith(".BO"):
        clean_symbol = clean_symbol[:-3]

    if not query:
        query = f"Should I invest in {clean_symbol}?"

    user_id = user["id"] if user else None
    background_tasks.add_task(run_analysis_background, clean_symbol, query, user_id)

    return {
        "message": f"Analysis started for {clean_symbol}",
        "symbol": clean_symbol,
        "status": "processing"
    }


@router.get("/result/{symbol}")
async def get_result(symbol: str):
    clean_symbol = symbol.strip().upper()
    while clean_symbol.endswith(".NS") or clean_symbol.endswith(".BO"):
        clean_symbol = clean_symbol[:-3]
    result = analysis_cache.get(clean_symbol)
    if not result:
        return {"status": "processing", "symbol": clean_symbol}
    return result


@router.post("/analyze-sync/{symbol}")
async def analyze_sync(
    request: Request,
    symbol: str,
    query: Optional[str] = None,
    user: Optional[dict] = Depends(get_optional_user)
):
    clean_symbol = symbol.strip().upper()
    while clean_symbol.endswith(".NS") or clean_symbol.endswith(".BO"):
        clean_symbol = clean_symbol[:-3]

    if not query:
        query = f"Should I invest in {clean_symbol}?"

    # Check if client disconnected before starting
    if await request.is_disconnected():
        print(f"[Analysis] Client disconnected before starting analysis for {clean_symbol}")
        raise HTTPException(status_code=499, detail="Client Closed Request")

    # Execute analysis with timeout protection in a background thread
    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(analyze_stock, clean_symbol, query),
            timeout=ANALYSIS_TIMEOUT_SECONDS
        )
    except asyncio.CancelledError:
        print(f"[Analysis] Client cancelled request for {clean_symbol}. Suppressing report persistence.")
        raise
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Analysis timed out for {clean_symbol} after {ANALYSIS_TIMEOUT_SECONDS}s. The AI service took too long to respond."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal analysis error: {str(e)}"
        )

    # Check if client disconnected while LangGraph computation was running
    if await request.is_disconnected():
        print(f"[Analysis] Client disconnected during analysis for {clean_symbol}. Suppressing report persistence.")
        raise HTTPException(status_code=499, detail="Client Closed Request")

    if not result or result.get("error"):
        error_msg = result.get("error") if result else "Unknown analysis error"
        return {"error": error_msg, "symbol": clean_symbol}

    # Store in memory cache
    analysis_cache[clean_symbol] = result

    # Persist report for authenticated user only if client is still connected
    if user and user.get("id"):
        user_id = user["id"]
        try:
            sb = get_supabase_client()
            if sb:
                # Deduplicate: check if a report exists for this user and symbol
                existing = (
                    sb.table("reports")
                    .select("id")
                    .eq("user_id", user_id)
                    .eq("symbol", clean_symbol)
                    .execute()
                )

                report_data = {
                    "user_id": user_id,
                    "symbol": clean_symbol,
                    "recommendation": result.get("recommendation"),
                    "confidence": result.get("confidence"),
                    "target_price": result.get("target_price"),
                    "stop_loss": result.get("stop_loss"),
                    "full_report": result.get("final_report"),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }

                if existing.data and len(existing.data) > 0:
                    report_id = existing.data[0]["id"]
                    sb.table("reports").update(report_data).eq("id", report_id).execute()
                else:
                    sb.table("reports").insert(report_data).execute()
        except Exception as e:
            print(f"[Supabase] Warning: Failed to persist report for {clean_symbol}: {e}")

    return result


def run_analysis_background(symbol: str, query: str, user_id: Optional[str] = None):
    clean_symbol = symbol.strip().upper()
    while clean_symbol.endswith(".NS") or clean_symbol.endswith(".BO"):
        clean_symbol = clean_symbol[:-3]

    try:
        result = analyze_stock(clean_symbol, query)
        analysis_cache[clean_symbol] = result

        if user_id and not result.get("error"):
            sb = get_supabase_client()
            if sb:
                existing = (
                    sb.table("reports")
                    .select("id")
                    .eq("user_id", user_id)
                    .eq("symbol", clean_symbol)
                    .execute()
                )
                report_data = {
                    "user_id": user_id,
                    "symbol": clean_symbol,
                    "recommendation": result.get("recommendation"),
                    "confidence": result.get("confidence"),
                    "target_price": result.get("target_price"),
                    "stop_loss": result.get("stop_loss"),
                    "full_report": result.get("final_report"),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
                if existing.data and len(existing.data) > 0:
                    sb.table("reports").update(report_data).eq("id", existing.data[0]["id"]).execute()
                else:
                    sb.table("reports").insert(report_data).execute()
    except Exception as e:
        print(f"[Background Task Error] {clean_symbol}: {e}")