# AI Scholar Free Deployment Guide

This guide deploys the Phase 1 app without paid services.

## Free Hosting Stack

- Frontend: Vercel Hobby
- Backend: Render Free Web Service
- Database/Auth/Storage: Supabase Free
- Embeddings: local hashing embeddings, no external embedding API
- Chat generation: Groq API key

## 1. Supabase

Confirm migrations are applied:

```bash
supabase migration list
```

Both local and remote should show:

```text
20260628090043
20260628120000
```

The second migration is required because the app stores 768-dimensional embeddings.

## 2. Backend on Render

Create a free Render Web Service.

Use these settings:

```text
Root directory: backend
Build command: pip install -r requirements.txt
Start command: uvicorn main:app --host 0.0.0.0 --port $PORT
```

Environment variables:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SECRET_KEY=your_supabase_service_role_key
CORS_ORIGINS=https://your-vercel-app.vercel.app
EMBEDDING_PROVIDER=local
GROQ_API_KEY=your_groq_key
```

Optional:

```env
GEMINI_API_KEY=
HUGGINGFACE_API_KEY=
```

Expected backend URL:

```text
https://ai-scholar-api.onrender.com
```

Render free services may sleep when inactive, so the first request after inactivity can be slow.

## 3. Frontend on Vercel

Create a free Vercel project.

Use these settings:

```text
Root directory: frontend
Build command: npm run build
```

Environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=https://your-render-backend-url.onrender.com
```

Expected frontend URL:

```text
https://your-project.vercel.app
```

## 4. Supabase Auth URLs

In Supabase Dashboard, add your frontend URL to the Auth URL settings:

```text
Site URL: https://your-project.vercel.app
Redirect URLs:
https://your-project.vercel.app
https://your-project.vercel.app/auth
```

## 5. Final Test

After both deployments are live:

```text
1. Open the Vercel frontend URL.
2. Sign up or sign in.
3. Edit profile.
4. Upload a text-based PDF.
5. Wait until it becomes Ready.
6. Open Library.
7. Click Chat.
8. Ask a question about the PDF.
9. Confirm the answer includes page citations.
```

## Known Limitation

Scanned/image-only PDFs need OCR and will fail with:

```text
No extractable text found in the PDF.
```

Use text-based PDFs until OCR is added.

