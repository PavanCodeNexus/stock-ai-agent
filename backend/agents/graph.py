# agents/graph.py
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from langgraph.graph import StateGraph, END
from agents.state import AgentState
from agents.planner import planner_agent
from agents.collector import collector_agent
from agents.analyzer import analyzer_agent
from agents.verifier import verifier_agent
from agents.risk_agent import risk_agent
from agents.reporter import reporter_agent

def create_agent_graph():
    """Create the main LangGraph pipeline"""

    # Initialize graph
    graph = StateGraph(AgentState)

    # Add all agents as nodes
    graph.add_node("planner", planner_agent)
    graph.add_node("collector", collector_agent)
    graph.add_node("analyzer", analyzer_agent)
    graph.add_node("verifier", verifier_agent)
    graph.add_node("risk_agent", risk_agent)
    graph.add_node("reporter", reporter_agent)

    # Connect agents in sequence
    graph.set_entry_point("planner")
    graph.add_edge("planner", "collector")
    graph.add_edge("collector", "analyzer")
    graph.add_edge("analyzer", "verifier")
    graph.add_edge("verifier", "risk_agent")
    graph.add_edge("risk_agent", "reporter")
    graph.add_edge("reporter", END)

    return graph.compile()


def analyze_stock(symbol: str, query: str = None) -> dict:
    """Main function to analyze a stock with safe error handling"""
    clean_symbol = symbol.strip().upper()

    if not query:
        query = f"Should I invest in {clean_symbol}?"

    initial_state: AgentState = {
        "symbol": clean_symbol,
        "user_query": query,
        "tasks": [],
        "price_data": {},
        "news_data": {},
        "financial_data": {},
        "company_data": {},
        "technical_analysis": {},
        "sentiment_analysis": {},
        "fundamental_analysis": {},
        "verified": False,
        "verification_notes": "",
        "risk_assessment": {},
        "recommendation": "",
        "confidence_score": 0.0,
        "target_price": 0.0,
        "stop_loss": 0.0,
        "final_report": "",
        "errors": [],
        "current_step": "planner"
    }

    print("\n" + "="*60)
    print(f"🤖 STOCK AI AGENT - Analyzing {clean_symbol}")
    print("="*60)

    try:
        app = create_agent_graph()
        final_state = app.invoke(initial_state)

        # Check if the pipeline accumulated fatal errors
        pipeline_errors = final_state.get("errors", [])
        final_report = final_state.get("final_report", "")

        if not final_report and pipeline_errors:
            error_msg = "; ".join(pipeline_errors)
            return {
                "error": f"AI analysis encountered errors: {error_msg}",
                "symbol": clean_symbol,
                "errors": pipeline_errors
            }

        print("\n" + "="*60)
        print("📊 FINAL REPORT")
        print("="*60)
        print(final_report)

        return {
            "symbol": clean_symbol,
            "recommendation": final_state.get('recommendation') or 'HOLD',
            "confidence": final_state.get('confidence_score', 50),
            "target_price": final_state.get('target_price', 0),
            "stop_loss": final_state.get('stop_loss', 0),
            "final_report": final_report,
            "errors": pipeline_errors
        }
    except Exception as e:
        print(f"Agent error: {e}")
        # Never fake a successful AI result when an exception occurs
        return {
            "error": f"Analysis failed: {str(e)}",
            "symbol": clean_symbol,
            "errors": [str(e)]
        }


# Test
if __name__ == "__main__":
    result = analyze_stock("TCS", "Should I buy TCS stock now?")