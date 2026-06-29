# Document Processing Phase 1 Problems and Fixes

## Context

The document upload flow was expected to move uploaded PDFs through this Phase 1 pipeline:

```text
upload PDF -> store in Supabase Storage -> create documents row -> extract pages -> create chunks -> create embeddings -> insert document_chunks -> mark document ready
```

The UI was showing documents stuck in `Processing` or failed after upload.

## Problems Faced

### 1. Documents Stayed in Processing

Uploaded PDFs were visible in the UI, but they did not become `Ready`.

Database inspection showed:

```text
status = processing
document_pages existed
document_chunks = 0
```

This proved that upload and page extraction were working, but processing stopped before chunk insertion.

### 2. PDF Chunker Could Hang

The chunking loop in `backend/services/pdf_processor.py` could repeat the same position near the end of a document.

This caused the background processing task to hang forever, leaving the document status as `processing`.

### 3. Embedding Dimension Mismatch

The backend was producing 768-dimensional embeddings, but Supabase was still configured for 1536-dimensional vectors.

The database error was:

```text
expected 1536 dimensions, not 768
```

Because of this, `document_chunks` rows could not be inserted.

### 4. External Embedding APIs Were Unreliable

The configured external embedding providers did not complete successfully during testing:

```text
Gemini: 404 Not Found
Hugging Face: ConnectError / DNS error
```

This meant document processing depended on APIs that were not available in the local development environment.

### 5. Stale Error Messages Remained After Reprocessing

Some documents became `ready` after fixes, but their old `error_message` values remained in the database.

This could confuse the UI and make successful documents look unhealthy internally.

### 6. Scanned PDFs Had No Extractable Text

One PDF failed with:

```text
No extractable text found in the PDF.
```

This happens when a PDF is scanned/image-based. `pypdf` can extract embedded text, but it cannot perform OCR.

## Fixes Applied

### 1. Fixed the Chunking Loop

File changed:

```text
backend/services/pdf_processor.py
```

The loop now:

- breaks cleanly at the end of the document
- guarantees that the next chunk position moves forward
- avoids infinite loops caused by overlap logic

### 2. Added Local 768-Dimensional Embeddings

File changed:

```text
backend/services/embeddings.py
```

Added:

```env
EMBEDDING_PROVIDER=local
```

This uses a deterministic local hashing-vectorizer style embedding. It is not as semantically strong as Gemini or Hugging Face, but it is good enough to make Phase 1 upload, chunk storage, and retrieval work during development.

### 3. Updated Backend Configuration

File changed:

```text
backend/config.py
```

Added support for:

```text
EMBEDDING_PROVIDER
GEMINI_API_KEY
HUGGINGFACE_API_KEY
GROQ_API_KEY
```

### 4. Updated Local Environment

File changed:

```text
backend/.env
```

Set:

```env
EMBEDDING_PROVIDER=local
```

### 5. Applied Supabase Vector Migration

Migration applied:

```text
supabase/migrations/20260628120000_phase1_vector_768.sql
```

This changed the live Supabase project to use 768-dimensional vectors:

```text
document_chunks.embedding -> vector(768)
match_chunks(query_embedding) -> vector(768)
```

After applying it, the backend embeddings and database schema matched.

### 6. Added Reprocess Endpoint

Files changed:

```text
backend/routers/documents.py
backend/tasks.py
```

Added endpoint:

```text
POST /v1/documents/{document_id}/reprocess
```

This lets the backend retry a failed or stuck document using the PDF already stored in Supabase Storage.

### 7. Made Processing More Idempotent

File changed:

```text
backend/tasks.py
```

When reprocessing, the task clears existing partial pages/chunks before inserting fresh ones.

On successful processing, it now clears `error_message`.

## Verification

Backend tests passed:

```text
Ran 5 tests
OK
```

Syntax checks passed for backend modules.

Supabase migrations confirmed:

```text
20260628090043 applied locally and remotely
20260628120000 applied locally and remotely
```

Documents successfully reprocessed:

```text
Resume_project_Document          ready, 7 pages, 3 chunks
AI_Scholar_Design_Document       ready, 32 pages, 34 chunks
Overview of AI-Driven Resume...  ready, 6 pages, 9 chunks
```

Retrieval was verified with `match_chunks`, which returned results.

## Remaining Limitation

Image-only or scanned PDFs still require OCR.

Possible options:

```text
Tesseract local OCR
Google Vision API
Google Document AI
Hugging Face OCR model
```

Until OCR is added, only text-based PDFs can be processed into searchable chunks.

