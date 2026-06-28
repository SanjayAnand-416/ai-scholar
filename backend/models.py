from datetime import datetime
from typing import Optional
from pydantic import BaseModel, UUID4, model_validator


# ─── Read-only fields that must never appear in a PATCH body ──────────────────
# Per §6.1: if a client sends id, created_at, or updated_at the backend
# returns 422 with error.code = "read_only_field".
_SERVER_MANAGED = frozenset({"id", "created_at", "updated_at"})
# email is separately excluded from PATCH per §6.2 (changed via Supabase Auth only).


class ProfileResponse(BaseModel):
    """GET /v1/profile — maps 1:1 to Appendix B.1 columns."""
    id: UUID4
    full_name: Optional[str] = None
    email: Optional[str] = None          # read-only; changed via Supabase Auth
    avatar_url: Optional[str] = None
    college_name: Optional[str] = None
    degree: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = None
    career_goal: Optional[str] = None
    created_at: datetime                  # server-managed
    updated_at: datetime                  # server-managed


class ProfilePatch(BaseModel):
    """PATCH /v1/profile — only the fields writable per Appendix B.1.

    email is intentionally absent: it is changed through Supabase Auth, not here.
    id, created_at, updated_at are rejected below with 422 read_only_field.
    """
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    college_name: Optional[str] = None
    degree: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = None
    career_goal: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def reject_server_managed_fields(cls, data: dict) -> dict:
        """Return 422 if the client sends any server-managed field or email."""
        if not isinstance(data, dict):
            return data
        bad = set(data.keys()) & (_SERVER_MANAGED | {"email"})
        if bad:
            raise ValueError(
                [
                    {
                        "code": "read_only_field",
                        "message": f"Field '{f}' is read-only and cannot be set via PATCH.",
                    }
                    for f in sorted(bad)
                ]
            )
        return data

    def writable_fields(self) -> dict:
        """Return only explicitly set (non-None) fields for a partial update."""
        return {k: v for k, v in self.model_dump().items() if v is not None}
