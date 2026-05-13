"""Skill management endpoints."""

from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.skill_manager import SkillManager
from app.models.skill import SkillCreate, SkillResponse

router = APIRouter()

# Skill manager instance
skill_manager = SkillManager()


class CreateSkillRequest(BaseModel):
    """Request to create a custom skill."""
    name: str
    description: str
    icon: str = "⚡"
    category: str = "custom"
    triggers: list[str] = []
    content: str


class UpdateSkillRequest(BaseModel):
    """Request to update a skill."""
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    category: Optional[str] = None
    triggers: Optional[list[str]] = None
    content: Optional[str] = None


@router.get("/")
async def list_skills():
    """List all available skills (built-in and custom)."""
    return skill_manager.list_skills()


@router.get("/builtin")
async def list_builtin_skills():
    """List built-in skills only."""
    return skill_manager.list_builtin_skills()


@router.get("/custom")
async def list_custom_skills():
    """List custom skills only."""
    return skill_manager.list_custom_skills()


@router.get("/categories")
async def list_categories():
    """List skill categories."""
    return skill_manager.list_categories()


@router.post("/", response_model=SkillResponse)
async def create_skill(request: CreateSkillRequest):
    """Create a new custom skill."""
    skill = skill_manager.create_skill(
        name=request.name,
        description=request.description,
        icon=request.icon,
        category=request.category,
        triggers=request.triggers,
        content=request.content,
    )
    return skill


@router.get("/{skill_id}")
async def get_skill(skill_id: str):
    """Get a specific skill."""
    skill = skill_manager.get_skill(skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return skill


@router.put("/{skill_id}")
async def update_skill(skill_id: str, request: UpdateSkillRequest):
    """Update a skill."""
    skill = skill_manager.update_skill(
        skill_id=skill_id,
        **request.model_dump(exclude_none=True),
    )
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return skill


@router.delete("/{skill_id}")
async def delete_skill(skill_id: str):
    """Delete a custom skill."""
    success = skill_manager.delete_skill(skill_id)
    if not success:
        raise HTTPException(status_code=404, detail="Skill not found or is built-in")
    return {"status": "deleted"}
