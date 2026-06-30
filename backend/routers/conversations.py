"""Conversations and RAG-messages endpoints — §6.3."""
import asyncio
import logging
import time
from typing import Any, Callable, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
import httpx

from auth import get_current_user_id
from database import get_admin_client
from models import (
    ConversationCreate,
    ConversationListResponse,
    ConversationResponse,
    MessageCreate,
    MessageListResponse,
    MessageResponse,
    MessageSourceResponse,
    RAGResponse,
)

router = APIRouter(prefix="/v1/conversations", tags=["conversations"])
logger = logging.getLogger(__name__)


# ─── helpers ─────────────────────────────────────────────────────────────────

_TRANSIENT_DB_ERRORS = (
    httpx.RemoteProtocolError,
    httpx.ConnectError,
    httpx.ReadError,
    httpx.ReadTimeout,
    httpx.WriteError,
    httpx.WriteTimeout,
    httpx.PoolTimeout,
)


def _execute_db(call: Callable[[], Any], message: str = "Database service temporarily unavailable.") -> Any:
    for attempt in range(2):
        try:
            return call()
        except _TRANSIENT_DB_ERRORS as exc:
            if attempt == 0:
                time.sleep(0.2)
                continue
            logger.warning("Supabase request failed after retry: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={"error": {"code": "db_unavailable", "message": message}},
            ) from exc


def _to_conv(row: dict) -> ConversationResponse:
    return ConversationResponse(
        id=row["id"],
        document_id=row.get("document_id"),
        title=row.get("title"),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _get_own_conversation(conversation_id: str, user_id: str) -> dict:
    result = _execute_db(
        lambda: (
            get_admin_client()
            .table("conversations")
            .select("*")
            .eq("id", conversation_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Conversation not found."}},
        )
    return result.data[0]


def _build_message(row: dict, sources: list[dict]) -> MessageResponse:
    return MessageResponse(
        id=row["id"],
        role=row["role"],
        content=row["content"],
        created_at=row["created_at"],
        sources=[
            MessageSourceResponse(
                chunk_id=s.get("chunk_id"),
                document_id=s.get("document_id"),
                start_page=s.get("start_page"),
                end_page=s.get("end_page"),
                similarity_score=s.get("similarity_score"),
                rank=s.get("rank"),
            )
            for s in sources
        ],
    )


# ─── POST /v1/conversations ───────────────────────────────────────────────────

@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    body: ConversationCreate,
    user_id: str = Depends(get_current_user_id),
):
    payload: dict = {"user_id": user_id}
    if body.document_id:
        payload["document_id"] = str(body.document_id)
    if body.title:
        payload["title"] = body.title

    result = _execute_db(
        lambda: get_admin_client().table("conversations").insert(payload).execute(),
        "Failed to create conversation because the database is temporarily unavailable.",
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "db_error", "message": "Failed to create conversation."}},
        )
    return _to_conv(result.data[0])


# ─── GET /v1/conversations ────────────────────────────────────────────────────

@router.get("", response_model=ConversationListResponse)
async def list_conversations(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    user_id: str = Depends(get_current_user_id),
):
    offset = (page - 1) * page_size
    result = _execute_db(
        lambda: (
            get_admin_client()
            .table("conversations")
            .select("*", count="exact")
            .eq("user_id", user_id)
            .order("updated_at", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )
    )
    return ConversationListResponse(
        data=[_to_conv(r) for r in (result.data or [])],
        page=page,
        page_size=page_size,
        total=result.count or 0,
    )


# ─── GET /v1/conversations/{id}/messages ────────────────────────────────────

@router.get("/{conversation_id}/messages", response_model=MessageListResponse)
async def list_messages(
    conversation_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    user_id: str = Depends(get_current_user_id),
):
    _get_own_conversation(conversation_id, user_id)

    offset = (page - 1) * page_size
    msgs_result = _execute_db(
        lambda: (
            get_admin_client()
            .table("messages")
            .select("*", count="exact")
            .eq("conversation_id", conversation_id)
            .order("created_at")
            .range(offset, offset + page_size - 1)
            .execute()
        )
    )
    msgs = msgs_result.data or []

    # Fetch sources for all assistant messages in one query
    asst_ids = [m["id"] for m in msgs if m["role"] == "assistant"]
    sources_by_msg: dict[str, list[dict]] = {}
    if asst_ids:
        src_result = _execute_db(
            lambda: (
                get_admin_client()
                .table("message_sources")
                .select("message_id, chunk_id, similarity_score, rank, document_chunks(document_id, start_page, end_page)")
                .in_("message_id", asst_ids)
                .order("rank")
                .execute()
            )
        )
        for s in (src_result.data or []):
            chunk = s.get("document_chunks") or {}
            entry = {
                "chunk_id": s.get("chunk_id"),
                "document_id": chunk.get("document_id"),
                "start_page": chunk.get("start_page"),
                "end_page": chunk.get("end_page"),
                "similarity_score": s.get("similarity_score"),
                "rank": s.get("rank"),
            }
            sources_by_msg.setdefault(s["message_id"], []).append(entry)

    return MessageListResponse(
        data=[_build_message(m, sources_by_msg.get(m["id"], [])) for m in msgs],
        page=page,
        page_size=page_size,
        total=msgs_result.count or 0,
    )


# ─── POST /v1/conversations/{id}/messages ────────────────────────────────────

@router.post("/{conversation_id}/messages", response_model=RAGResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: str,
    body: MessageCreate,
    user_id: str = Depends(get_current_user_id),
):
    """Core RAG endpoint per §5.9.2 and §6.3.

    Flow: embed question → match_chunks → generate (Groq) → insert messages + sources.
    Returns 503 with error.code='llm_unavailable' if embedding or generation fails.
    """
    from services.embeddings import embed_text, format_vector
    from services.generation import generate_rag_answer

    conv = _get_own_conversation(conversation_id, user_id)

    # ── 1. Embed the question ─────────────────────────────────────────────────
    try:
        query_embedding = await embed_text(body.content)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": {"code": "llm_unavailable", "message": "Embedding service unavailable."}},
        ) from exc

    # ── 2. Retrieve relevant chunks via match_chunks RPC ──────────────────────
    doc_id = conv.get("document_id")
    rpc_params: dict = {
        "query_embedding": format_vector(query_embedding),
        "match_count": 5,
        "filter_user_id": user_id,
        "filter_doc_ids": [doc_id] if doc_id else None,
    }
    rpc_result = await asyncio.to_thread(
        lambda: _execute_db(
            lambda: get_admin_client().rpc("match_chunks", rpc_params).execute(),
            "Failed to retrieve document context because the database is temporarily unavailable.",
        )
    )
    chunks = rpc_result.data or []

    # ── 3. Generate answer ────────────────────────────────────────────────────
    try:
        answer = await generate_rag_answer(body.content, chunks)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": {"code": "llm_unavailable", "message": "Generation service unavailable."}},
        ) from exc

    # ── 4. Persist user message ───────────────────────────────────────────────
    user_msg_row = _execute_db(
        lambda: (
            get_admin_client()
            .table("messages")
            .insert({"conversation_id": conversation_id, "role": "user", "content": body.content})
            .execute()
        ),
        "Failed to save your message because the database is temporarily unavailable.",
    ).data[0]

    # ── 5. Persist assistant message ──────────────────────────────────────────
    asst_msg_row = _execute_db(
        lambda: (
            get_admin_client()
            .table("messages")
            .insert({"conversation_id": conversation_id, "role": "assistant", "content": answer})
            .execute()
        ),
        "Failed to save the assistant response because the database is temporarily unavailable.",
    ).data[0]

    # ── 6. Persist message_sources (one row per retrieved chunk) ──────────────
    if chunks:
        sources_rows = [
            {
                "message_id": asst_msg_row["id"],
                "chunk_id": c["id"],
                "similarity_score": c.get("similarity_score"),
                "rank": i + 1,
            }
            for i, c in enumerate(chunks)
        ]
        _execute_db(
            lambda: get_admin_client().table("message_sources").insert(sources_rows).execute(),
            "Failed to save response sources because the database is temporarily unavailable.",
        )

    # ── 7. Build response (sources resolved from RPC result, not a DB re-query) ─
    resolved_sources = [
        {
            "chunk_id": c["id"],
            "document_id": c.get("document_id"),
            "start_page": c.get("start_page"),
            "end_page": c.get("end_page"),
            "similarity_score": c.get("similarity_score"),
            "rank": i + 1,
        }
        for i, c in enumerate(chunks)
    ]

    # Touch conversation updated_at so list ordering reflects recent activity
    _execute_db(
        lambda: get_admin_client().table("conversations").update({"updated_at": "now()"}).eq("id", conversation_id).execute(),
        "Failed to update conversation activity because the database is temporarily unavailable.",
    )

    return RAGResponse(
        user_message=_build_message(user_msg_row, []),
        assistant_message=_build_message(asst_msg_row, resolved_sources),
    )
