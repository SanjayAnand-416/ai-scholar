from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routers import (
    conversations,
    career,
    documents,
    flashcards,
    knowledge_graph,
    learning_progress,
    profile,
    quizzes,
    study_plans,
)

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
app.include_router(career.router)
app.include_router(knowledge_graph.router)
app.include_router(quizzes.router)
app.include_router(learning_progress.router)
app.include_router(study_plans.router)
app.include_router(flashcards.router)


@app.get("/health")
def health():
    return {"status": "ok"}
