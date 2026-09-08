# api/routes/market.py

from fastapi import APIRouter
from data.market_data import MarketData
from data.news_fetcher import NewsFetcher
from data.financials import Financials

import re

def validate_symbol(symbol: str) -> str:
    """Clean and validate stock symbol"""
    # Remove any special characters, keep only letters and numbers
    clean = re.sub(r'[^A-Z0-9&]', '', symbol.upper().strip())
    if not clean or len(clean) > 20:
        raise ValueError(f"Invalid symbol: {symbol}")
    return clean
router = APIRouter(prefix="/api/market", tags=["Market"])
# Update get_price endpoint:
@router.get("/price/{symbol}")
async def get_price(symbol: str):
    """Get live stock price"""
    try:
        clean_symbol = validate_symbol(symbol)
        return MarketData.get_current_price(clean_symbol)
    except ValueError as e:
        return {"error": str(e), "symbol": symbol}



# ── Period → interval mapping ───────────────────────────────────────────────
PERIOD_INTERVAL_MAP: dict[str, tuple[str, str]] = {
    "1d":  ("1d",  "5m"),
    "1w":  ("5d",  "15m"),
    "1mo": ("1mo", "1d"),
    "3mo": ("3mo", "1d"),
    "6mo": ("6mo", "1d"),
    "1y":  ("1y",  "1d"),
    "5y":  ("5y",  "1d"),
    "max": ("max", "1d"),
}


@router.get("/price/{symbol}")
async def get_price(symbol: str):
    """Get live stock price"""
    return MarketData.get_current_price(symbol)


@router.get("/history/{symbol}")
async def get_history(symbol: str, period: str = "3mo"):
    """
    Get historical OHLCV data.

    period values: 1d | 1w | 1mo | 3mo | 6mo | 1y | 5y | max
    The backend auto-selects the correct yfinance interval.
    """
    period_lower = period.lower()
    yf_period, yf_interval = PERIOD_INTERVAL_MAP.get(
        period_lower, ("3mo", "1d")
    )
    return MarketData.get_historical_data(symbol, yf_period, yf_interval)


@router.get("/overview")
async def get_overview():
    """Get Nifty 50 and Sensex"""
    return MarketData.get_market_overview()


@router.get("/news/{symbol}")
async def get_news(symbol: str, days: int = 7):
    """Get stock news"""
    return await NewsFetcher.get_stock_news(symbol, days)


@router.get("/financials/{symbol}")
async def get_financials(symbol: str):
    """Get company financials"""
    return Financials.get_key_metrics(symbol)


@router.get("/company/{symbol}")
async def get_company(symbol: str):
    """Get company info"""
    return Financials.get_company_info(symbol)

from fastapi import APIRouter
from typing import List
import asyncio
import httpx

@router.get("/bulk-price")
async def get_bulk_price(symbols: str):
    """
    Get prices for multiple stocks at once
    symbols = comma separated e.g. TCS,RELIANCE,INFY
    """
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()][:20]

    results = []
    for symbol in symbol_list:
        try:
            data = MarketData.get_current_price(symbol)
            results.append(data)
        except Exception:
            results.append({"symbol": symbol, "error": "Failed"})

    return {"results": results, "count": len(results)}
