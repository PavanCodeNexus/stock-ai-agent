# agents/analyzer.py
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.state import AgentState
from core.llm import get_llm

def analyzer_agent(state: AgentState) -> AgentState:
    """
    Analyzer Agent - Deep analysis of all collected data
    """
    symbol = state['symbol']
    print(f"\n🔍 ANALYZER: Analyzing {symbol}...")

    llm = get_llm()

    # Technical Analysis
    price_data = state.get('price_data', {})
    history = price_data.get('history', [])

    tech_prompt = f"""
    You are a technical analysis expert for Indian stocks.
    
    Stock: {symbol}
    Current Price: ₹{price_data.get('current_price')}
    Day High: ₹{price_data.get('day_high')}
    Day Low: ₹{price_data.get('day_low')}
    52W High: ₹{price_data.get('52_week_high')}
    52W Low: ₹{price_data.get('52_week_low')}
    Volume: {price_data.get('volume')}
    Change: {price_data.get('change_percent')}%
    Historical data points: {len(history)}
    
    Provide technical analysis in this exact format:
    TREND: [Bullish/Bearish/Neutral]
    MOMENTUM: [Strong/Moderate/Weak]
    SUPPORT: [price level]
    RESISTANCE: [price level]
    SIGNAL: [Buy/Sell/Hold]
    REASON: [2-3 sentences]
    """

    tech_response = llm.invoke(tech_prompt)
    print(f"   ✅ Technical analysis done")

    # Sentiment Analysis
    news_data = state.get('news_data', {})
    articles = news_data.get('articles', [])
    headlines = [a.get('title', '') for a in articles[:5]]

    sentiment_prompt = f"""
    You are a financial news sentiment analyzer.
    
    Stock: {symbol}
    Recent headlines:
    {chr(10).join(f'- {h}' for h in headlines)}
    
    Analyze sentiment in this exact format:
    OVERALL_SENTIMENT: [Positive/Negative/Neutral]
    SCORE: [0-100, where 100 is most positive]
    KEY_THEMES: [comma separated themes]
    IMPACT: [High/Medium/Low]
    SUMMARY: [2-3 sentences]
    """

    sentiment_response = llm.invoke(sentiment_prompt)
    print(f"   ✅ Sentiment analysis done")

    # Fundamental Analysis
    financial_data = state.get('financial_data', {})
    company_data = state.get('company_data', {})
    valuation = financial_data.get('valuation', {})
    profitability = financial_data.get('profitability', {})

    fundamental_prompt = f"""
    You are a fundamental analysis expert for Indian stocks.
    
    Stock: {symbol}
    Company: {company_data.get('company_name')}
    Sector: {company_data.get('sector')}
    
    Valuation:
    - PE Ratio: {valuation.get('pe_ratio')}
    - PB Ratio: {valuation.get('pb_ratio')}
    - Market Cap: {valuation.get('market_cap')}
    
    Profitability:
    - Profit Margin: {profitability.get('profit_margin')}
    - ROE: {profitability.get('roe')}
    - ROA: {profitability.get('roa')}
    
    Analyze fundamentals in this exact format:
    STRENGTH: [Strong/Moderate/Weak]
    VALUATION: [Overvalued/Fairly Valued/Undervalued]
    GROWTH_OUTLOOK: [Positive/Neutral/Negative]
    KEY_STRENGTHS: [comma separated]
    KEY_RISKS: [comma separated]
    SUMMARY: [2-3 sentences]
    """

    fundamental_response = llm.invoke(fundamental_prompt)
    print(f"   ✅ Fundamental analysis done")

    state['technical_analysis'] = {
        "raw": tech_response.content,
        "symbol": symbol
    }
    state['sentiment_analysis'] = {
        "raw": sentiment_response.content,
        "headlines_analyzed": len(headlines)
    }
    state['fundamental_analysis'] = {
        "raw": fundamental_response.content,
        "symbol": symbol
    }

    state['current_step'] = 'verifier'
    print(f"✅ ANALYZER: All analysis complete!")
    return state