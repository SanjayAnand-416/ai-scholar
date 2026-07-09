-- =============================================================================
-- AI Scholar — Phase 1.5: Knowledge Graph Extension
-- Source: documents/knowledge_graph_addendum.pdf (§7.4–7.6)
-- Zero-destructive bolt-on: adds 4 new tables, no existing table is modified.
--
-- Deviation from the addendum: topics.embedding is vector(768), not vector(1536).
-- This project's embedding model is Gemini text-embedding-004 (768-dim; see
-- 20260628120000_phase1_vector_768.sql), so topics.embedding must match
-- document_chunks.embedding's dimension for cosine comparisons to be valid.
-- =============================================================================


-- =============================================================================
-- 1. topics
-- =============================================================================

CREATE TABLE IF NOT EXISTS topics (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    description  TEXT,
    subject_area TEXT,
    embedding    extensions.vector(768),  -- nullable; set after extraction
    created_at   TIMESTAMPTZ DEFAULT now(),
    updated_at   TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, name)  -- idempotent upsert target
);

DROP TRIGGER IF EXISTS trg_topics_updated_at ON topics;
CREATE TRIGGER trg_topics_updated_at
    BEFORE UPDATE ON topics
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- 2. document_topics
-- =============================================================================

CREATE TABLE IF NOT EXISTS document_topics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    topic_id        UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    relevance_score FLOAT CHECK (relevance_score BETWEEN 0 AND 1),
    mention_count   INTEGER DEFAULT 1 CHECK (mention_count >= 1),
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE (document_id, topic_id)  -- idempotent upsert target
);


-- =============================================================================
-- 3. document_connections
-- =============================================================================

CREATE TABLE IF NOT EXISTS document_connections (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    source_doc_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    target_doc_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    similarity_score  FLOAT NOT NULL CHECK (similarity_score BETWEEN 0 AND 1),
    shared_topic_ids  UUID[] DEFAULT '{}',  -- snapshot; updated on re-analysis
    connection_type   TEXT NOT NULL CHECK (connection_type IN ('semantic', 'topic_overlap')),
    created_at        TIMESTAMPTZ DEFAULT now(),
    UNIQUE (source_doc_id, target_doc_id),
    CHECK (source_doc_id < target_doc_id)  -- A<->B stored once, ordered by PK
);


-- =============================================================================
-- 4. topic_connections
-- =============================================================================

CREATE TABLE IF NOT EXISTS topic_connections (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    source_topic_id  UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    target_topic_id  UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    relationship     TEXT NOT NULL CHECK (relationship IN ('prerequisite', 'related', 'subtopic')),
    strength         FLOAT CHECK (strength BETWEEN 0 AND 1),
    created_at       TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, source_topic_id, target_topic_id)
);


-- =============================================================================
-- 5. Row-Level Security
-- =============================================================================

ALTER TABLE topics               ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_topics       ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_connections  ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_connections     ENABLE ROW LEVEL SECURITY;

-- Pattern A (direct user_id column)
DROP POLICY IF EXISTS own_topics ON topics;
CREATE POLICY own_topics ON topics
    FOR ALL USING     (auth.uid() = user_id)
    WITH CHECK        (auth.uid() = user_id);

DROP POLICY IF EXISTS own_doc_connections ON document_connections;
CREATE POLICY own_doc_connections ON document_connections
    FOR ALL USING     (auth.uid() = user_id)
    WITH CHECK        (auth.uid() = user_id);

DROP POLICY IF EXISTS own_topic_connections ON topic_connections;
CREATE POLICY own_topic_connections ON topic_connections
    FOR ALL USING     (auth.uid() = user_id)
    WITH CHECK        (auth.uid() = user_id);

-- Pattern B (ownership via foreign-key chain)
DROP POLICY IF EXISTS own_document_topics ON document_topics;
CREATE POLICY own_document_topics ON document_topics
    FOR ALL USING (
        document_id IN (SELECT id FROM documents WHERE user_id = auth.uid())
    )
    WITH CHECK (
        document_id IN (SELECT id FROM documents WHERE user_id = auth.uid())
    );


-- =============================================================================
-- 6. Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_topics_user            ON topics               (user_id);
CREATE INDEX IF NOT EXISTS idx_doc_topics_doc          ON document_topics      (document_id);
CREATE INDEX IF NOT EXISTS idx_doc_topics_topic        ON document_topics      (topic_id);
CREATE INDEX IF NOT EXISTS idx_doc_conn_user           ON document_connections (user_id);
CREATE INDEX IF NOT EXISTS idx_doc_conn_source         ON document_connections (source_doc_id);
CREATE INDEX IF NOT EXISTS idx_doc_conn_target         ON document_connections (target_doc_id);
CREATE INDEX IF NOT EXISTS idx_topic_conn_user         ON topic_connections    (user_id);
CREATE INDEX IF NOT EXISTS idx_topic_conn_source       ON topic_connections    (source_topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_conn_target       ON topic_connections    (target_topic_id);

-- HNSW vector index on topics.embedding is deliberately deferred: the addendum
-- (§7.6) recommends adding it only once >500 topic rows exist. Add it in a
-- follow-up migration when that threshold is reached:
--   CREATE INDEX idx_topics_embedding_hnsw ON topics USING hnsw (embedding extensions.vector_cosine_ops);
