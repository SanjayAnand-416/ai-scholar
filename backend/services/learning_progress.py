"""learning_progress upserts and weak-topic/prerequisite detection — Phase 2."""
import asyncio
import logging

from database import get_admin_client
from services.quiz_generation import topic_scoped_document_ids

logger = logging.getLogger(__name__)

_WEAK_THRESHOLD = 60


async def _fallback_topic_for_document(db, document_id: str) -> str:
    """Best single topic label for a document-scoped quiz (highest relevance_score)."""
    result = await asyncio.to_thread(
        lambda: db.table("document_topics")
        .select("topic_id, relevance_score, topics(name)")
        .eq("document_id", document_id)
        .order("relevance_score", desc=True)
        .limit(1)
        .execute()
    )
    rows = result.data or []
    if rows and rows[0].get("topics"):
        return rows[0]["topics"]["name"]
    return "General"


async def record_quiz_completion(user_id: str, quiz: dict, score: int, total_questions: int) -> None:
    """Upsert learning_progress rows for the documents this quiz covered.

    A topic-scoped quiz may span multiple documents (that's the point of the
    knowledge-graph-driven quiz generation) — one row is upserted per document,
    all sharing the same topic name and score-derived percentage.
    """
    db = get_admin_client()
    progress_percentage = round(100 * score / total_questions) if total_questions else 0

    try:
        if quiz.get("topic_id"):
            topic_result = await asyncio.to_thread(
                lambda: db.table("topics").select("name").eq("id", quiz["topic_id"]).limit(1).execute()
            )
            if not topic_result.data:
                return
            topic_name = topic_result.data[0]["name"]
            document_ids = await topic_scoped_document_ids(user_id, quiz["topic_id"])
        elif quiz.get("document_id"):
            document_ids = [quiz["document_id"]]
            topic_name = await _fallback_topic_for_document(db, quiz["document_id"])
        else:
            return

        if not document_ids:
            return

        rows = [
            {
                "user_id": user_id,
                "document_id": doc_id,
                "topic": topic_name,
                "progress_percentage": progress_percentage,
                "last_studied_at": "now()",
            }
            for doc_id in document_ids
        ]
        await asyncio.to_thread(
            lambda: db.table("learning_progress")
            .upsert(rows, on_conflict="user_id,document_id,topic")
            .execute()
        )
    except Exception:
        logger.exception("Failed to record learning_progress for quiz %s", quiz.get("id"))


# ─── weak-topic + prerequisite detection ───────────────────────────────────

async def get_weak_topics(user_id: str) -> list[dict]:
    db = get_admin_client()

    weak_result = await asyncio.to_thread(
        lambda: db.table("learning_progress")
        .select("document_id, topic, progress_percentage")
        .eq("user_id", user_id)
        .lt("progress_percentage", _WEAK_THRESHOLD)
        .execute()
    )
    weak_rows = weak_result.data or []
    if not weak_rows:
        return []

    all_progress_result = await asyncio.to_thread(
        lambda: db.table("learning_progress").select("topic").eq("user_id", user_id).execute()
    )
    covered_topic_names = {r["topic"] for r in (all_progress_result.data or [])}

    weak_topic_names = list({r["topic"] for r in weak_rows})
    topics_result = await asyncio.to_thread(
        lambda: db.table("topics")
        .select("id, name")
        .eq("user_id", user_id)
        .in_("name", weak_topic_names)
        .execute()
    )
    topic_id_by_name = {t["name"]: t["id"] for t in (topics_result.data or [])}
    topic_ids = list(topic_id_by_name.values())

    prereq_by_source: dict[str, list[str]] = {}
    if topic_ids:
        prereq_result = await asyncio.to_thread(
            lambda: db.table("topic_connections")
            .select("source_topic_id, target_topic_id")
            .eq("user_id", user_id)
            .eq("relationship", "prerequisite")
            .in_("source_topic_id", topic_ids)
            .execute()
        )
        for row in prereq_result.data or []:
            prereq_by_source.setdefault(row["source_topic_id"], []).append(row["target_topic_id"])

    target_ids = {tid for ids in prereq_by_source.values() for tid in ids}
    target_name_by_id: dict[str, str] = {}
    if target_ids:
        target_topics_result = await asyncio.to_thread(
            lambda: db.table("topics").select("id, name").in_("id", list(target_ids)).execute()
        )
        target_name_by_id = {t["id"]: t["name"] for t in (target_topics_result.data or [])}

    items = []
    for row in weak_rows:
        topic_id = topic_id_by_name.get(row["topic"])
        prereq_ids = prereq_by_source.get(topic_id, []) if topic_id else []
        uncovered_prereq_ids = [
            tid for tid in prereq_ids if target_name_by_id.get(tid) not in covered_topic_names
        ]
        items.append(
            {
                "topic": row["topic"],
                "document_id": row["document_id"],
                "progress_percentage": row["progress_percentage"],
                "prerequisite_topic_ids": uncovered_prereq_ids,
                "prerequisite_topic_names": [target_name_by_id[tid] for tid in uncovered_prereq_ids],
            }
        )
    return items
