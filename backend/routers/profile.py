from fastapi import APIRouter, Depends, HTTPException, Request, status

from auth import get_current_user_id
from database import get_admin_client
from models import ProfilePatch, ProfileResponse

router = APIRouter(prefix="/v1/profile", tags=["profile"])

# Fields that must never be writable through PATCH (§6.1 server-managed + §6.2 email rule)
_READ_ONLY = frozenset({"id", "user_id", "created_at", "updated_at", "email"})


@router.get("", response_model=ProfileResponse)
async def get_profile(user_id: str = Depends(get_current_user_id)):
    """Return the caller's own profiles row (§6.2 GET /v1/profile)."""
    result = (
        get_admin_client()
        .table("profiles")
        .select("*")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Profile not found."}},
        )
    return result.data


@router.patch("", response_model=ProfileResponse)
async def patch_profile(
    request: Request,
    user_id: str = Depends(get_current_user_id),
):
    """Update the caller's own profile with a subset of writable fields (§6.2 PATCH /v1/profile).

    email is excluded — changed via Supabase Auth only.
    id, created_at, updated_at are rejected with 422 read_only_field.
    """
    body: dict = await request.json()

    # Enforce §6.1 server-managed field rule before touching Pydantic
    bad_fields = sorted(set(body.keys()) & _READ_ONLY)
    if bad_fields:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": {
                    "code": "read_only_field",
                    "message": f"Field(s) {bad_fields} are read-only and cannot be set via PATCH.",
                    "details": {"fields": bad_fields},
                }
            },
        )

    patch = ProfilePatch(**body)
    updates = patch.writable_fields()

    if not updates:
        # No-op: return current profile unchanged
        result = (
            get_admin_client()
            .table("profiles")
            .select("*")
            .eq("id", user_id)
            .single()
            .execute()
        )
        return result.data

    get_admin_client().table("profiles").update(updates).eq("id", user_id).execute()

    result = (
        get_admin_client()
        .table("profiles")
        .select("*")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Profile not found."}},
        )
    return result.data
