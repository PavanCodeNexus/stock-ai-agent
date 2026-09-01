# agents/risk_agent.py
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.state import AgentState
from core.llm import get_llm

def risk_agent(state: AgentState) -> AgentState:
    """
    Risk Agent - Devil's advocate, challenges the analysis
    """
    symbol = state['symbol']
    print(f"\n⚠️  RISK AGENT: Evaluating risks for {symbol}...")

    llm = get_llm()

    price_data = state.get('price_data', {})
    financial_data = state.get('financial_data', {})

    prompt = f"""
    You are a risk assessment agent. Be critical and conservative.
    
    Stock: {symbol}
    Current Price: ₹{price_data.get('current_price')}
    52W High: ₹{price_data.get('52_week_high')}
    52W Low: ₹{price_data.get('52_week_low')}
    
    Previous Analysis Summary:
    Technical: {state.get('technical_analysis', {}).get('raw', 'N/A')[:200]}
    Sentiment: {state.get('sentiment_analysis', {}).get('raw', 'N/A')[:200]}
    Fundamental: {state.get('fundamental_analysis', {}).get('raw', 'N/A')[:200]}
    
    As devil's advocate:
    1. Challenge optimistic assumptions
    2. Identify downside risks
    3. Consider macro risks (RBI, global markets)
    4. Calculate position sizing
    
    Respond in this exact format:
    RISK_LEVEL: [High/Medium/Low]
    DOWNSIDE_RISK: [percentage]
    MAX_POSITION_SIZE: [percentage of portfolio]
    STOP_LOSS: [price level]
    TARGET_PRICE: [price level]
    MACRO_RISKS: [comma separated]
    CHALLENGES: [2-3 sentences challenging the analysis]
    FINAL_RISK_SCORE: [1-10, where 10 is highest risk]
    """

    response = llm.invoke(prompt)
    print(f"   ✅ Risk assessment complete")

    # Extract stop loss and target
    content = response.content
    stop_loss = price_data.get('current_price', 0) * 0.95
    target_price = price_data.get('current_price', 0) * 1.15

    try:
        for line in content.split('\n'):
            if 'STOP_LOSS:' in line:
                val = ''.join(filter(str.isdigit, line.split(':')[1]))
                if val:
                    stop_loss = float(val)
            if 'TARGET_PRICE:' in line:
                val = ''.join(filter(str.isdigit, line.split(':')[1]))
                if val:
                    target_price = float(val)
    except:
        pass

    state['risk_assessment'] = {
        "raw": content,
        "stop_loss": stop_loss,
        "target_price": target_price
    }
    state['stop_loss'] = stop_loss
    state['target_price'] = target_price
    state['current_step'] = 'reporter'
    return state