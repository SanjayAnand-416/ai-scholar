-- =============================================================================
-- AI Scholar — Phase 2: Learning Tools Layer
-- Adds quizzes, quiz_questions, quiz_attempts, quiz_answers, study_plans,
-- study_plan_items, learning_progress. No existing table is modified.
-- Flashcards are deliberately out of scope for this phase (fast-follow later).
--
-- This file is written to be safely re-runnable against a database where some
-- of these tables may already exist in an incomplete/older shape (e.g. from a
-- prior partial apply via the SQL Editor, which — unlike `supabase db push`
-- — does not run the whole file as one transaction and is not recorded in
-- supabase_migrations.schema_migrations). CREATE TABLE IF NOT EXISTS silently
-- no-ops on a pre-existing table without adding any columns it's missing, so
-- every table gets a defensive ADD COLUMN / ADD CONSTRAINT pass below before
-- anything (indexes, policies) that assumes the full column set exists.
-- =============================================================================


-- =============================================================================
-- 1. quizzes
-- =============================================================================

CREATE TABLE IF NOT EXISTS quizzes (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    document_id  UUID REFERENCES documents(id) ON DELETE SET NULL,
    topic_id     UUID REFERENCES topics(id) ON DELETE SET NULL,
    title        TEXT,
    difficulty   TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    created_at   TIMESTAMPTZ DEFAULT now()
);


-- =============================================================================
-- 2. quiz_questions
-- =============================================================================

CREATE TABLE IF NOT EXISTS quiz_questions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id        UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text  TEXT NOT NULL,
    question_type  TEXT NOT NULL
        CHECK (question_type IN ('mcq', 'true_false', 'fill_blank', 'short_answer')),
    options        JSONB,
    correct_answer TEXT NOT NULL,
    explanation    TEXT,
    created_at     TIMESTAMPTZ DEFAULT now()
);


-- =============================================================================
-- 3. quiz_attempts
-- =============================================================================

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id          UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    score            INTEGER,
    total_questions  INTEGER,
    started_at       TIMESTAMPTZ DEFAULT now(),
    completed_at     TIMESTAMPTZ,
    CHECK (score IS NULL OR score <= total_questions)
);


-- =============================================================================
-- 4. quiz_answers
-- =============================================================================

CREATE TABLE IF NOT EXISTS quiz_answers (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id       UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id      UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    selected_answer  TEXT,
    is_correct       BOOLEAN,
    created_at       TIMESTAMPTZ DEFAULT now()
);


-- =============================================================================
-- 5. study_plans
-- =============================================================================

CREATE TABLE IF NOT EXISTS study_plans (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title       TEXT,
    goal        TEXT,
    start_date  DATE,
    end_date    DATE,
    status      TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'completed', 'archived')),
    created_at  TIMESTAMPTZ DEFAULT now()
);


-- =============================================================================
-- 6. study_plan_items
-- =============================================================================

CREATE TABLE IF NOT EXISTS study_plan_items (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_plan_id      UUID NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
    document_id        UUID REFERENCES documents(id) ON DELETE SET NULL,
    topic              TEXT,
    scheduled_date     DATE,
    estimated_minutes  INTEGER,
    status             TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    completed_at       TIMESTAMPTZ
);


-- =============================================================================
-- 7. learning_progress
-- =============================================================================

CREATE TABLE IF NOT EXISTS learning_progress (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    document_id          UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    topic                TEXT NOT NULL,
    progress_percentage  INTEGER DEFAULT 0
        CHECK (progress_percentage BETWEEN 0 AND 100),
    last_studied_at      TIMESTAMPTZ,
    updated_at           TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, document_id, topic)
);

DROP TRIGGER IF EXISTS trg_learning_progress_updated_at ON learning_progress;
CREATE TRIGGER trg_learning_progress_updated_at
    BEFORE UPDATE ON learning_progress
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- 8. Self-heal columns on any table that pre-existed with an older shape
-- =============================================================================
-- Bare ADD COLUMN IF NOT EXISTS only (no inline constraints): on a table that
-- CREATE TABLE just created fresh, every one of these is a no-op since the
-- column is already present. On a stale pre-existing table, this backfills
-- whatever columns are missing — nullable, so it can't fail against existing
-- rows. NOT NULL / FK / CHECK / UNIQUE enforcement is handled separately in
-- section 9, once every column is guaranteed to exist.

ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS document_id UUID;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS topic_id UUID;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS difficulty TEXT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS quiz_id UUID;
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS question_text TEXT;
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS question_type TEXT;
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS options JSONB;
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS correct_answer TEXT;
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS quiz_id UUID;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS score INTEGER;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS total_questions INTEGER;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE quiz_answers ADD COLUMN IF NOT EXISTS attempt_id UUID;
ALTER TABLE quiz_answers ADD COLUMN IF NOT EXISTS question_id UUID;
ALTER TABLE quiz_answers ADD COLUMN IF NOT EXISTS selected_answer TEXT;
ALTER TABLE quiz_answers ADD COLUMN IF NOT EXISTS is_correct BOOLEAN;
ALTER TABLE quiz_answers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS goal TEXT;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE study_plan_items ADD COLUMN IF NOT EXISTS study_plan_id UUID;
ALTER TABLE study_plan_items ADD COLUMN IF NOT EXISTS document_id UUID;
ALTER TABLE study_plan_items ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE study_plan_items ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE study_plan_items ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;
ALTER TABLE study_plan_items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE study_plan_items ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE learning_progress ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE learning_progress ADD COLUMN IF NOT EXISTS document_id UUID;
ALTER TABLE learning_progress ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE learning_progress ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;
ALTER TABLE learning_progress ADD COLUMN IF NOT EXISTS last_studied_at TIMESTAMPTZ;
ALTER TABLE learning_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();


-- =============================================================================
-- 9. Self-heal constraints (FK / CHECK / UNIQUE / NOT NULL)
-- =============================================================================
-- _ensure_constraint adds a named constraint only if it isn't already present
-- on that table (by name, scoped to the table's oid — not just conname, since
-- names aren't unique across tables). On a freshly-created table the inline
-- constraints from section 1-7 already exist under these exact auto-generated
-- names (Postgres names a single-column inline FK "<table>_<column>_fkey", a
-- single-column inline CHECK "<table>_<column>_check", an unnamed table-level
-- CHECK "<table>_check", and a multi-column UNIQUE
-- "<table>_<col1>_<col2>..._key") — so every call below is a no-op there.
-- On a stale table missing the constraint, it patches it in.
--
-- _ensure_not_null wraps the ALTER in its own sub-transaction (via a nested
-- BEGIN/EXCEPTION block) so that if a stale table already has NULLs in that
-- column, the migration logs a NOTICE and continues instead of aborting —
-- existing data is preserved rather than the migration failing outright.

CREATE OR REPLACE FUNCTION _phase2_ensure_constraint(p_table regclass, p_conname TEXT, p_conddl TEXT)
RETURNS void AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = p_conname AND conrelid = p_table
    ) THEN
        EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s', p_table::TEXT, p_conname, p_conddl);
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _phase2_ensure_not_null(p_table regclass, p_column TEXT)
RETURNS void AS $$
BEGIN
    BEGIN
        EXECUTE format('ALTER TABLE %s ALTER COLUMN %I SET NOT NULL', p_table::TEXT, p_column);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping NOT NULL on %.%: % (existing data may violate it)', p_table::TEXT, p_column, SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql;

-- quizzes
SELECT _phase2_ensure_constraint('quizzes', 'quizzes_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE');
SELECT _phase2_ensure_constraint('quizzes', 'quizzes_document_id_fkey', 'FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL');
SELECT _phase2_ensure_constraint('quizzes', 'quizzes_topic_id_fkey', 'FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL');
SELECT _phase2_ensure_constraint('quizzes', 'quizzes_difficulty_check', $c$CHECK (difficulty IN ('easy', 'medium', 'hard'))$c$);
SELECT _phase2_ensure_not_null('quizzes', 'user_id');

-- quiz_questions
SELECT _phase2_ensure_constraint('quiz_questions', 'quiz_questions_quiz_id_fkey', 'FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE');
SELECT _phase2_ensure_constraint('quiz_questions', 'quiz_questions_question_type_check', $c$CHECK (question_type IN ('mcq', 'true_false', 'fill_blank', 'short_answer'))$c$);
SELECT _phase2_ensure_not_null('quiz_questions', 'quiz_id');
SELECT _phase2_ensure_not_null('quiz_questions', 'question_text');
SELECT _phase2_ensure_not_null('quiz_questions', 'question_type');
SELECT _phase2_ensure_not_null('quiz_questions', 'correct_answer');

-- quiz_attempts
SELECT _phase2_ensure_constraint('quiz_attempts', 'quiz_attempts_quiz_id_fkey', 'FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE');
SELECT _phase2_ensure_constraint('quiz_attempts', 'quiz_attempts_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE');
SELECT _phase2_ensure_constraint('quiz_attempts', 'quiz_attempts_check', 'CHECK (score IS NULL OR score <= total_questions)');
SELECT _phase2_ensure_not_null('quiz_attempts', 'quiz_id');
SELECT _phase2_ensure_not_null('quiz_attempts', 'user_id');

-- quiz_answers
SELECT _phase2_ensure_constraint('quiz_answers', 'quiz_answers_attempt_id_fkey', 'FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE');
SELECT _phase2_ensure_constraint('quiz_answers', 'quiz_answers_question_id_fkey', 'FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE');
SELECT _phase2_ensure_not_null('quiz_answers', 'attempt_id');
SELECT _phase2_ensure_not_null('quiz_answers', 'question_id');

-- study_plans
SELECT _phase2_ensure_constraint('study_plans', 'study_plans_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE');
SELECT _phase2_ensure_constraint('study_plans', 'study_plans_status_check', $c$CHECK (status IN ('active', 'completed', 'archived'))$c$);
SELECT _phase2_ensure_not_null('study_plans', 'user_id');
SELECT _phase2_ensure_not_null('study_plans', 'status');

-- study_plan_items
SELECT _phase2_ensure_constraint('study_plan_items', 'study_plan_items_study_plan_id_fkey', 'FOREIGN KEY (study_plan_id) REFERENCES study_plans(id) ON DELETE CASCADE');
SELECT _phase2_ensure_constraint('study_plan_items', 'study_plan_items_document_id_fkey', 'FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL');
SELECT _phase2_ensure_constraint('study_plan_items', 'study_plan_items_status_check', $c$CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped'))$c$);
SELECT _phase2_ensure_not_null('study_plan_items', 'study_plan_id');
SELECT _phase2_ensure_not_null('study_plan_items', 'status');

-- learning_progress
SELECT _phase2_ensure_constraint('learning_progress', 'learning_progress_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE');
SELECT _phase2_ensure_constraint('learning_progress', 'learning_progress_document_id_fkey', 'FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE');
SELECT _phase2_ensure_constraint('learning_progress', 'learning_progress_progress_percentage_check', 'CHECK (progress_percentage BETWEEN 0 AND 100)');
SELECT _phase2_ensure_constraint('learning_progress', 'learning_progress_user_id_document_id_topic_key', 'UNIQUE (user_id, document_id, topic)');
SELECT _phase2_ensure_not_null('learning_progress', 'user_id');
SELECT _phase2_ensure_not_null('learning_progress', 'document_id');
SELECT _phase2_ensure_not_null('learning_progress', 'topic');

DROP FUNCTION _phase2_ensure_constraint(regclass, TEXT, TEXT);
DROP FUNCTION _phase2_ensure_not_null(regclass, TEXT);


-- =============================================================================
-- 10. Row-Level Security
-- =============================================================================

ALTER TABLE quizzes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans        ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plan_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_progress  ENABLE ROW LEVEL SECURITY;

-- Pattern A (direct user_id column)
DROP POLICY IF EXISTS own_quizzes ON quizzes;
CREATE POLICY own_quizzes ON quizzes
    FOR ALL USING     (auth.uid() = user_id)
    WITH CHECK        (auth.uid() = user_id);

DROP POLICY IF EXISTS own_quiz_attempts ON quiz_attempts;
CREATE POLICY own_quiz_attempts ON quiz_attempts
    FOR ALL USING     (auth.uid() = user_id)
    WITH CHECK        (auth.uid() = user_id);

DROP POLICY IF EXISTS own_study_plans ON study_plans;
CREATE POLICY own_study_plans ON study_plans
    FOR ALL USING     (auth.uid() = user_id)
    WITH CHECK        (auth.uid() = user_id);

DROP POLICY IF EXISTS own_learning_progress ON learning_progress;
CREATE POLICY own_learning_progress ON learning_progress
    FOR ALL USING     (auth.uid() = user_id)
    WITH CHECK        (auth.uid() = user_id);

-- Pattern B (ownership via foreign-key chain)
DROP POLICY IF EXISTS own_quiz_questions ON quiz_questions;
CREATE POLICY own_quiz_questions ON quiz_questions
    FOR ALL USING (
        quiz_id IN (SELECT id FROM quizzes WHERE user_id = auth.uid())
    )
    WITH CHECK (
        quiz_id IN (SELECT id FROM quizzes WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS own_quiz_answers ON quiz_answers;
CREATE POLICY own_quiz_answers ON quiz_answers
    FOR ALL USING (
        attempt_id IN (SELECT id FROM quiz_attempts WHERE user_id = auth.uid())
    )
    WITH CHECK (
        attempt_id IN (SELECT id FROM quiz_attempts WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS own_study_plan_items ON study_plan_items;
CREATE POLICY own_study_plan_items ON study_plan_items
    FOR ALL USING (
        study_plan_id IN (SELECT id FROM study_plans WHERE user_id = auth.uid())
    )
    WITH CHECK (
        study_plan_id IN (SELECT id FROM study_plans WHERE user_id = auth.uid())
    );


-- =============================================================================
-- 11. Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_quizzes_user             ON quizzes             (user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_document          ON quizzes             (document_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_topic             ON quizzes             (topic_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz        ON quiz_questions      (quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz         ON quiz_attempts       (quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user         ON quiz_attempts       (user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_attempt       ON quiz_answers        (attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_question      ON quiz_answers        (question_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_user           ON study_plans         (user_id);
CREATE INDEX IF NOT EXISTS idx_study_plan_items_plan      ON study_plan_items    (study_plan_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_user     ON learning_progress   (user_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_document ON learning_progress   (document_id);
