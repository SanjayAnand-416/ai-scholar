import hashlib
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status

from auth import get_current_user_id
from database import get_admin_client
from models import DocumentListResponse, DocumentResponse

router = APIRouter(prefix="/v1/documents", tags=["documents"])

_BUCKET = "documents"
_ALLOWED_MIME = {"application/pdf"}


def _to_doc_response(row: dict) -> DocumentResponse:
    """Strip internal-only fields before returning to client (Appendix B.2)."""
    return DocumentResponse(
        id=row["id"],
        title=row.get("title"),
        original_file_name=row["original_file_name"],
        file_type=row["file_type"],
        file_size_bytes=row.get("file_size_bytes"),
        status=row["status"],
        total_pages=row.get("total_pages"),
        error_message=row.get("error_message"),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _get_own_document(document_id: str, user_id: str) -> dict:
    """Fetch a document that belongs to the caller; raise 404 if absent or not owned.

    Per §6.3: non-owner ID returns 404, not 403, to avoid revealing existence.
    The admin client is used (bypasses RLS), so the user_id filter is mandatory.
    Uses limit(1) rather than single() so that zero-row results return an empty
    list instead of raising a PostgREST error.
    """
    result = (
        get_admin_client()
        .table("documents")
        .select("*")
        .eq("id", document_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Document not found."}},
        )
    return result.data[0]


# ─── POST /v1/documents ───────────────────────────────────────────────────────

@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile,
    title: Optional[str] = Query(default=None, description="Optional document title"),
    user_id: str = Depends(get_current_user_id),
):
    """Upload a PDF, store it privately, and create a documents row (§6.3).

    Flow: read bytes → SHA-256 → upload to Storage → INSERT documents.
    storage_path and file_hash are written to the DB but never returned.
    Duplicate (user_id, file_hash) → 409 duplicate_document.
    """
    if file.content_type not in _ALLOWED_MIME:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "invalid_file_type",
                    "message": f"Only PDF files are accepted. Got: {file.content_type}",
                }
            },
        )

    file_bytes = await file.read()
    file_size = len(file_bytes)
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    # Check for duplicate before touching storage (fast path).
    existing = (
        get_admin_client()
        .table("documents")
        .select("id")
        .eq("user_id", user_id)
        .eq("file_hash", file_hash)
        .execute()
    )
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": {
                    "code": "duplicate_document",
                    "message": "This file has already been uploaded.",
                    "details": {"existing_document_id": existing.data[0]["id"]},
                }
            },
        )

    doc_id = str(uuid.uuid4())
    storage_path = f"{user_id}/{doc_id}"

    # Upload to the private bucket first.
    try:
        get_admin_client().storage.from_(_BUCKET).upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": file.content_type or "application/pdf", "upsert": "false"},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": {"code": "storage_error", "message": "Failed to upload file to storage."}},
        ) from exc

    # Insert the documents row. Clean up storage if this fails.
    try:
        result = (
            get_admin_client()
            .table("documents")
            .insert({
                "id": doc_id,
                "user_id": user_id,
                "title": title,
                "original_file_name": file.filename or "upload.pdf",
                "storage_path": storage_path,   # stored, never returned
                "file_type": file.content_type or "application/pdf",
                "file_size_bytes": file_size,
                "file_hash": file_hash,          # stored, never returned
                "status": "uploaded",
            })
            .execute()
        )
    except Exception as exc:
        # Roll back the storage upload to avoid orphaned objects.
        try:
            get_admin_client().storage.from_(_BUCKET).remove([storage_path])
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "db_error", "message": "Failed to create document record."}},
        ) from exc

    if not result.data:
        get_admin_client().storage.from_(_BUCKET).remove([storage_path])
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "db_error", "message": "Failed to create document record."}},
        )

    return _to_doc_response(result.data[0])


# ─── GET /v1/documents ────────────────────────────────────────────────────────

@router.get("", response_model=DocumentListResponse)
async def list_documents(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    user_id: str = Depends(get_current_user_id),
):
    """Return a paginated list of the caller's non-deleted documents (§6.3)."""
    offset = (page - 1) * page_size

    result = (
        get_admin_client()
        .table("documents")
        .select("*", count="exact")
        .eq("user_id", user_id)
        .neq("status", "deleted")
        .order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
        .execute()
    )

    return DocumentListResponse(
        data=[_to_doc_response(row) for row in (result.data or [])],
        page=page,
        page_size=page_size,
        total=result.count or 0,
    )


# ─── GET /v1/documents/{document_id} ─────────────────────────────────────────

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Return metadata for a single document owned by the caller (§6.3)."""
    row = _get_own_document(document_id, user_id)
    if row["status"] == "deleted":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Document not found."}},
        )
    return _to_doc_response(row)


# ─── DELETE /v1/documents/{document_id} ──────────────────────────────────────

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Soft-delete a document by setting status = 'deleted' (§6.3).

    Does NOT remove the row or the Storage object — that is an admin operation.
    Idempotent: already-deleted documents still return 204.
    Non-owner IDs return 404 without revealing whether the ID exists.
    """
    _get_own_document(document_id, user_id)   # raises 404 if not owned

    get_admin_client().table("documents").update({"status": "deleted"}).eq("id", document_id).eq(
        "user_id", user_id
    ).execute()
