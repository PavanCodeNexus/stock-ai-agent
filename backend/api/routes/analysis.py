# api/routes/analysis.py
from fastapi import APIRouter, BackgroundTasks
from agents.graph import analyze_stock
from typing import Optional

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])

# Store results temporarily
analysis_cache = {}

@router.post("/analyze/{symbol}")
async def analyze(symbol: str, background_tasks: BackgroundTasks, query: Optional[str] = None):
    """Start AI agent analysis for a stock"""
    if not query:
        query = f"Should I invest in {symbol}?"

    # Run analysis in background
    background_tasks.add_task(run_analysis, symbol, query)

    return {
        "message": f"Analysis started for {symbol}",
        "symbol": symbol,
        "status": "processing"
    }

@router.get("/result/{symbol}")
async def get_result(symbol: str):
    """Get analysis result"""
    result = analysis_cache.get(symbol.upper())
    if not result:
        return {"status": "processing", "symbol": symbol}
    return result

@router.post("/analyze-sync/{symbol}")
async def analyze_sync(symbol: str, query: Optional[str] = None):
    """Synchronous analysis - waits for result"""
    if not query:
        query = f"Should I invest in {symbol}?"

    result = analyze_stock(symbol, query)
    analysis_cache[symbol.upper()] = result
    return result

def run_analysis(symbol: str, query: str):
    """Background task"""
    result = analyze_stock(symbol, query)
    analysis_cache[symbol.upper()] = result