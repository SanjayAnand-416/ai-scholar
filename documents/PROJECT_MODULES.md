# AI Scholar Modules

This document lists the main modules in the current AI Scholar codebase and what each one is responsible for.

## 1. Backend

The backend is a FastAPI application that exposes the API used by the frontend and coordinates document processing, profile management, and RAG chat.

### Core backend files

- [backend/main.py](../backend/main.py) - FastAPI app setup, CORS configuration, router registration, and the health endpoint.
- [backend/config.py](../backend/config.py) - Centralized settings and environment-variable loading.
- [backend/auth.py](../backend/auth.py) - Supabase JWT verification and authenticated user resolution.
- [backend/database.py](../backend/database.py) - Supabase client helpers and admin-client access.
- [backend/models.py](../backend/models.py) - Pydantic request and response models for profiles, documents, conversations, and messages.
- [backend/tasks.py](../backend/tasks.py) - Background processing jobs for uploaded documents.

### Backend routers

- [backend/routers/profile.py](../backend/routers/profile.py) - `GET /v1/profile` and `PATCH /v1/profile` for the signed-in user's profile.
- [backend/routers/documents.py](../backend/routers/documents.py) - Document upload, listing, retrieval, reprocessing, and soft delete.
- [backend/routers/conversations.py](../backend/routers/conversations.py) - Conversation creation, message history, and RAG message sending.

### Backend services

- [backend/services/pdf_processor.py](../backend/services/pdf_processor.py) - PDF text extraction and chunking.
- [backend/services/embeddings.py](../backend/services/embeddings.py) - Embedding generation and vector formatting for pgvector.
- [backend/services/generation.py](../backend/services/generation.py) - LLM response generation for grounded RAG answers.

### Backend tests

- [backend/tests/test_phase0_profile.py](../backend/tests/test_phase0_profile.py) - Phase 0 profile API coverage.

## 2. Frontend

The frontend is a Next.js application that provides the student-facing UI for auth, dashboard navigation, uploads, the library, chat, and profile editing.

### Frontend app routes

- [frontend/src/app/page.tsx](../frontend/src/app/page.tsx) - Public landing page.
- [frontend/src/app/auth/page.tsx](../frontend/src/app/auth/page.tsx) - Sign-in and sign-up flow.
- [frontend/src/app/dashboard/page.tsx](../frontend/src/app/dashboard/page.tsx) - Main authenticated dashboard.
- [frontend/src/app/library/page.tsx](../frontend/src/app/library/page.tsx) - Study library and document/chat workspace.
- [frontend/src/app/upload/page.tsx](../frontend/src/app/upload/page.tsx) - Document upload screen.
- [frontend/src/app/profile/page.tsx](../frontend/src/app/profile/page.tsx) - Profile editor.
- [frontend/src/app/chat/[conversationId]/page.tsx](../frontend/src/app/chat/[conversationId]/page.tsx) - Conversation detail and chat screen.

### Frontend components and utilities

- [frontend/src/components/AppShell.tsx](../frontend/src/components/AppShell.tsx) - Shared authenticated layout, navigation, and shell UI.
- [frontend/src/components/useAppUser.ts](../frontend/src/components/useAppUser.ts) - Current-user state helper used by the app shell and pages.
- [frontend/src/lib/api.ts](../frontend/src/lib/api.ts) - Frontend API client for the backend endpoints.
- [frontend/src/lib/supabase.ts](../frontend/src/lib/supabase.ts) - Supabase browser/client setup.
- [frontend/src/lib/docs-store.ts](../frontend/src/lib/docs-store.ts) - Local document state helpers used by the UI.

## 3. Supabase

Supabase provides authentication, database storage, row-level security, and document storage.

- [supabase/config.toml](../supabase/config.toml) - Local Supabase configuration.
- [supabase/migrations/20260628090043_create_tables.sql](../supabase/migrations/20260628090043_create_tables.sql) - Base schema, RLS, indexes, and RPC functions.
- [supabase/migrations/20260628120000_phase1_vector_768.sql](../supabase/migrations/20260628120000_phase1_vector_768.sql) - Vector-search update for the Phase 1 retrieval layer.

## 4. Documentation

- [README.md](../README.md) - High-level project overview, setup, and roadmap.
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Deployment notes and environment guidance.
- [documents/AI_Scholar_Design_Document.pdf](AI_Scholar_Design_Document.pdf) - Source product and schema design reference.
- [documents/Working_AI_SCHOLAR_RAG.pdf](Working_AI_SCHOLAR_RAG.pdf) - Supporting RAG workflow document.

## 5. How the modules fit together

1. The frontend collects user input and calls the backend through [frontend/src/lib/api.ts](../frontend/src/lib/api.ts).
2. The backend authenticates the user, validates access, and routes requests through the appropriate router.
3. Uploads are processed by the PDF, embedding, and generation services before results are stored in Supabase.
4. Supabase persists profiles, documents, conversations, messages, and retrieval data.

## 6. Current focus

The codebase is currently centered on the document-to-chat workflow:

- user profile management
- PDF upload and document metadata
- background PDF processing
- retrieval-augmented chat with citations

Later phases extend the same foundation into quizzes, study plans, and career features.