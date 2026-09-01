# agents/planner.py
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.state import AgentState
from core.llm import get_llm

def planner_agent(state: AgentState) -> AgentState:
    """
    Planner Agent - Breaks user query into tasks
    """
    print(f"\n🧠 PLANNER: Analyzing query for {state['symbol']}...")

    llm = get_llm()

    prompt = f"""
    You are a stock market planning agent.
    
    User wants to analyze: {state['symbol']}
    User query: {state['user_query']}
    
    Create a list of analysis tasks needed.
    Return ONLY a Python list like:
    ["task1", "task2", "task3"]
    
    Always include these tasks:
    - Fetch current price data
    - Fetch recent news
    - Fetch financial metrics
    - Perform technical analysis
    - Analyze news sentiment
    - Assess fundamental strength
    - Evaluate risks
    - Generate recommendation
    """

    response = llm.invoke(prompt)
    
    # Parse tasks from response
    try:
        import ast
        # Find list in response
        text = response.content
        start = text.find('[')
        end = text.rfind(']') + 1
        tasks = ast.literal_eval(text[start:end])
    except:
        tasks = [
            "Fetch current price data",
            "Fetch recent news",
            "Fetch financial metrics",
            "Perform technical analysis",
            "Analyze news sentiment",
            "Assess fundamental strength",
            "Evaluate risks",
            "Generate recommendation"
        ]

    print(f"✅ PLANNER: Created {len(tasks)} tasks")
    for i, task in enumerate(tasks, 1):
        print(f"   {i}. {task}")

    state['tasks'] = tasks
    state['current_step'] = 'collector'
    return state