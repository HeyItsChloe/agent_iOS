"""Service classes for business logic."""

from app.services.conversation_service import ConversationService
from app.services.agent_manager import AgentManager
from app.services.skill_manager import SkillManager

# Singleton instances shared across all routes
conversation_service = ConversationService()
agent_manager = AgentManager()
skill_manager = SkillManager()

__all__ = [
    "ConversationService",
    "AgentManager", 
    "SkillManager",
    "conversation_service",
    "agent_manager",
    "skill_manager",
]
