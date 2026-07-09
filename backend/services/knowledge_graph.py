"""Knowledge graph pipeline: topic extraction + document/topic similarity.

Phase 1.5 (documents/knowledge_graph_addendum.pdf, §7.7). Fires as the last
step of document processing, after documents.status = 'ready'. A failure here
must never revert that status — see build_knowledge_graph's top-level catch.

Deviates from the addendum in provider choice only: this project has no
Anthropic client, so topic extraction uses the same Groq model already used
for RAG generation (services/generation.py), not claude-sonnet-4-6.
"""
import asyncio
import json
import logging
import math
import re

from groq import AsyncGroq

from config import get_settings
from database import get_admin_client

logger = logging.getLogger(__name__)

_MODEL = "llama-3.3-70b-versatile"
_TOPIC_RELATED_THRESHOLD = 0.65
_DOC_SIMILAR_THRESHOLD = 0.50

_SYSTEM_PROMPT = """\
You are a topic-extraction assistant for an academic study platform.
Return ONLY a valid JSON array. No markdown fences. No preamble.
Each element must have exactly these keys:
"name" --- canonical topic name, 2-5 words, Title Case
"description" --- one sentence explaining the topic
"subject_area" --- exactly one of: Systems, CS Core, Networks, Data, AI/ML
"relevance" --- float 0.0-1.0, how central this topic is to the chunks

Return between 3 and 6 topics. Order by descending relevance.\
"""


def _user_prompt(chunks_text: str) -> str:
    return (
        "Extract the most important academic topics from the following "
        "text chunks taken from a student's study document.\n\n"
        f"<chunks>\n{chunks_text}\n</chunks>"
    )


async def _call_groq(system: str, user: str) -> str:
    client = AsyncGroq(api_key=get_settings().groq_api_key)
    completion = await client.chat.completions.create(
        model=_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=512,
        temperature=0.1,
    )
    return completion.choices[0].message.content or ""


def _parse_topics_json(raw: str) -> list[dict]:
    text = re.sub(r"^```(?:json)?|```$", "", raw.strip(), flags=re.MULTILINE).strip()
    data = json.loads(text)
    if not isinstance(data, list):
        raise ValueError("Expected a JSON array of topics.")
    return data


async def extract_topics(chunks: list[dict]) -> list[dict]:
    """Call the LLM once (retry once on parse failure) and return 3-6 topic dicts."""
    chunks_text = "\n\n---\n\n".join(c["content"] for c in chunks)
    user_prompt = _user_prompt(chunks_text)

    raw = await _call_groq(_SYSTEM_PROMPT, user_prompt)
    try:
        topics = _parse_topics_json(raw)
    except (json.JSONDecodeError, ValueError):
        raw = await _call_groq(
            _SYSTEM_PROMPT + "\n\nReturn ONLY the JSON array. No prose, no markdown fences.",
            user_prompt,
        )
        topics = _parse_topics_json(raw)  # let this raise; caller logs and skips

    cleaned = []
    for t in topics:
        name = (t.get("name") or "").strip()
        if not name:
            continue
        cleaned.append({
            "name": name,
            "description": t.get("description"),
            "subject_area": t.get("subject_area"),
            "relevance": float(t.get("relevance", 0.5)),
        })
    return cleaned[:6]


# ─── vector helpers ────────────────────────────────────────────────────────
# pgvector columns come back from postgrest as "[x,y,...]" string literals.

def _parse_vector(value) -> list[float]:
    if isinstance(value, list):
        return [float(v) for v in value]
    text = (value or "").strip().strip("[]")
    return [float(v) for v in text.split(",")] if text else []


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _average_vector(vectors: list[list[float]]) -> list[float]:
    dim = len(vectors[0])
    sums = [0.0] * dim
    for v in vectors:
        for i, val in enumerate(v):
            sums[i] += val
    return [s / len(vectors) for s in sums]


async def _shared_topic_ids(db, doc_a: str, doc_b: str) -> list[str]:
    result = await asyncio.to_thread(
        lambda: db.table("document_topics")
        .select("document_id, topic_id")
        .in_("document_id", [doc_a, doc_b])
        .execute()
    )
    rows = result.data or []
    topics_a = {r["topic_id"] for r in rows if r["document_id"] == doc_a}
    topics_b = {r["topic_id"] for r in rows if r["document_id"] == doc_b}
    return list(topics_a & topics_b)


async def _build(document_id: str, user_id: str) -> None:
    from services.embeddings import embed_text, format_vector

    db = get_admin_client()

    # ── Step 1: top-10 chunks + topic extraction ──────────────────────────
    chunks_result = await asyncio.to_thread(
        lambda: db.table("document_chunks")
        .select("content")
        .eq("document_id", document_id)
        .order("chunk_index")
        .limit(10)
        .execute()
    )
    chunks = chunks_result.data or []
    if not chunks:
        return

    topics = await extract_topics(chunks)
    if not topics:
        return

    # ── Step 2: upsert topics ──────────────────────────────────────────────
    topic_rows = [
        {
            "user_id": user_id,
            "name": t["name"],
            "description": t.get("description"),
            "subject_area": t.get("subject_area"),
        }
        for t in topics
    ]
    upserted = await asyncio.to_thread(
        lambda: db.table("topics").upsert(topic_rows, on_conflict="user_id,name").execute()
    )
    topic_id_by_name = {row["name"]: row["id"] for row in (upserted.data or [])}

    # ── Step 3: upsert document_topics edges ───────────────────────────────
    doc_topic_rows = [
        {
            "document_id": document_id,
            "topic_id": topic_id_by_name[t["name"]],
            "relevance_score": t["relevance"],
            "mention_count": 1,
        }
        for t in topics
        if t["name"] in topic_id_by_name
    ]
    if doc_topic_rows:
        await asyncio.to_thread(
            lambda: db.table("document_topics")
            .upsert(doc_topic_rows, on_conflict="document_id,topic_id")
            .execute()
        )

    # ── Step 4: embed topics with a NULL embedding ─────────────────────────
    unembedded = await asyncio.to_thread(
        lambda: db.table("topics")
        .select("id, name")
        .eq("user_id", user_id)
        .is_("embedding", "null")
        .execute()
    )
    for row in unembedded.data or []:
        embedding = await embed_text(row["name"])
        await asyncio.to_thread(
            lambda r=row, e=embedding: db.table("topics")
            .update({"embedding": format_vector(e)})
            .eq("id", r["id"])
            .execute()
        )

    # ── Step 5: topic-topic similarity (new topics vs. all of this user's) ─
    all_topics_result = await asyncio.to_thread(
        lambda: db.table("topics")
        .select("id, embedding")
        .eq("user_id", user_id)
        .not_.is_("embedding", "null")
        .execute()
    )
    embeddings_by_id = {
        row["id"]: _parse_vector(row["embedding"]) for row in (all_topics_result.data or [])
    }
    new_topic_ids = set(topic_id_by_name.values())

    topic_conn_rows = []
    seen_pairs = set()
    for new_id in new_topic_ids:
        if new_id not in embeddings_by_id:
            continue
        for other_id, other_emb in embeddings_by_id.items():
            if other_id == new_id:
                continue
            pair = tuple(sorted((new_id, other_id)))
            if pair in seen_pairs:
                continue
            seen_pairs.add(pair)
            sim = _cosine_similarity(embeddings_by_id[new_id], other_emb)
            if sim >= _TOPIC_RELATED_THRESHOLD:
                topic_conn_rows.append({
                    "user_id": user_id,
                    "source_topic_id": pair[0],
                    "target_topic_id": pair[1],
                    "relationship": "related",
                    "strength": sim,
                })
    if topic_conn_rows:
        await asyncio.to_thread(
            lambda: db.table("topic_connections")
            .upsert(topic_conn_rows, on_conflict="user_id,source_topic_id,target_topic_id")
            .execute()
        )

    # ── Step 6 + 7: document-document similarity + shared topic snapshot ──
    new_chunks_result = await asyncio.to_thread(
        lambda: db.table("document_chunks").select("embedding").eq("document_id", document_id).execute()
    )
    new_doc_embeddings = [_parse_vector(r["embedding"]) for r in (new_chunks_result.data or [])]
    if not new_doc_embeddings:
        return
    new_doc_avg = _average_vector(new_doc_embeddings)

    other_docs_result = await asyncio.to_thread(
        lambda: db.table("documents")
        .select("id")
        .eq("user_id", user_id)
        .eq("status", "ready")
        .neq("id", document_id)
        .execute()
    )

    doc_conn_rows = []
    for other in other_docs_result.data or []:
        other_id = other["id"]
        other_chunks_result = await asyncio.to_thread(
            lambda oid=other_id: db.table("document_chunks").select("embedding").eq("document_id", oid).execute()
        )
        other_embeddings = [_parse_vector(r["embedding"]) for r in (other_chunks_result.data or [])]
        if not other_embeddings:
            continue

        sim = _cosine_similarity(new_doc_avg, _average_vector(other_embeddings))
        if sim < _DOC_SIMILAR_THRESHOLD:
            continue

        source_id, target_id = sorted((document_id, other_id))
        shared_topic_ids = await _shared_topic_ids(db, document_id, other_id)
        doc_conn_rows.append({
            "user_id": user_id,
            "source_doc_id": source_id,
            "target_doc_id": target_id,
            "similarity_score": sim,
            "shared_topic_ids": shared_topic_ids,
            "connection_type": "semantic",
        })

    if doc_conn_rows:
        await asyncio.to_thread(
            lambda: db.table("document_connections")
            .upsert(doc_conn_rows, on_conflict="source_doc_id,target_doc_id")
            .execute()
        )


async def build_knowledge_graph(document_id: str, user_id: str) -> None:
    """Entry point called from the document-processing pipeline hook.

    Never raises: a knowledge-graph failure must not revert documents.status.
    """
    try:
        await _build(document_id, user_id)
    except Exception:
        logger.exception("Knowledge graph build failed for document %s", document_id)
