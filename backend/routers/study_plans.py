"""Study plan CRUD endpoints — Phase 2 learning tools (thinnest slice, no special logic)."""
import asyncio

from fastapi import APIRouter, Depends, HTTPException, status

from auth import get_current_user_id
from database import get_admin_client
from models import (
    StudyPlanCreate,
    StudyPlanItemCreate,
    StudyPlanItemPatch,
    StudyPlanItemResponse,
    StudyPlanResponse,
)

router = APIRouter(tags=["study-plans"])


async def _get_own_plan(plan_id: str, user_id: str) -> dict:
    db = get_admin_client()
    result = await asyncio.to_thread(
        lambda: db.table("study_plans").select("*").eq("id", plan_id).eq("user_id", user_id).limit(1).execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Study plan not found."}},
        )
    return result.data[0]


# ─── POST /v1/study-plans ──────────────────────────────────────────────────

@router.post("/v1/study-plans", response_model=StudyPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_study_plan(body: StudyPlanCreate, user_id: str = Depends(get_current_user_id)):
    db = get_admin_client()
    payload = {
        "user_id": user_id,
        "title": body.title,
        "goal": body.goal,
        "start_date": body.start_date,
        "end_date": body.end_date,
    }
    result = await asyncio.to_thread(lambda: db.table("study_plans").insert(payload).execute())
    return StudyPlanResponse(**result.data[0])


# ─── GET /v1/study-plans/{id} ──────────────────────────────────────────────

@router.get("/v1/study-plans/{plan_id}", response_model=StudyPlanResponse)
async def get_study_plan(plan_id: str, user_id: str = Depends(get_current_user_id)):
    plan = await _get_own_plan(plan_id, user_id)
    return StudyPlanResponse(**plan)


# ─── POST /v1/study-plans/{id}/items ───────────────────────────────────────

@router.post(
    "/v1/study-plans/{plan_id}/items",
    response_model=StudyPlanItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_study_plan_item(
    plan_id: str, body: StudyPlanItemCreate, user_id: str = Depends(get_current_user_id)
):
    db = get_admin_client()
    await _get_own_plan(plan_id, user_id)

    payload = {
        "study_plan_id": plan_id,
        "document_id": str(body.document_id) if body.document_id else None,
        "topic": body.topic,
        "scheduled_date": body.scheduled_date,
        "estimated_minutes": body.estimated_minutes,
    }
    result = await asyncio.to_thread(lambda: db.table("study_plan_items").insert(payload).execute())
    return StudyPlanItemResponse(**result.data[0])


# ─── PATCH /v1/study-plan-items/{item_id} ──────────────────────────────────

@router.patch("/v1/study-plan-items/{item_id}", response_model=StudyPlanItemResponse)
async def patch_study_plan_item(
    item_id: str, body: StudyPlanItemPatch, user_id: str = Depends(get_current_user_id)
):
    db = get_admin_client()

    item_result = await asyncio.to_thread(
        lambda: db.table("study_plan_items").select("*, study_plans(user_id)").eq("id", item_id).limit(1).execute()
    )
    if not item_result.data or item_result.data[0]["study_plans"]["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Study plan item not found."}},
        )

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates.get("status") == "completed":
        updates["completed_at"] = "now()"
    if not updates:
        item = item_result.data[0]
        item.pop("study_plans", None)
        return StudyPlanItemResponse(**item)

    result = await asyncio.to_thread(
        lambda: db.table("study_plan_items").update(updates).eq("id", item_id).execute()
    )
    return StudyPlanItemResponse(**result.data[0])
