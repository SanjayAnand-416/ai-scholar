-- ==========================================================================
-- AI Scholar — Phase 1 deviation: change embedding dimension 1536 → 768
-- Embedding model: Gemini text-embedding-004 (768 dims)
-- Run AFTER the Phase 0 migration. Table is empty at this point — safe.
-- ==========================================================================

-- 1. Drop the HNSW index (depends on the embedding column type)
DROP INDEX IF EXISTS idx_chunks_embedding_hnsw;

-- 2. Swap the embedding column dimension.
--    table is empty here, so no data is lost.
ALTER TABLE document_chunks DROP COLUMN IF EXISTS embedding;
ALTER TABLE document_chunks ADD COLUMN embedding extensions.vector(768) NOT NULL;

-- 3. Drop the old match_chunks overload (VECTOR(1536) signature)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS sig
    FROM pg_proc
    WHERE proname = 'match_chunks'
      AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
  END LOOP;
END;
$$;

-- 4. Recreate match_chunks with VECTOR(768) — Gemini text-embedding-004
CREATE OR REPLACE FUNCTION match_chunks(
    query_embedding  extensions.vector(768),
    match_count      INTEGER,
    filter_user_id   UUID,
    filter_doc_ids   UUID[] DEFAULT NULL
)
RETURNS TABLE (
    id               UUID,
    document_id      UUID,
    content          TEXT,
    start_page       INTEGER,
    end_page         INTEGER,
    metadata         JSONB,
    similarity_score FLOAT
)
LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.content,
        dc.start_page,
        dc.end_page,
        dc.metadata,
        1 - (dc.embedding <=> query_embedding) AS similarity_score
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE d.user_id = filter_user_id
      AND (filter_doc_ids IS NULL OR dc.document_id = ANY(filter_doc_ids))
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 5. Recreate HNSW index for 768-dim cosine similarity
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw
    ON document_chunks USING hnsw (embedding extensions.vector_cosine_ops);
