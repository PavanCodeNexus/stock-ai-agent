# agents/reporter.py
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.state import AgentState
from core.llm import get_llm

def reporter_agent(state: AgentState) -> AgentState:
    """
    Reporter Agent - Generates final report
    """
    symbol = state['symbol']
    print(f"\n📋 REPORTER: Generating final report for {symbol}...")

    llm = get_llm()

    price_data = state.get('price_data', {})

    prompt = f"""
    You are a senior stock analyst generating a final report.
    
    Stock: {symbol}
    Company: {state.get('company_data', {}).get('company_name')}
    Current Price: ₹{price_data.get('current_price')}
    
    Technical Analysis:
    {state.get('technical_analysis', {}).get('raw', 'N/A')}
    
    Sentiment Analysis:
    {state.get('sentiment_analysis', {}).get('raw', 'N/A')}
    
    Fundamental Analysis:
    {state.get('fundamental_analysis', {}).get('raw', 'N/A')}
    
    Risk Assessment:
    {state.get('risk_assessment', {}).get('raw', 'N/A')}
    
    Generate final report in this exact format:
    RECOMMENDATION: [STRONG BUY/BUY/HOLD/SELL/STRONG SELL]
    CONFIDENCE: [0-100]
    TARGET_PRICE: ₹[price]
    STOP_LOSS: ₹[price]
    RISK_LEVEL: [High/Medium/Low]
    TIME_HORIZON: [Short/Medium/Long term]
    
    SUMMARY:
    [3-4 sentences summarizing the analysis]
    
    KEY_REASONS:
    1. [reason]
    2. [reason]
    3. [reason]
    
    RISKS_TO_WATCH:
    1. [risk]
    2. [risk]
    """

    response = llm.invoke(prompt)
    content = response.content

    # Extract recommendation
    recommendation = "HOLD"
    confidence = 50.0

    try:
        for line in content.split('\n'):
            if 'RECOMMENDATION:' in line:
                recommendation = line.split(':')[1].strip()
            if 'CONFIDENCE:' in line:
                val = ''.join(filter(str.isdigit, line.split(':')[1]))
                if val:
                    confidence = float(val)
    except:
        pass

    print(f"   ✅ Report generated!")
    print(f"   📊 Recommendation: {recommendation}")
    print(f"   📊 Confidence: {confidence}%")

    state['recommendation'] = recommendation
    state['confidence_score'] = confidence
    state['final_report'] = content
    state['current_step'] = 'complete'
    return state