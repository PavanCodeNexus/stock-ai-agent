# backend/core/llm.py
from langchain_groq import ChatGroq
from core.config import settings

def get_llm():
    """
    Returns ChatGroq instance with timeout and retry limit to prevent
    indefinite request hanging.
    """
    return ChatGroq(
        api_key=settings.GROQ_API_KEY,
        model=settings.LLM_MODEL,
        temperature=0.1,
        request_timeout=30.0,
        max_retries=2,
    )

# Quick test
if __name__ == "__main__":
    llm = get_llm()
    response = llm.invoke("Say: Stock AI Agent is ready!")
    print(response.content)