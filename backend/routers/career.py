"""Phase 3 career-profile and self-reported skill endpoints."""
import asyncio

from fastapi import APIRouter, Depends, HTTPException, Request, status

from auth import get_current_user_id
from database import get_admin_client
from models import CareerProfilePatch, CareerProfileResponse, UserSkillCreate, UserSkillResponse

router = APIRouter(prefix="/v1/career", tags=["career"])


@router.get("/profile", response_model=CareerProfileResponse)
async def get_career_profile(user_id: str = Depends(get_current_user_id)):
    result = await asyncio.to_thread(
        lambda: get_admin_client().table("career_profiles").select("*").eq("user_id", user_id).limit(1).execute()
    )
    if result.data:
        return result.data[0]

    created = await asyncio.to_thread(
        lambda: get_admin_client().table("career_profiles").insert({"user_id": user_id}).execute()
    )
    return created.data[0]


@router.patch("/profile", response_model=CareerProfileResponse)
async def patch_career_profile(request: Request, user_id: str = Depends(get_current_user_id)):
    body = await request.json()
    patch = CareerProfilePatch(**body)
    updates = {field: getattr(patch, field) for field in patch.model_fields_set}
    if not updates:
        return await get_career_profile(user_id)

    if "resume_document_id" in updates and updates["resume_document_id"] is not None:
        document = await asyncio.to_thread(
            lambda: get_admin_client().table("documents").select("id").eq("id", str(updates["resume_document_id"])).eq("user_id", user_id).limit(1).execute()
        )
        if not document.data:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"error": {"code": "invalid_resume_document", "message": "Resume document must belong to you."}})

    result = await asyncio.to_thread(
        lambda: get_admin_client().table("career_profiles").upsert({"user_id": user_id, **updates}, on_conflict="user_id").execute()
    )
    return result.data[0]


@router.get("/skills", response_model=list[UserSkillResponse])
async def list_skills(user_id: str = Depends(get_current_user_id)):
    result = await asyncio.to_thread(
        lambda: get_admin_client().table("user_skills").select("*").eq("user_id", user_id).order("skill_name").execute()
    )
    return result.data or []


@router.post("/skills", response_model=UserSkillResponse, status_code=status.HTTP_201_CREATED)
async def create_skill(body: UserSkillCreate, user_id: str = Depends(get_current_user_id)):
    payload = {"user_id": user_id, **body.model_dump()}
    result = await asyncio.to_thread(lambda: get_admin_client().table("user_skills").upsert(payload, on_conflict="user_id,skill_name").execute())
    return result.data[0]


@router.delete("/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_skill(skill_id: str, user_id: str = Depends(get_current_user_id)):
    result = await asyncio.to_thread(
        lambda: get_admin_client().table("user_skills").delete().eq("id", skill_id).eq("user_id", user_id).execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": {"code": "not_found", "message": "Skill not found."}})
