import os
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()


class Settings:
    supabase_url: str = os.environ["SUPABASE_URL"]
    supabase_secret_key: str = os.environ["SUPABASE_SECRET_KEY"]
    cors_origins: list[str] = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
    port: int = int(os.environ.get("PORT", "5000"))


@lru_cache
def get_settings() -> Settings:
    return Settings()
