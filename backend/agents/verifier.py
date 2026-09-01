# agents/verifier.py
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.state import AgentState
from core.llm import get_llm

def verifier_agent(state: AgentState) -> AgentState:
    """
    Verifier Agent - Cross checks all analysis
    """
    symbol = state['symbol']
    print(f"\n✔️  VERIFIER: Verifying analysis for {symbol}...")

    llm = get_llm()

    prompt = f"""
    You are a verification agent for stock analysis.
    
    Stock: {symbol}
    
    Technical Analysis:
    {state.get('technical_analysis', {}).get('raw', 'N/A')}
    
    Sentiment Analysis:
    {state.get('sentiment_analysis', {}).get('raw', 'N/A')}
    
    Fundamental Analysis:
    {state.get('fundamental_analysis', {}).get('raw', 'N/A')}
    
    Check for:
    1. Are all analyses consistent?
    2. Any contradictions?
    3. Is the data reliable?
    4. Any red flags?
    
    Respond in this exact format:
    VERIFIED: [Yes/No]
    CONSISTENCY: [High/Medium/Low]
    CONTRADICTIONS: [None/describe any]
    RED_FLAGS: [None/describe any]
    NOTES: [2-3 sentences]
    """

    response = llm.invoke(prompt)
    verified = 'VERIFIED: Yes' in response.content

    print(f"   ✅ Verification: {'Passed' if verified else 'Issues found'}")

    state['verified'] = verified
    state['verification_notes'] = response.content
    state['current_step'] = 'risk_agent'
    return state