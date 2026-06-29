from fastapi import Depends, HTTPException, status
from typing import Optional

from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from database import get_admin_client

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> str:
    """Verify the Supabase JWT and return the caller's user_id (UUID string).

    Raises 401 if the token is missing, expired, or invalid.
    Never accepts user_id as a client-supplied field — it is always derived
    from the verified token, matching the §6.1 convention.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "unauthorized", "message": "Missing bearer token."}},
        )

    token = credentials.credentials
    try:
        response = get_admin_client().auth.get_user(token)
        if response.user is None:
            raise ValueError("no user in response")
        return str(response.user.id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "unauthorized", "message": "Invalid or expired token."}},
        )
