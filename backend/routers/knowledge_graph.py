"""Knowledge graph endpoints — Phase 1.5 addendum §7.8."""
import asyncio
from collections import Counter
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status

from auth import get_current_user_id
from database import get_admin_client
from models import (
    GraphEdge,
    GraphNode,
    KnowledgeGraphResponse,
    RebuildResponse,
    SimilarDocumentItem,
    SimilarDocumentsListResponse,
)
from services.knowledge_graph import build_knowledge_graph

router = APIRouter(tags=["knowledge-graph"])


def _majority_subject(subjects: list[Optional[str]]) -> Optional[str]:
    present = [s for s in subjects if s]
    if not present:
        return None
    return Counter(present).most_common(1)[0][0]


# ─── GET /v1/knowledge-graph ──────────────────────────────────────────────

@router.get("/v1/knowledge-graph", response_model=KnowledgeGraphResponse)
async def get_knowledge_graph(user_id: str = Depends(get_current_user_id)):
    """Assemble the full per-user graph in one request (§7.8.1)."""
    db = get_admin_client()

    docs_result = await asyncio.to_thread(
        lambda: db.table("documents")
        .select("id, title, original_file_name, total_pages, status")
        .eq("user_id", user_id)
        .neq("status", "deleted")
        .execute()
    )
    documents = docs_result.data or []
    doc_ids = [d["id"] for d in documents]

    topics_result = await asyncio.to_thread(
        lambda: db.table("topics").select("id, name, subject_area").eq("user_id", user_id).execute()
    )
    topics = topics_result.data or []
    topic_by_id = {t["id"]: t for t in topics}

    covers_rows = []
    if doc_ids:
        covers_result = await asyncio.to_thread(
            lambda: db.table("document_topics")
            .select("document_id, topic_id, relevance_score")
            .in_("document_id", doc_ids)
            .execute()
        )
        covers_rows = covers_result.data or []

    similar_result = await asyncio.to_thread(
        lambda: db.table("document_connections")
        .select("source_doc_id, target_doc_id, similarity_score")
        .eq("user_id", user_id)
        .execute()
    )
    similar_rows = similar_result.data or []

    topic_conn_result = await asyncio.to_thread(
        lambda: db.table("topic_connections")
        .select("source_topic_id, target_topic_id, relationship, strength")
        .eq("user_id", user_id)
        .execute()
    )
    topic_conn_rows = topic_conn_result.data or []

    # Document subject = majority vote of its covered topics' subject_area (Appendix C.1)
    subjects_by_doc: dict[str, list[Optional[str]]] = {}
    doc_count_by_topic: Counter = Counter()
    for row in covers_rows:
        topic = topic_by_id.get(row["topic_id"])
        if topic:
            subjects_by_doc.setdefault(row["document_id"], []).append(topic.get("subject_area"))
            doc_count_by_topic[row["topic_id"]] += 1

    nodes = [
        GraphNode(
            id=d["id"],
            type="document",
            label=d.get("title") or d["original_file_name"],
            subject=_majority_subject(subjects_by_doc.get(d["id"], [])),
            metadata={"pages": d.get("total_pages"), "status": d["status"], "quiz_score": None},
        )
        for d in documents
    ] + [
        GraphNode(
            id=t["id"],
            type="topic",
            label=t["name"],
            subject=t.get("subject_area"),
            metadata={"doc_count": doc_count_by_topic.get(t["id"], 0)},
        )
        for t in topics
    ]

    edges = (
        [
            GraphEdge(source=r["document_id"], target=r["topic_id"], type="covers", strength=r.get("relevance_score"))
            for r in covers_rows
        ]
        + [
            GraphEdge(source=r["source_doc_id"], target=r["target_doc_id"], type="similar", strength=r.get("similarity_score"))
            for r in similar_rows
        ]
        + [
            GraphEdge(source=r["source_topic_id"], target=r["target_topic_id"], type=r["relationship"], strength=r.get("strength"))
            for r in topic_conn_rows
        ]
    )

    return KnowledgeGraphResponse(nodes=nodes, edges=edges)


# ─── POST /v1/knowledge-graph/rebuild ─────────────────────────────────────

@router.post("/v1/knowledge-graph/rebuild", response_model=RebuildResponse)
async def rebuild_knowledge_graph(
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
):
    """Queue re-analysis of all ready documents for the caller (§7.8.2)."""
    db = get_admin_client()
    ready_docs = await asyncio.to_thread(
        lambda: db.table("documents").select("id").eq("user_id", user_id).eq("status", "ready").execute()
    )
    doc_ids = [d["id"] for d in (ready_docs.data or [])]
    for doc_id in doc_ids:
        background_tasks.add_task(build_knowledge_graph, doc_id, user_id)

    return RebuildResponse(queued_count=len(doc_ids), estimated_seconds=len(doc_ids) * 5)


# ─── GET /v1/documents/{document_id}/similar ──────────────────────────────

@router.get("/v1/documents/{document_id}/similar", response_model=SimilarDocumentsListResponse)
async def get_similar_documents(
    document_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    user_id: str = Depends(get_current_user_id),
):
    """Documents connected to document_id, with their shared topic names (§7.8.3)."""
    db = get_admin_client()

    owned = await asyncio.to_thread(
        lambda: db.table("documents").select("id").eq("id", document_id).eq("user_id", user_id).limit(1).execute()
    )
    if not owned.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Document not found."}},
        )

    # Both directions must be checked — source_doc_id < target_doc_id is enforced at write time.
    conn_result = await asyncio.to_thread(
        lambda: db.table("document_connections")
        .select("source_doc_id, target_doc_id, similarity_score, shared_topic_ids")
        .eq("user_id", user_id)
        .or_(f"source_doc_id.eq.{document_id},target_doc_id.eq.{document_id}")
        .order("similarity_score", desc=True)
        .execute()
    )
    rows = conn_result.data or []
    total = len(rows)
    offset = (page - 1) * page_size
    page_rows = rows[offset : offset + page_size]

    other_ids = [
        r["target_doc_id"] if r["source_doc_id"] == document_id else r["source_doc_id"] for r in page_rows
    ]
    doc_by_id: dict[str, dict] = {}
    if other_ids:
        docs_result = await asyncio.to_thread(
            lambda: db.table("documents").select("id, title, original_file_name").in_("id", other_ids).execute()
        )
        doc_by_id = {d["id"]: d for d in (docs_result.data or [])}

    topic_ids = list({tid for r in page_rows for tid in (r.get("shared_topic_ids") or [])})
    topic_name_by_id: dict[str, str] = {}
    if topic_ids:
        topics_result = await asyncio.to_thread(
            lambda: db.table("topics").select("id, name").in_("id", topic_ids).execute()
        )
        topic_name_by_id = {t["id"]: t["name"] for t in (topics_result.data or [])}

    items = []
    for r in page_rows:
        other_id = r["target_doc_id"] if r["source_doc_id"] == document_id else r["source_doc_id"]
        doc = doc_by_id.get(other_id, {})
        items.append(
            SimilarDocumentItem(
                document_id=other_id,
                title=doc.get("title") or doc.get("original_file_name"),
                similarity_score=r["similarity_score"],
                shared_topics=[
                    topic_name_by_id[tid] for tid in (r.get("shared_topic_ids") or []) if tid in topic_name_by_id
                ],
            )
        )

    return SimilarDocumentsListResponse(data=items, page=page, page_size=page_size, total=total)
