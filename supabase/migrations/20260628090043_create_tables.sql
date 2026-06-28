-- =============================================================================
-- AI Scholar — PostgreSQL / Supabase Schema
-- Source: AI_Scholar_Design_Document (Unified, Reconciled Edition)
-- Run once against a fresh Supabase project (Postgres + pgvector).
-- Execute top-to-bottom; all objects are defined before they are referenced.
-- =============================================================================


-- =============================================================================
-- 1. Extensions
-- =============================================================================

-- Install pgvector into the extensions schema (Supabase CLI convention).
-- All vector types and operator classes are therefore extensions.vector(N)
-- and extensions.vector_*_ops throughout this file.
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;


-- =============================================================================
-- 2. Shared Functions (must exist before any trigger references them)
-- =============================================================================

-- Auto-create a profile row whenever a new auth user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
    RETURN NEW;
END;
$$;

-- Generic updated_at trigger, reused by every table that has the column
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


-- =============================================================================
-- 3. Phase 0 — Identity and Document Foundation
-- =============================================================================

-- Phase 0: profiles
CREATE TABLE IF NOT EXISTS profiles (
    id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name       TEXT,
    email           TEXT,
    avatar_url      TEXT,
    college_name    TEXT,
    degree          TEXT,
    branch          TEXT,
    graduation_year SMALLINT,
    career_goal     TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Phase 0: documents
CREATE TABLE IF NOT EXISTS documents (
    id                 UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title              TEXT,
    original_file_name TEXT    NOT NULL,
    storage_path       TEXT    NOT NULL,
    file_type          TEXT    NOT NULL DEFAULT 'application/pdf',
    file_size_bytes    BIGINT,
    file_hash          TEXT    NOT NULL,  -- SHA-256
    status             TEXT    NOT NULL DEFAULT 'uploaded'
                               CHECK (status IN ('uploaded','processing','ready','failed','deleted')),
    total_pages        INTEGER,
    error_message      TEXT,
    created_at         TIMESTAMPTZ DEFAULT now(),
    updated_at         TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, file_hash)  -- blocks duplicate uploads per user
);

DROP TRIGGER IF EXISTS trg_documents_updated_at ON documents;
CREATE TRIGGER trg_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- 4. Phase 1 — RAG Pipeline and Cited Chat
-- =============================================================================

-- Phase 1: document_pages
CREATE TABLE IF NOT EXISTS document_pages (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID    NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    content     TEXT    NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE (document_id, page_number)
);

-- Phase 1: document_chunks (core RAG — must come after document_pages)
CREATE TABLE IF NOT EXISTS document_chunks (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID    NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content     TEXT    NOT NULL,
    token_count INTEGER,
    start_page  INTEGER NOT NULL,
    end_page    INTEGER NOT NULL,
    embedding   extensions.vector(1536) NOT NULL,  -- text-embedding-3-small
    metadata    JSONB   DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE (document_id, chunk_index),
    FOREIGN KEY (document_id, start_page)
        REFERENCES document_pages (document_id, page_number),
    FOREIGN KEY (document_id, end_page)
        REFERENCES document_pages (document_id, page_number)
);

-- Phase 1: conversations
CREATE TABLE IF NOT EXISTS conversations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    title       TEXT,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_conversations_updated_at ON conversations;
CREATE TRIGGER trg_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Phase 1: messages
CREATE TABLE IF NOT EXISTS messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Phase 1: message_sources (citation provenance)
CREATE TABLE IF NOT EXISTS message_sources (
    id               UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id       UUID  NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    chunk_id         UUID  REFERENCES document_chunks(id) ON DELETE SET NULL,
    similarity_score FLOAT,
    rank             INTEGER,
    created_at       TIMESTAMPTZ DEFAULT now()
);


-- =============================================================================
-- 5. Phase 2 — Learning Tools Layer
-- =============================================================================

-- Phase 2: quizzes
CREATE TABLE IF NOT EXISTS quizzes (
    id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    document_id    UUID    REFERENCES documents(id) ON DELETE SET NULL,
    title          TEXT,
    topic          TEXT,
    difficulty     TEXT    CHECK (difficulty IN ('easy','medium','hard')),
    question_count INTEGER,
    created_at     TIMESTAMPTZ DEFAULT now()
);

-- Phase 2: quiz_questions
CREATE TABLE IF NOT EXISTS quiz_questions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id         UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text   TEXT NOT NULL,
    question_type   TEXT NOT NULL
                         CHECK (question_type IN ('mcq','true_false','fill_blank','short_answer')),
    options         JSONB,   -- array of choices for MCQ
    correct_answer  TEXT NOT NULL,
    explanation     TEXT,
    source_chunk_id UUID REFERENCES document_chunks(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Phase 2: quiz_attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id         UUID    NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id         UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    score           INTEGER,
    total_questions INTEGER,
    started_at      TIMESTAMPTZ DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    CHECK (score IS NULL OR score <= total_questions)
);

-- Phase 2: quiz_answers
CREATE TABLE IF NOT EXISTS quiz_answers (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id      UUID    NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id     UUID    NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    selected_answer TEXT,
    is_correct      BOOLEAN,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Phase 2: study_plans
CREATE TABLE IF NOT EXISTS study_plans (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title      TEXT,
    goal       TEXT,
    start_date DATE,
    end_date   DATE,
    status     TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','completed','archived')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 2: study_plan_items
CREATE TABLE IF NOT EXISTS study_plan_items (
    id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    study_plan_id     UUID    NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
    document_id       UUID    REFERENCES documents(id) ON DELETE SET NULL,
    topic             TEXT,
    scheduled_date    DATE,
    estimated_minutes INTEGER,
    status            TEXT    NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','in_progress','completed','skipped')),
    completed_at      TIMESTAMPTZ
);

-- Phase 2: learning_progress
CREATE TABLE IF NOT EXISTS learning_progress (
    id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    document_id         UUID    NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    topic               TEXT    NOT NULL,
    progress_percentage INTEGER DEFAULT 0
                                CHECK (progress_percentage BETWEEN 0 AND 100),
    last_studied_at     TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, document_id, topic)
);

DROP TRIGGER IF EXISTS trg_learning_progress_updated_at ON learning_progress;
CREATE TRIGGER trg_learning_progress_updated_at
    BEFORE UPDATE ON learning_progress
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- 6. Phase 3 — Career and Profile Module
-- =============================================================================

-- Phase 3: career_profiles
CREATE TABLE IF NOT EXISTS career_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    headline            TEXT,
    target_role         TEXT,
    target_company      TEXT,
    linkedin_url        TEXT,
    github_url          TEXT,
    resume_document_id  UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_career_profiles_updated_at ON career_profiles;
CREATE TRIGGER trg_career_profiles_updated_at
    BEFORE UPDATE ON career_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Phase 3: user_skills
CREATE TABLE IF NOT EXISTS user_skills (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    skill_name       TEXT NOT NULL,
    category         TEXT,
    proficiency_level TEXT
                         CHECK (proficiency_level IN ('beginner','intermediate','advanced')),
    evidence         TEXT,
    created_at       TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, skill_name)
);

-- Phase 3: target_roles
CREATE TABLE IF NOT EXISTS target_roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_name       TEXT NOT NULL,
    company_name    TEXT,
    job_description TEXT,
    required_skills JSONB,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Phase 3: gap_analyses
CREATE TABLE IF NOT EXISTS gap_analyses (
    id               UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID  NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    target_role_id   UUID  REFERENCES target_roles(id) ON DELETE SET NULL,
    overall_score    FLOAT CHECK (overall_score BETWEEN 0 AND 100),
    matched_skills   JSONB,
    missing_skills   JSONB,
    recommendations  TEXT,
    created_at       TIMESTAMPTZ DEFAULT now()
);


-- =============================================================================
-- 7. Phase 4 — Integration View
-- =============================================================================

-- Phase 4: student_overview (read-only view unifying academic + career data)
CREATE OR REPLACE VIEW student_overview AS
SELECT
    p.id                                                                    AS user_id,
    p.full_name,
    p.career_goal,
    COUNT(DISTINCT d.id)                                                    AS documents_uploaded,
    COUNT(DISTINCT qa.id)                                                   AS quiz_attempts_taken,
    ROUND(AVG(qa.score::NUMERIC / NULLIF(qa.total_questions, 0)) * 100, 1) AS avg_quiz_score_pct,
    COUNT(DISTINCT lp.id)                                                   AS topics_tracked,
    cp.target_role,
    cp.target_company
FROM profiles p
LEFT JOIN documents         d  ON d.user_id  = p.id AND d.status != 'deleted'
LEFT JOIN quiz_attempts     qa ON qa.user_id = p.id
LEFT JOIN learning_progress lp ON lp.user_id = p.id
LEFT JOIN career_profiles   cp ON cp.user_id = p.id
GROUP BY p.id, p.full_name, p.career_goal, cp.target_role, cp.target_company;

-- Postgres 15+: make the view respect the caller's RLS, not the view owner's
ALTER VIEW student_overview SET (security_invoker = true);


-- =============================================================================
-- 8. Row-Level Security
-- =============================================================================

-- 8a. Enable RLS on every user-owned table
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_pages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_sources   ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans       ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plan_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills       ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_roles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE gap_analyses      ENABLE ROW LEVEL SECURITY;

-- 8b. Pattern A — tables with a direct user_id column

DROP POLICY IF EXISTS own_profile_only ON profiles;
CREATE POLICY own_profile_only ON profiles
    FOR ALL USING     (auth.uid() = id)
    WITH CHECK        (auth.uid() = id);

DROP POLICY IF EXISTS own_documents_only ON documents;
CREATE POLICY own_documents_only ON documents
    FOR ALL USING     (auth.uid() = user_id)
    WITH CHECK        (auth.uid() = user_id);

DROP POLICY IF EXISTS own_conversations_only ON conversations;
CREATE POLICY own_conversations_only ON conversations
    FOR ALL USING     (auth.uid() = user_id)
    WITH CHECK        (auth.uid() = user_id);

DROP POLICY IF EXISTS own_quizzes_only ON quizzes;
CREATE POLICY own_quizzes_only ON quizzes
    FOR ALL USING     (auth.uid() = user_id)
    WITH CHECK        (auth.uid() = user_id);

DROP POLICY IF EXISTS own_quiz_attempts_only ON quiz_attempts;
CREATE POLICY own_quiz_attempts_only ON quiz_attempts
    FOR ALL USING     (auth.uid() = user_id)
    WITH CHECK        (auth.uid() = user_id);

DROP POLICY IF EXISTS own_study_plans_only ON study_plans;
CREATE POLICY own_study_plans_only ON study_plans
    FOR ALL USING     (auth.uid() = user_id)
    WITH CHECK        (auth.uid() = user_id);

DROP POLICY IF EXISTS own_learning_progress_only ON learning_progress;
CREATE POLICY own_learning_progress_only ON learning_progress
    FOR ALL USING     (auth.uid() = user_id)
    WITH CHECK        (auth.uid() = user_id);

DROP POLICY IF EXISTS own_career_profile_only ON career_profiles;
CREATE POLICY own_career_profile_only ON career_profiles
    FOR ALL USING     (auth.uid() = user_id)
    WITH CHECK        (auth.uid() = user_id);

DROP POLICY IF EXISTS own_skills_only ON user_skills;
CREATE POLICY own_skills_only ON user_skills
    FOR ALL USING     (auth.uid() = user_id)
    WITH CHECK        (auth.uid() = user_id);

DROP POLICY IF EXISTS own_target_roles_only ON target_roles;
CREATE POLICY own_target_roles_only ON target_roles
    FOR ALL USING     (auth.uid() = user_id)
    WITH CHECK        (auth.uid() = user_id);

DROP POLICY IF EXISTS own_gap_analyses_only ON gap_analyses;
CREATE POLICY own_gap_analyses_only ON gap_analyses
    FOR ALL USING     (auth.uid() = user_id)
    WITH CHECK        (auth.uid() = user_id);

-- 8c. Pattern B — tables reached only through a foreign-key chain

DROP POLICY IF EXISTS own_pages_only ON document_pages;
CREATE POLICY own_pages_only ON document_pages
    FOR ALL USING (
        document_id IN (SELECT id FROM documents WHERE user_id = auth.uid())
    )
    WITH CHECK (
        document_id IN (SELECT id FROM documents WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS own_chunks_only ON document_chunks;
CREATE POLICY own_chunks_only ON document_chunks
    FOR ALL USING (
        document_id IN (SELECT id FROM documents WHERE user_id = auth.uid())
    )
    WITH CHECK (
        document_id IN (SELECT id FROM documents WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS own_messages_only ON messages;
CREATE POLICY own_messages_only ON messages
    FOR ALL USING (
        conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid())
    )
    WITH CHECK (
        conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS own_message_sources_only ON message_sources;
CREATE POLICY own_message_sources_only ON message_sources
    FOR ALL USING (
        message_id IN (
            SELECT m.id FROM messages m
            JOIN conversations c ON c.id = m.conversation_id
            WHERE c.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS own_quiz_questions_only ON quiz_questions;
CREATE POLICY own_quiz_questions_only ON quiz_questions
    FOR ALL USING (
        quiz_id IN (SELECT id FROM quizzes WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS own_quiz_answers_only ON quiz_answers;
CREATE POLICY own_quiz_answers_only ON quiz_answers
    FOR ALL USING (
        attempt_id IN (SELECT id FROM quiz_attempts WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS own_study_plan_items_only ON study_plan_items;
CREATE POLICY own_study_plan_items_only ON study_plan_items
    FOR ALL USING (
        study_plan_id IN (SELECT id FROM study_plans WHERE user_id = auth.uid())
    );


-- =============================================================================
-- 9. Indexes
-- =============================================================================

-- 9a. Standard relational indexes (covers every FK used in joins, cascades, RLS subqueries)
CREATE INDEX IF NOT EXISTS idx_documents_user_status         ON documents         (user_id, status);
CREATE INDEX IF NOT EXISTS idx_pages_document_page           ON document_pages    (document_id, page_number);
CREATE INDEX IF NOT EXISTS idx_chunks_document_index         ON document_chunks   (document_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_chunks_start_page             ON document_chunks   (document_id, start_page);
CREATE INDEX IF NOT EXISTS idx_conversations_user            ON conversations      (user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_time    ON messages           (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_message_sources_message       ON message_sources    (message_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_user_document         ON quizzes            (user_id, document_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz           ON quiz_questions     (quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_user       ON quiz_attempts      (quiz_id, user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_attempt          ON quiz_answers       (attempt_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_user              ON study_plans        (user_id);
CREATE INDEX IF NOT EXISTS idx_study_plan_items_plan         ON study_plan_items   (study_plan_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_user        ON learning_progress  (user_id);
CREATE INDEX IF NOT EXISTS idx_career_profiles_user          ON career_profiles    (user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_user              ON user_skills        (user_id);
CREATE INDEX IF NOT EXISTS idx_target_roles_user             ON target_roles       (user_id);
CREATE INDEX IF NOT EXISTS idx_gap_analyses_user             ON gap_analyses       (user_id);
CREATE INDEX IF NOT EXISTS idx_gap_analyses_target_role      ON gap_analyses       (target_role_id);

-- 9b. HNSW vector index for semantic search on document_chunks.embedding
--     Use a flat scan during early development; add this index once chunk
--     volume reaches a few thousand rows.
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw
    ON document_chunks USING hnsw (embedding extensions.vector_cosine_ops);


-- =============================================================================
-- 10. match_chunks() RPC Function
-- =============================================================================

-- Drop any existing match_chunks overload unconditionally so that a return-type
-- change (SQLSTATE 42P13) never blocks CREATE OR REPLACE below.
DO $$
DECLARE
  r RECORD;
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

CREATE OR REPLACE FUNCTION match_chunks(
    query_embedding  extensions.vector(1536),
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
