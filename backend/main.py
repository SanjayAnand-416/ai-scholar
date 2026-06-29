from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routers import conversations, documents, profile

app = FastAPI(title="AI Scholar API", version="0.1.0")

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router)
app.include_router(documents.router)
app.include_router(conversations.router)


@app.get("/health")
def health():
    return {"status": "ok"}
