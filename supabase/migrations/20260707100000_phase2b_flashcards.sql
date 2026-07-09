-- =============================================================================
-- AI Scholar — Phase 2b: Flashcards (fast-follow to Phase 2 Learning Tools)
-- Adds a single flashcards table. No existing table is modified.
-- =============================================================================


-- =============================================================================
-- 1. flashcards
-- =============================================================================

CREATE TABLE IF NOT EXISTS flashcards (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    document_id        UUID REFERENCES documents(id) ON DELETE SET NULL,
    topic_id           UUID REFERENCES topics(id) ON DELETE SET NULL,
    front              TEXT NOT NULL,
    back               TEXT NOT NULL,
    is_known           BOOLEAN NOT NULL DEFAULT false,
    last_reviewed_at   TIMESTAMPTZ,
    created_at         TIMESTAMPTZ DEFAULT now(),
    CHECK (document_id IS NOT NULL OR topic_id IS NOT NULL)
);


-- =============================================================================
-- 2. Row-Level Security (Pattern A — direct user_id column)
-- =============================================================================

ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS own_flashcards ON flashcards;
CREATE POLICY own_flashcards ON flashcards
    FOR ALL USING     (auth.uid() = user_id)
    WITH CHECK        (auth.uid() = user_id);


-- =============================================================================
-- 3. Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_flashcards_user      ON flashcards (user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_document   ON flashcards (document_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_topic      ON flashcards (topic_id);
