"""Background tasks (run via FastAPI BackgroundTasks after the HTTP response is sent)."""
import asyncio
import logging

from database import get_admin_client

logger = logging.getLogger(__name__)


async def process_document(document_id: str, file_bytes: bytes, reset_existing: bool = False) -> None:
    """PDF → pages → chunks → Gemini embeddings → Supabase.

    Status transitions: uploaded → processing → ready | failed
    """
    from services.pdf_processor import extract_pages, chunk_pages
    from services.embeddings import embed_batch, format_vector

    db = get_admin_client()

    try:
        # ── 1. Mark as processing ──────────────────────────────────────────
        db.table("documents").update({"status": "processing"}).eq("id", document_id).execute()

        if reset_existing:
            await asyncio.to_thread(
                lambda: db.table("document_chunks").delete().eq("document_id", document_id).execute()
            )
            await asyncio.to_thread(
                lambda: db.table("document_pages").delete().eq("document_id", document_id).execute()
            )

        # ── 2. Extract pages (CPU/IO → thread) ────────────────────────────
        pages = await asyncio.to_thread(extract_pages, file_bytes)
        if not pages:
            raise ValueError("No extractable text found in the PDF.")

        # ── 3. Insert document_pages ───────────────────────────────────────
        pages_rows = [
            {"document_id": document_id, "page_number": pnum, "content": text}
            for pnum, text in pages
        ]
        await asyncio.to_thread(
            lambda r=pages_rows: db.table("document_pages").insert(r).execute()
        )

        # ── 4. Chunk ───────────────────────────────────────────────────────
        chunks = await asyncio.to_thread(chunk_pages, pages)
        if not chunks:
            raise ValueError("No chunks produced from the document.")

        # ── 5. Embed in batches of 50 ─────────────────────────────────────
        all_embeddings: list[list[float]] = []
        for i in range(0, len(chunks), 50):
            batch_texts = [c["content"] for c in chunks[i : i + 50]]
            batch_embs = await embed_batch(batch_texts)
            all_embeddings.extend(batch_embs)

        # ── 6. Insert document_chunks in batches of 100 ───────────────────
        for i in range(0, len(chunks), 100):
            batch_c = chunks[i : i + 100]
            batch_e = all_embeddings[i : i + 100]
            rows = [
                {
                    "document_id": document_id,
                    "chunk_index": c["chunk_index"],
                    "content": c["content"],
                    "token_count": c["token_count"],
                    "start_page": c["start_page"],
                    "end_page": c["end_page"],
                    "embedding": format_vector(emb),
                    "metadata": {},
                }
                for c, emb in zip(batch_c, batch_e)
            ]
            await asyncio.to_thread(
                lambda r=rows: db.table("document_chunks").insert(r).execute()
            )

        # ── 7. Mark as ready ───────────────────────────────────────────────
        db.table("documents").update({
            "status": "ready",
            "total_pages": len(pages),
            "error_message": None,
        }).eq("id", document_id).execute()

    except Exception as exc:
        logger.exception("Processing failed for document %s", document_id)
        try:
            db.table("documents").update({
                "status": "failed",
                "error_message": f"Processing failed: {type(exc).__name__}: {exc}",
            }).eq("id", document_id).execute()
        except Exception:
            pass
