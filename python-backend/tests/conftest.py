"""Pytest configuration and fixtures for backend tests."""

import pytest
from fastapi.testclient import TestClient

# Add parent directory to path for imports
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.main import app
from app.services.conversation_service import ConversationService
from app.services.agent_manager import AgentManager
from app.services.skill_manager import SkillManager


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def conversation_service():
    """Create a fresh ConversationService instance."""
    service = ConversationService()
    # Clear any existing data
    service._conversations = {}
    service._websockets = {}
    return service


@pytest.fixture
def agent_manager():
    """Create a fresh AgentManager instance."""
    manager = AgentManager()
    return manager


@pytest.fixture
def skill_manager():
    """Create a fresh SkillManager instance."""
    manager = SkillManager()
    return manager


@pytest.fixture
def sample_conversation_data():
    """Sample data for creating a conversation."""
    return {
        "type": "single",
        "agent_ids": ["general-assistant"],
        "skill_ids": [],
        "title": "Test Conversation",
    }


@pytest.fixture
def sample_agent_data():
    """Sample data for creating an agent."""
    return {
        "name": "Test Agent",
        "description": "A test agent for unit tests",
        "avatar": "🧪",
        "color": "#FF5733",
        "system_prompt": "You are a helpful test agent.",
        "tool_ids": ["terminal"],
        "skill_ids": [],
    }


@pytest.fixture
def sample_skill_data():
    """Sample data for creating a skill."""
    return {
        "name": "Test Skill",
        "description": "A test skill for unit tests",
        "icon": "🧪",
        "category": "custom",
        "triggers": ["test", "testing"],
        "content": "# Test Skill\n\nThis is a test skill.",
    }
