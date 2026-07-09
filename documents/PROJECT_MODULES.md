# AI Scholar Modules

This document lists the main modules in the current AI Scholar codebase and what each one is responsible for.

## 1. Backend

The backend is a FastAPI application that exposes the API used by the frontend and coordinates profile management, document processing, RAG chat, knowledge-graph generation, learning tools, and flashcards.

### Core backend files

- [backend/main.py](../backend/main.py) - FastAPI app setup, CORS configuration, router registration, and the health endpoint.
- [backend/config.py](../backend/config.py) - Centralized settings and environment-variable loading.
- [backend/auth.py](../backend/auth.py) - Supabase JWT verification and authenticated user resolution.
- [backend/database.py](../backend/database.py) - Supabase client helpers and admin-client access.
- [backend/models.py](../backend/models.py) - Pydantic request and response models for profiles, documents, conversations, messages, knowledge graph, quizzes, study plans, learning progress, and flashcards.
- [backend/tasks.py](../backend/tasks.py) - Background PDF processing jobs, including the post-processing hook that builds the knowledge graph after a document becomes ready.

### Backend routers

- [backend/routers/profile.py](../backend/routers/profile.py) - `GET /v1/profile` and `PATCH /v1/profile` for the signed-in user's profile.
- [backend/routers/documents.py](../backend/routers/documents.py) - Document upload, listing, retrieval, reprocessing, and soft delete.
- [backend/routers/conversations.py](../backend/routers/conversations.py) - Conversation creation, message history, and RAG message sending.
- [backend/routers/knowledge_graph.py](../backend/routers/knowledge_graph.py) - `GET /v1/knowledge-graph`, `POST /v1/knowledge-graph/rebuild`, and `GET /v1/documents/{document_id}/similar`.
- [backend/routers/quizzes.py](../backend/routers/quizzes.py) - Quiz generation, quiz retrieval, attempts, answer submission, and attempt completion.
- [backend/routers/learning_progress.py](../backend/routers/learning_progress.py) - Weak-topic reporting from learning progress and prerequisite data.
- [backend/routers/study_plans.py](../backend/routers/study_plans.py) - Study-plan creation, retrieval, item creation, and item status updates.
- [backend/routers/flashcards.py](../backend/routers/flashcards.py) - Flashcard generation, listing, retrieval, review status updates, and deletion.

### Backend services

- [backend/services/pdf_processor.py](../backend/services/pdf_processor.py) - PDF text extraction and chunking.
- [backend/services/embeddings.py](../backend/services/embeddings.py) - Gemini embedding generation and vector formatting for pgvector's 768-dimensional vector columns.
- [backend/services/generation.py](../backend/services/generation.py) - Groq-backed LLM response generation for grounded RAG answers.
- [backend/services/knowledge_graph.py](../backend/services/knowledge_graph.py) - Topic extraction, topic embedding, topic similarity, document similarity, and graph edge creation.
- [backend/services/quiz_generation.py](../backend/services/quiz_generation.py) - Context gathering and Groq-backed quiz-question generation.
- [backend/services/learning_progress.py](../backend/services/learning_progress.py) - Quiz-completion progress updates and weak-topic derivation.
- [backend/services/flashcard_generation.py](../backend/services/flashcard_generation.py) - Groq-backed flashcard generation.

### Backend tests

- [backend/tests/test_phase0_profile.py](../backend/tests/test_phase0_profile.py) - Phase 0 profile API coverage.

## 2. Frontend

The frontend is a Next.js application that provides the student-facing UI for auth, dashboard navigation, uploads, library/chat workflows, profile editing, the knowledge graph, and flashcards.

### Frontend app routes

- [frontend/src/app/page.tsx](../frontend/src/app/page.tsx) - Public landing page.
- [frontend/src/app/auth/page.tsx](../frontend/src/app/auth/page.tsx) - Sign-in and sign-up flow.
- [frontend/src/app/dashboard/page.tsx](../frontend/src/app/dashboard/page.tsx) - Main authenticated dashboard.
- [frontend/src/app/library/page.tsx](../frontend/src/app/library/page.tsx) - Study library and document/chat workspace.
- [frontend/src/app/upload/page.tsx](../frontend/src/app/upload/page.tsx) - Document upload screen.
- [frontend/src/app/profile/page.tsx](../frontend/src/app/profile/page.tsx) - Profile editor.
- [frontend/src/app/chat/[conversationId]/page.tsx](../frontend/src/app/chat/[conversationId]/page.tsx) - Conversation detail and chat screen.
- [frontend/src/app/knowledge-graph/page.tsx](../frontend/src/app/knowledge-graph/page.tsx) - Knowledge graph visualization and rebuild action.
- [frontend/src/app/flashcards/page.tsx](../frontend/src/app/flashcards/page.tsx) - Flashcard generation, review, and management screen.

### Frontend components and utilities

- [frontend/src/components/AppShell.tsx](../frontend/src/components/AppShell.tsx) - Shared authenticated layout, navigation, and shell UI.
- [frontend/src/components/useAppUser.ts](../frontend/src/components/useAppUser.ts) - Current-user state helper used by the app shell and pages.
- [frontend/src/lib/api.ts](../frontend/src/lib/api.ts) - Frontend API client for backend endpoints, including knowledge graph and flashcards.
- [frontend/src/lib/supabase.ts](../frontend/src/lib/supabase.ts) - Supabase browser/client setup.
- [frontend/src/lib/docs-store.ts](../frontend/src/lib/docs-store.ts) - Local document state helpers used by the UI.

## 3. Supabase

Supabase provides authentication, database storage, row-level security, document storage, and pgvector search.

- [supabase/config.toml](../supabase/config.toml) - Local Supabase configuration.
- [supabase/migrations/20260628090043_create_tables.sql](../supabase/migrations/20260628090043_create_tables.sql) - Base schema, RLS, indexes, and RPC functions.
- [supabase/migrations/20260628120000_phase1_vector_768.sql](../supabase/migrations/20260628120000_phase1_vector_768.sql) - Active Phase 1 vector-search update: `document_chunks.embedding` and `match_chunks` use Gemini `text-embedding-004` with `vector(768)`.
- [supabase/migrations/20260705100000_phase1_5_knowledge_graph.sql](../supabase/migrations/20260705100000_phase1_5_knowledge_graph.sql) - Knowledge graph tables, RLS, and indexes. `topics.embedding` also uses `vector(768)`.
- [supabase/migrations/20260706100000_phase2_learning_tools.sql](../supabase/migrations/20260706100000_phase2_learning_tools.sql) - Quizzes, quiz attempts, study plans, study plan items, learning progress, RLS, indexes, and self-healing schema guards.
- [supabase/migrations/20260707100000_phase2b_flashcards.sql](../supabase/migrations/20260707100000_phase2b_flashcards.sql) - Flashcards table, RLS, and indexes.

## 4. Documentation

- [README.md](../README.md) - High-level project overview, setup, and roadmap.
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Deployment notes and environment guidance.
- [documents/AI_Scholar_Design_Document.md](AI_Scholar_Design_Document.md) - Source product and schema design reference with current implementation deltas.
- [documents/Working_AI_SCHOLAR_RAG.md](Working_AI_SCHOLAR_RAG.md) - Supporting RAG workflow document.
- [documents/knowledge_graph_addendum.md](knowledge_graph_addendum.md) - Knowledge graph design, updated to match the implemented Phase 1.5 code.

## 5. How the modules fit together

1. The frontend collects user input and calls the backend through [frontend/src/lib/api.ts](../frontend/src/lib/api.ts).
2. The backend authenticates the user, validates access, and routes requests through the appropriate router.
3. Uploads are processed by the PDF and embedding services, stored in Supabase, then passed to the knowledge-graph builder after the document reaches `ready`.
4. RAG chat, quizzes, flashcards, and graph features reuse stored chunks, embeddings, topics, and document metadata.
5. Supabase persists profiles, documents, conversations, messages, retrieval data, graph data, learning tools, and review state.

## 6. Current focus

The codebase currently covers the document-to-chat workflow plus the first learning-tool extensions:

- user profile management
- PDF upload and document metadata
- background PDF processing
- retrieval-augmented chat with citations
- knowledge graph generation and visualization
- quiz generation and attempt scoring APIs
- weak-topic progress reporting
- study-plan CRUD APIs
- flashcard generation and review UI

Career features and multimodal inputs remain future phases.
