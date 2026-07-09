"""Learning-progress endpoints — Phase 2 learning tools."""
from fastapi import APIRouter, Depends

from auth import get_current_user_id
from models import WeakTopicItem, WeakTopicsResponse
from services.learning_progress import get_weak_topics

router = APIRouter(tags=["learning-progress"])


@router.get("/v1/learning-progress/weak-topics", response_model=WeakTopicsResponse)
async def weak_topics(user_id: str = Depends(get_current_user_id)):
    """Weak topics (progress < 60%), enriched with uncovered prerequisites.

    e.g. "you're weak in Concurrency, and Concurrency requires Processes &
    Threads which you haven't covered yet" — not a flat score list.
    """
    items = await get_weak_topics(user_id)
    return WeakTopicsResponse(data=[WeakTopicItem(**item) for item in items])
