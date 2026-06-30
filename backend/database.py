from functools import lru_cache
from typing import Dict, Optional, Union

from httpx import Timeout
from postgrest import SyncPostgrestClient
from postgrest.constants import DEFAULT_POSTGREST_CLIENT_TIMEOUT
from postgrest.utils import SyncClient as PostgrestSyncClient
from supabase import Client

from config import get_settings


class Http1PostgrestClient(SyncPostgrestClient):
    """PostgREST client using HTTP/1.1 to avoid intermittent HTTP/2 stream resets."""

    def create_session(
        self,
        base_url: str,
        headers: Dict[str, str],
        timeout: Union[int, float, Timeout],
        verify: bool = True,
        proxy: Optional[str] = None,
    ) -> PostgrestSyncClient:
        return PostgrestSyncClient(
            base_url=base_url,
            headers=headers,
            timeout=timeout,
            verify=verify,
            proxy=proxy,
            follow_redirects=True,
            http2=False,
        )


class Http1SupabaseClient(Client):
    @staticmethod
    def _init_postgrest_client(
        rest_url: str,
        headers: Dict[str, str],
        schema: str,
        timeout: Union[int, float, Timeout] = DEFAULT_POSTGREST_CLIENT_TIMEOUT,
        verify: bool = True,
        proxy: Optional[str] = None,
    ) -> SyncPostgrestClient:
        return Http1PostgrestClient(
            rest_url,
            headers=headers,
            schema=schema,
            timeout=timeout,
            verify=verify,
            proxy=proxy,
        )


@lru_cache
def get_admin_client() -> Client:
    """Service-role client — bypasses RLS. Use only server-side with explicit user filters."""
    s = get_settings()
    return Http1SupabaseClient.create(s.supabase_url, s.supabase_secret_key)


def get_user_client(access_token: str) -> Client:
    """Per-request client scoped to the caller's JWT so RLS applies automatically."""
    s = get_settings()
    client = Http1SupabaseClient.create(s.supabase_url, s.supabase_secret_key)
    client.auth.set_session(access_token, "")
    return client
