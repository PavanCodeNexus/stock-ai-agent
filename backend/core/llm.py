from langchain_groq import ChatGroq
from core.config import settings

def get_llm():
    return ChatGroq(
        api_key=settings.GROQ_API_KEY,
        model=settings.LLM_MODEL,
        temperature=0.1
    )

# Quick test
if __name__ == "__main__":
    llm = get_llm()
    response = llm.invoke("Say: Stock AI Agent is ready!")
    print(response.content)