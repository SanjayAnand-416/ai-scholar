import os
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()


class Settings:
    supabase_url: str = os.environ["SUPABASE_URL"]
    supabase_secret_key: str = os.environ["SUPABASE_SECRET_KEY"]
    cors_origins: list[str] = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
    port: int = int(os.environ.get("PORT", "5001"))
    embedding_provider: str = os.environ.get("EMBEDDING_PROVIDER", "auto")
    gemini_api_key: str = os.environ.get("GEMINI_API_KEY", "")
    huggingface_api_key: str = os.environ.get("HUGGINGFACE_API_KEY", "")
    groq_api_key: str = os.environ.get("GROQ_API_KEY", "")


@lru_cache
def get_settings() -> Settings:
    return Settings()
