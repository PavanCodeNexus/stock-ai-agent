# api/routes/market.py

from fastapi import APIRouter
from data.market_data import MarketData
from data.news_fetcher import NewsFetcher
from data.financials import Financials

router = APIRouter(prefix="/api/market", tags=["Market"])

@router.get("/price/{symbol}")
async def get_price(symbol: str):
    """Get live stock price"""
    return MarketData.get_current_price(symbol)

@router.get("/history/{symbol}")
async def get_history(symbol: str, period: str = "3mo"):
    """Get historical price data"""
    return MarketData.get_historical_data(symbol, period)

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