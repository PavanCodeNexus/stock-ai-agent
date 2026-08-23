from dotenv import load_dotenv
import os

load_dotenv()

class Settings:
    # App
    APP_NAME = "Stock AI Agent"
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # LLM
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    LLM_MODEL = "llama-3.3-70b-versatile"

    # Database
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    DATABASE_URL = os.getenv("DATABASE_URL")

    # Redis
    UPSTASH_REDIS_URL = os.getenv("UPSTASH_REDIS_URL")
    UPSTASH_REDIS_TOKEN = os.getenv("UPSTASH_REDIS_TOKEN")

    # News
    NEWS_API_KEY = os.getenv("NEWS_API_KEY")

    # Trading
    ANGEL_ONE_API_KEY = os.getenv("ANGEL_ONE_API_KEY")
    ANGEL_ONE_CLIENT_ID = os.getenv("ANGEL_ONE_CLIENT_ID")
    ANGEL_ONE_PASSWORD = os.getenv("ANGEL_ONE_PASSWORD")
    ANGEL_ONE_TOTP = os.getenv("ANGEL_ONE_TOTP")

    # Security
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "changethis")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

settings = Settings()