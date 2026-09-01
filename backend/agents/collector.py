# agents/collector.py
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.state import AgentState
from data.market_data import MarketData
from data.financials import Financials
import asyncio

def collector_agent(state: AgentState) -> AgentState:
    """
    Collector Agent - Fetches all data needed
    """
    symbol = state['symbol']
    print(f"\n📊 COLLECTOR: Fetching data for {symbol}...")

    errors = state.get('errors', [])

    # 1. Fetch price data
    try:
        price_data = MarketData.get_current_price(symbol)
        history = MarketData.get_historical_data(symbol, "3mo")
        price_data['history'] = history.get('data', [])
        state['price_data'] = price_data
        print(f"   ✅ Price: ₹{price_data.get('current_price')}")
    except Exception as e:
        errors.append(f"Price fetch error: {str(e)}")
        state['price_data'] = {}

    # 2. Fetch financial data
    try:
        financial_data = Financials.get_key_metrics(symbol)
        state['financial_data'] = financial_data
        print(f"   ✅ Financials fetched")
    except Exception as e:
        errors.append(f"Financial fetch error: {str(e)}")
        state['financial_data'] = {}

    # 3. Fetch company data
    try:
        company_data = Financials.get_company_info(symbol)
        state['company_data'] = company_data
        print(f"   ✅ Company: {company_data.get('company_name')}")
    except Exception as e:
        errors.append(f"Company fetch error: {str(e)}")
        state['company_data'] = {}

    # 4. Fetch news (sync wrapper)
    try:
        from data.news_fetcher import NewsFetcher
        news = asyncio.run(NewsFetcher.get_stock_news(symbol, days=7))
        state['news_data'] = news
        print(f"   ✅ News: {news.get('total_articles', 0)} articles")
    except Exception as e:
        errors.append(f"News fetch error: {str(e)}")
        state['news_data'] = {}

    state['errors'] = errors
    state['current_step'] = 'analyzer'
    print(f"✅ COLLECTOR: All data collected!")
    return state