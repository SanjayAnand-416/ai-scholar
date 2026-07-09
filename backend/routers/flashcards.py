"""Flashcard endpoints — Phase 2b fast-follow."""
import asyncio
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth import get_current_user_id
from database import get_admin_client
from models import (
    FlashcardCreate,
    FlashcardListResponse,
    FlashcardResponse,
    FlashcardReviewPatch,
)
from services.flashcard_generation import generate_flashcards
from services.quiz_generation import gather_document_scoped_context, gather_topic_scoped_context

router = APIRouter(tags=["flashcards"])


async def _get_own_flashcard(flashcard_id: str, user_id: str) -> dict:
    result = await asyncio.to_thread(
        lambda: get_admin_client()
        .table("flashcards")
        .select("*")
        .eq("id", flashcard_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Flashcard not found."}},
        )
    return result.data[0]


# ─── POST /v1/flashcards ────────────────────────────────────────────────────

@router.post("/v1/flashcards", response_model=FlashcardListResponse, status_code=status.HTTP_201_CREATED)
async def create_flashcards(body: FlashcardCreate, user_id: str = Depends(get_current_user_id)):
    db = get_admin_client()

    if body.topic_id:
        topic_result = await asyncio.to_thread(
            lambda: db.table("topics")
            .select("id")
            .eq("id", str(body.topic_id))
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if not topic_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "not_found", "message": "Topic not found."}},
            )
        context_text = await gather_topic_scoped_context(user_id, str(body.topic_id))
    else:
        doc_result = await asyncio.to_thread(
            lambda: db.table("documents")
            .select("id")
            .eq("id", str(body.document_id))
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if not doc_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "not_found", "message": "Document not found."}},
            )
        context_text = await gather_document_scoped_context(str(body.document_id))

    if not context_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "no_content", "message": "No document content available to build flashcards from."}},
        )

    try:
        cards = await generate_flashcards(context_text, body.card_count)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": {"code": "llm_unavailable", "message": "Flashcard generation service unavailable."}},
        ) from exc

    if not cards:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": {"code": "llm_unavailable", "message": "Failed to generate flashcards."}},
        )

    rows = [
        {
            "user_id": user_id,
            "document_id": str(body.document_id) if body.document_id else None,
            "topic_id": str(body.topic_id) if body.topic_id else None,
            "front": c["front"],
            "back": c["back"],
        }
        for c in cards
    ]
    inserted = await asyncio.to_thread(lambda: db.table("flashcards").insert(rows).execute())

    return FlashcardListResponse(
        data=[FlashcardResponse(**row) for row in inserted.data],
        page=1,
        page_size=len(inserted.data),
        total=len(inserted.data),
    )


# ─── GET /v1/flashcards ─────────────────────────────────────────────────────

@router.get("/v1/flashcards", response_model=FlashcardListResponse)
async def list_flashcards(
    document_id: Optional[str] = Query(default=None),
    topic_id: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    user_id: str = Depends(get_current_user_id),
):
    db = get_admin_client()
    offset = (page - 1) * page_size

    query = db.table("flashcards").select("*", count="exact").eq("user_id", user_id)
    if document_id:
        query = query.eq("document_id", document_id)
    if topic_id:
        query = query.eq("topic_id", topic_id)

    result = await asyncio.to_thread(
        lambda: query.order("created_at", desc=True).range(offset, offset + page_size - 1).execute()
    )
    return FlashcardListResponse(
        data=[FlashcardResponse(**row) for row in (result.data or [])],
        page=page,
        page_size=page_size,
        total=result.count or 0,
    )


# ─── GET /v1/flashcards/{flashcard_id} ──────────────────────────────────────

@router.get("/v1/flashcards/{flashcard_id}", response_model=FlashcardResponse)
async def get_flashcard(flashcard_id: str, user_id: str = Depends(get_current_user_id)):
    row = await _get_own_flashcard(flashcard_id, user_id)
    return FlashcardResponse(**row)


# ─── PATCH /v1/flashcards/{flashcard_id}/review ─────────────────────────────

@router.patch("/v1/flashcards/{flashcard_id}/review", response_model=FlashcardResponse)
async def review_flashcard(
    flashcard_id: str, body: FlashcardReviewPatch, user_id: str = Depends(get_current_user_id)
):
    db = get_admin_client()
    await _get_own_flashcard(flashcard_id, user_id)

    result = await asyncio.to_thread(
        lambda: db.table("flashcards")
        .update({"is_known": body.is_known, "last_reviewed_at": "now()"})
        .eq("id", flashcard_id)
        .execute()
    )
    return FlashcardResponse(**result.data[0])


# ─── DELETE /v1/flashcards/{flashcard_id} ───────────────────────────────────

@router.delete("/v1/flashcards/{flashcard_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_flashcard(flashcard_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_admin_client()
    await _get_own_flashcard(flashcard_id, user_id)
    await asyncio.to_thread(lambda: db.table("flashcards").delete().eq("id", flashcard_id).execute())
