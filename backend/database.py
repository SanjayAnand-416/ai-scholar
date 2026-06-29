from functools import lru_cache
from supabase import create_client, Client
from config import get_settings


@lru_cache
def get_admin_client() -> Client:
    """Service-role client — bypasses RLS. Use only server-side with explicit user filters."""
    s = get_settings()
    return create_client(s.supabase_url, s.supabase_secret_key)


def get_user_client(access_token: str) -> Client:
    """Per-request client scoped to the caller's JWT so RLS applies automatically."""
    s = get_settings()
    client = create_client(s.supabase_url, s.supabase_secret_key)
    client.auth.set_session(access_token, "")
    return client
