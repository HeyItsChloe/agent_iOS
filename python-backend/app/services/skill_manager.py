"""Skill management service."""

from typing import Any, Optional
from uuid import uuid4

from app.models.skill import (
    Skill,
    SkillCategory,
    SkillResponse,
    BUILTIN_SKILLS,
    SKILL_CATEGORIES,
)


class SkillManager:
    """Service for managing skills."""
    
    def __init__(self):
        # Initialize with built-in skills
        self._skills: dict[str, Skill] = {
            skill.id: skill for skill in BUILTIN_SKILLS
        }
    
    def list_skills(self) -> list[dict[str, Any]]:
        """List all available skills."""
        return [skill.model_dump() for skill in self._skills.values()]
    
    def list_builtin_skills(self) -> list[dict[str, Any]]:
        """List built-in skills only."""
        return [
            skill.model_dump() 
            for skill in self._skills.values() 
            if skill.is_builtin
        ]
    
    def list_custom_skills(self) -> list[dict[str, Any]]:
        """List custom skills only."""
        return [
            skill.model_dump() 
            for skill in self._skills.values() 
            if not skill.is_builtin
        ]
    
    def list_categories(self) -> list[dict[str, Any]]:
        """List skill categories."""
        return SKILL_CATEGORIES
    
    def get_skill(self, skill_id: str) -> Optional[dict[str, Any]]:
        """Get a skill by ID."""
        skill = self._skills.get(skill_id)
        return skill.model_dump() if skill else None
    
    def create_skill(
        self,
        name: str,
        description: str,
        icon: str = "⚡",
        category: str = "custom",
        triggers: list[str] = None,
        content: str = "",
    ) -> SkillResponse:
        """Create a new custom skill."""
        skill = Skill(
            id=str(uuid4()),
            name=name,
            description=description,
            icon=icon,
            category=SkillCategory(category),
            triggers=triggers or [],
            content=content,
            is_builtin=False,
        )
        
        self._skills[skill.id] = skill
        return SkillResponse(**skill.model_dump())
    
    def update_skill(
        self,
        skill_id: str,
        **kwargs,
    ) -> Optional[SkillResponse]:
        """Update a skill."""
        skill = self._skills.get(skill_id)
        if not skill:
            return None
        
        # Don't allow updating built-in skills
        if skill.is_builtin:
            return None
        
        # Update fields
        for key, value in kwargs.items():
            if hasattr(skill, key):
                if key == "category":
                    value = SkillCategory(value)
                setattr(skill, key, value)
        
        return SkillResponse(**skill.model_dump())
    
    def delete_skill(self, skill_id: str) -> bool:
        """Delete a custom skill."""
        skill = self._skills.get(skill_id)
        if not skill or skill.is_builtin:
            return False
        
        del self._skills[skill_id]
        return True
    
    def get_skills_by_category(self, category: str) -> list[dict[str, Any]]:
        """Get skills by category."""
        return [
            skill.model_dump()
            for skill in self._skills.values()
            if skill.category == category
        ]
    
    def search_skills(self, query: str) -> list[dict[str, Any]]:
        """Search skills by name, description, or triggers."""
        query = query.lower()
        results = []
        
        for skill in self._skills.values():
            if (
                query in skill.name.lower()
                or query in skill.description.lower()
                or any(query in trigger.lower() for trigger in skill.triggers)
            ):
                results.append(skill.model_dump())
        
        return results
