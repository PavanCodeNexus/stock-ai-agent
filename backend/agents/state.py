# agents/state.py
from typing import TypedDict, List, Optional

class AgentState(TypedDict):
    # Input
    symbol: str
    user_query: str

    # Planner output
    tasks: List[str]

    # Collector output
    price_data: dict
    news_data: dict
    financial_data: dict
    company_data: dict

    # Analyzer output
    technical_analysis: dict
    sentiment_analysis: dict
    fundamental_analysis: dict

    # Verifier output
    verified: bool
    verification_notes: str

    # Risk Agent output
    risk_assessment: dict

    # Final output
    recommendation: str
    confidence_score: float
    target_price: float
    stop_loss: float
    final_report: str

    # Metadata
    errors: List[str]
    current_step: str