"""Quiz question generation via Groq — Phase 2 learning tools."""
from __future__ import annotations

import asyncio
import json
import re

from groq import AsyncGroq

from config import get_settings
from database import get_admin_client

_MODEL = "llama-3.3-70b-versatile"

# How many chunks of context to feed the LLM per scope.
_TOPIC_CONTEXT_BUDGET = 20
_TOPIC_MAX_DOCS = 5
_DOCUMENT_CONTEXT_LIMIT = 15

_SYSTEM_PROMPT = """\
You are a quiz-writing assistant for an academic study platform.
Return ONLY a valid JSON array. No markdown fences. No preamble.
Each element must have exactly these keys:
"question_text" --- the question, self-contained (no "see above")
"question_type" --- exactly one of: mcq, true_false, fill_blank, short_answer
"options" --- for "mcq" only: a JSON object {"choices": ["A", "B", "C", "D"]} \
with 4 plausible choices, one of which is the correct_answer verbatim. \
For every other question_type, this must be null.
"correct_answer" --- the exact correct answer as a string. For true_false, \
use "True" or "False". For mcq, must exactly match one of the choices.
"explanation" --- one sentence explaining why the answer is correct.

Base every question strictly on the provided study material. Do not invent facts.\
"""


def _user_prompt(context_text: str, question_count: int, difficulty: str | None) -> str:
    difficulty_line = f"Target difficulty: {difficulty}.\n" if difficulty else ""
    return (
        f"Write exactly {question_count} quiz questions from the study material below. "
        "Use a mix of question types unless the material only supports one kind.\n"
        f"{difficulty_line}\n"
        f"<material>\n{context_text}\n</material>"
    )


async def _call_groq(system: str, user: str) -> str:
    client = AsyncGroq(api_key=get_settings().groq_api_key)
    completion = await client.chat.completions.create(
        model=_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=2048,
        temperature=0.2,
    )
    return completion.choices[0].message.content or ""


def _parse_questions_json(raw: str) -> list[dict]:
    text = re.sub(r"^```(?:json)?|```$", "", raw.strip(), flags=re.MULTILINE).strip()
    data = json.loads(text)
    if not isinstance(data, list):
        raise ValueError("Expected a JSON array of questions.")
    return data


_VALID_TYPES = frozenset({"mcq", "true_false", "fill_blank", "short_answer"})


def _clean_question(q: dict) -> dict | None:
    question_text = (q.get("question_text") or "").strip()
    question_type = q.get("question_type")
    correct_answer = q.get("correct_answer")
    if not question_text or question_type not in _VALID_TYPES or not correct_answer:
        return None
    options = q.get("options") if question_type == "mcq" else None
    return {
        "question_text": question_text,
        "question_type": question_type,
        "options": options,
        "correct_answer": str(correct_answer).strip(),
        "explanation": q.get("explanation"),
    }


async def generate_quiz_questions(
    context_text: str, question_count: int, difficulty: str | None
) -> list[dict]:
    """Call the LLM once (retry once on parse failure) and return cleaned question dicts."""
    user_prompt = _user_prompt(context_text, question_count, difficulty)

    raw = await _call_groq(_SYSTEM_PROMPT, user_prompt)
    try:
        questions = _parse_questions_json(raw)
    except (json.JSONDecodeError, ValueError):
        raw = await _call_groq(
            _SYSTEM_PROMPT + "\n\nReturn ONLY the JSON array. No prose, no markdown fences.",
            user_prompt,
        )
        questions = _parse_questions_json(raw)  # let this raise; caller maps to 503

    cleaned = [c for c in (_clean_question(q) for q in questions) if c is not None]
    return cleaned[:question_count]


# ─── context retrieval ─────────────────────────────────────────────────────

def _format_chunks(chunks: list[dict]) -> str:
    return "\n\n---\n\n".join(
        f"[Pages {c.get('start_page')}–{c.get('end_page')}]\n{c['content']}" for c in chunks
    )


async def topic_scoped_document_ids(user_id: str, topic_id: str) -> list[str]:
    """Document ids (for this user) covering topic_id, ordered by relevance_score desc."""
    db = get_admin_client()

    user_docs = await asyncio.to_thread(
        lambda: db.table("documents").select("id").eq("user_id", user_id).execute()
    )
    doc_ids = [d["id"] for d in (user_docs.data or [])]
    if not doc_ids:
        return []

    covers = await asyncio.to_thread(
        lambda: db.table("document_topics")
        .select("document_id, relevance_score")
        .eq("topic_id", topic_id)
        .in_("document_id", doc_ids)
        .order("relevance_score", desc=True)
        .execute()
    )
    return [row["document_id"] for row in (covers.data or [])]


async def gather_topic_scoped_context(user_id: str, topic_id: str) -> str:
    """Build quiz context from every document the user owns that covers topic_id,
    weighted by relevance_score (§ Quiz generation — topic-scoped retrieval).
    """
    db = get_admin_client()

    user_docs = await asyncio.to_thread(
        lambda: db.table("documents").select("id").eq("user_id", user_id).execute()
    )
    doc_ids = [d["id"] for d in (user_docs.data or [])]
    if not doc_ids:
        return ""

    covers_result = await asyncio.to_thread(
        lambda: db.table("document_topics")
        .select("document_id, relevance_score")
        .eq("topic_id", topic_id)
        .in_("document_id", doc_ids)
        .order("relevance_score", desc=True)
        .execute()
    )
    rows = (covers_result.data or [])[:_TOPIC_MAX_DOCS]
    if not rows:
        return ""

    total_relevance = sum((r.get("relevance_score") or 0.1) for r in rows) or 1.0
    quotas = {
        r["document_id"]: max(2, round(_TOPIC_CONTEXT_BUDGET * (r.get("relevance_score") or 0.1) / total_relevance))
        for r in rows
    }

    all_chunks: list[dict] = []
    for doc_id, quota in quotas.items():
        chunks_result = await asyncio.to_thread(
            lambda d=doc_id, q=quota: db.table("document_chunks")
            .select("content, start_page, end_page")
            .eq("document_id", d)
            .order("chunk_index")
            .limit(q)
            .execute()
        )
        all_chunks.extend(chunks_result.data or [])

    return _format_chunks(all_chunks)


async def gather_document_scoped_context(document_id: str) -> str:
    """Fall back to the top chunks of a single document.

    Deviates from a literal match_chunks call: quiz generation has no natural
    query text to embed (unlike RAG chat), so this pulls the first N chunks by
    chunk_index directly — the same approach services/knowledge_graph.py uses
    for topic extraction, which has the identical "no query" problem.
    """
    db = get_admin_client()
    chunks_result = await asyncio.to_thread(
        lambda: db.table("document_chunks")
        .select("content, start_page, end_page")
        .eq("document_id", document_id)
        .order("chunk_index")
        .limit(_DOCUMENT_CONTEXT_LIMIT)
        .execute()
    )
    return _format_chunks(chunks_result.data or [])
