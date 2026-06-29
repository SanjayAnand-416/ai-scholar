# AI Scholar

AI Scholar is an intelligent learning and career-success platform for students. The project is designed around a focused first milestone: upload study material, ask questions grounded in that material, and build learning tools such as quizzes and study plans on top of the same retrieval layer.

The product plan and database schema are based on [`documents/AI_Scholar_Design_Document.pdf`](documents/AI_Scholar_Design_Document.pdf).

## Core Idea

The system starts with a RAG tutor: a student uploads a PDF, the backend extracts and chunks the content, stores embeddings in Supabase Postgres with pgvector, and answers questions with citations back to the original document pages.

Later phases extend the same foundation into:

- quiz and revision-note generation
- study planning and learning progress tracking
- career profile analysis
- skill-gap analysis against target roles
- a unified student overview and mentor-style experience

## Tech Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** FastAPI, Python, Pydantic
- **Auth:** Supabase Auth
- **Database:** Supabase Postgres
- **Vector Search:** pgvector with Gemini `text-embedding-004` sized embeddings
- **Storage:** Supabase Storage for private document uploads

## Repository Structure

```text
ai-scholar/
├── backend/                 # FastAPI API server
│   ├── main.py              # App entrypoint and route registration
│   ├── auth.py              # Supabase JWT verification
│   ├── database.py          # Supabase client helpers
│   ├── models.py            # Pydantic request/response models
│   ├── routers/             # API routers
│   └── requirements.txt     # Python dependencies
├── frontend/                # Next.js application
│   ├── src/app/auth/        # Sign in / sign up screen
│   ├── src/app/profile/     # Profile editor
│   └── src/lib/             # Supabase and API clients
├── supabase/
│   ├── config.toml          # Supabase local config
│   └── migrations/          # Database schema migrations
└── documents/
    └── AI_Scholar_Design_Document.pdf
```

## Phase 0 Cross-Reference Completion (§3.7)

The following Phase 0 items from the design document cross-reference table are complete:

| Item | Status |
| ---- | ------ |
| Supabase project created and linked | ✅ |
| pgvector extension enabled | ✅ |
| Supabase Auth configured (email/password) | ✅ |
| Private `documents` Storage bucket created | ✅ |
| `profiles` table with all §5.2.1 columns | ✅ |
| `handle_new_user` trigger (auto-creates profile on signup) | ✅ |
| `set_updated_at()` shared trigger function | ✅ |
| `documents` table (structure only, §5.2.2) with status CHECK and `(user_id, file_hash)` unique | ✅ |
| RLS enabled + `own_profile_only` policy on `profiles` | ✅ |
| RLS enabled + `own_documents_only` policy on `documents` | ✅ |
| `idx_documents_user_status` index | ✅ |
| `GET /v1/profile` — returns caller's profile, fields per Appendix B.1 | ✅ |
| `PATCH /v1/profile` — writable fields only; email read-only; server-managed fields → 422 | ✅ |
| Next.js frontend skeleton with Supabase auth (sign up, sign in, session) | ✅ |
| FastAPI backend skeleton with JWT verification middleware | ✅ |

Verified at runtime (2026-06-28):
- Fresh signup → profiles row auto-created by trigger ✅
- `PATCH /v1/profile` with `email`, `id`, `created_at`, `updated_at` → 422 `read_only_field` ✅
- User B cannot read User A's `profiles` or `documents` row (RLS blocks it) ✅

Not yet built (Phase 1+):
- `document_pages`, `document_chunks`, `conversations`, `messages`, `message_sources`
- pgvector embeddings, `match_chunks` function, HNSW index
- `POST /v1/documents` and all other Phase 1+ endpoints
- Quiz, study-plan, career tables (Phase 2/3)

## Current Implementation Status

Implemented:

- Supabase-backed database schema migration for the planned phases
- Profile auto-creation trigger on new Supabase auth users
- Row-level security policies for user-owned data
- FastAPI health endpoint
- FastAPI profile API:
  - `GET /v1/profile`
  - `PATCH /v1/profile`
- Next.js auth page using Supabase email/password auth
- Next.js profile page for editing writable profile fields

Planned next:

- document upload API
- PDF text extraction, chunking, and embedding
- `match_chunks` based retrieval flow
- cited chat over uploaded documents
- quiz and study-plan generation

## Prerequisites

- Node.js and npm
- Python 3.11+
- Supabase project or local Supabase CLI setup

## Environment Variables

Create a backend `.env` file in `backend/`:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SECRET_KEY=your_supabase_service_role_key
CORS_ORIGINS=http://localhost:3000
PORT=5001
EMBEDDING_PROVIDER=local
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
HUGGINGFACE_API_KEY=your_huggingface_api_key_optional
```

Create a frontend `.env.local` file in `frontend/`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:5001
```

Keep the Supabase service-role key server-side only. Do not expose it to the frontend.

## Database Setup

Apply the schema in:

```text
supabase/migrations/20260628090043_create_tables.sql
```

The migration creates:

- profile and document foundation tables
- RAG tables for pages, chunks, conversations, messages, and citations
- quiz, study-plan, and learning-progress tables
- career profile, skills, target role, and gap-analysis tables
- the `student_overview` view
- RLS policies and supporting indexes
- the `match_chunks` RPC function for vector retrieval

## Running the Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 5001
```

Health check:

```bash
curl http://localhost:5001/health
```

## Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Useful routes:

- `/auth` - sign in or create an account
- `/profile` - view and update the signed-in user's profile

## API Overview

Current API:

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Backend health check |
| `GET` | `/v1/profile` | Return the authenticated user's profile |
| `PATCH` | `/v1/profile` | Update writable profile fields |

The full planned API contract is documented in the design document under `documents/`.

## Product Roadmap

1. **Phase 0: Scoping and setup**  
   Repository setup, Supabase Auth, profile model, document metadata foundation.

2. **Phase 1: RAG Tutor MVP**  
   PDF upload, text extraction, chunking, embeddings, retrieval, cited chat, and deployment.

3. **Phase 2: Learning Tools**  
   Quiz generation, revision helpers, study plans, and progress tracking.

4. **Phase 3: Career Module**  
   Career profiles, user skills, target roles, and concrete skill-gap analysis.

5. **Phase 4: Integration and Polish**  
   Unified overview, personalized mentor experience, stronger UI, and edge-case handling.

6. **Phase 5: Multimodal Stretch Work**  
   OCR for handwritten notes, lecture transcription, and scaling improvements.

## Notes

The design document intentionally recommends building a thin vertical slice first. Phases 0-2 are the minimum viable portfolio scope: a deployed RAG tutor with learning tools. Career features and multimodal inputs are planned as later extensions.
