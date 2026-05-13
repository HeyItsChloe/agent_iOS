"""Tests for backend services."""

import pytest
from datetime import datetime
from uuid import uuid4

from app.models.conversation import ConversationType
from app.models.message import MessageSender, MessageStatus


class TestConversationService:
    """Tests for ConversationService."""

    def test_create_conversation(self, conversation_service):
        """Test creating a new conversation."""
        conv = conversation_service.create_conversation(
            conv_type="single",
            agent_ids=["agent-1"],
            skill_ids=[],
            title="Test Chat",
        )
        
        assert conv["id"] is not None
        assert conv["type"] == "single"
        assert conv["agent_ids"] == ["agent-1"]
        assert conv["title"] == "Test Chat"

    def test_create_group_conversation(self, conversation_service):
        """Test creating a group conversation."""
        conv = conversation_service.create_conversation(
            conv_type="group",
            agent_ids=["agent-1", "agent-2", "agent-3"],
            skill_ids=["skill-1"],
        )
        
        assert conv["type"] == "group"
        assert len(conv["agent_ids"]) == 3
        assert len(conv["skill_ids"]) == 1

    def test_get_conversation(self, conversation_service):
        """Test retrieving a conversation by ID."""
        created = conversation_service.create_conversation(
            conv_type="single",
            agent_ids=["agent-1"],
            skill_ids=[],
        )
        
        retrieved = conversation_service.get_conversation(created["id"])
        
        assert retrieved is not None
        assert retrieved["id"] == created["id"]

    def test_get_nonexistent_conversation(self, conversation_service):
        """Test retrieving a non-existent conversation."""
        result = conversation_service.get_conversation("nonexistent-id")
        assert result is None

    def test_list_conversations(self, conversation_service):
        """Test listing all conversations."""
        # Create multiple conversations
        conversation_service.create_conversation(
            conv_type="single",
            agent_ids=["agent-1"],
            skill_ids=[],
        )
        conversation_service.create_conversation(
            conv_type="group",
            agent_ids=["agent-1", "agent-2"],
            skill_ids=[],
        )
        
        conversations = conversation_service.list_conversations()
        
        assert len(conversations) == 2

    def test_delete_conversation(self, conversation_service):
        """Test deleting a conversation."""
        conv = conversation_service.create_conversation(
            conv_type="single",
            agent_ids=["agent-1"],
            skill_ids=[],
        )
        
        result = conversation_service.delete_conversation(conv["id"])
        
        assert result is True
        assert conversation_service.get_conversation(conv["id"]) is None

    def test_delete_nonexistent_conversation(self, conversation_service):
        """Test deleting a non-existent conversation."""
        result = conversation_service.delete_conversation("nonexistent-id")
        assert result is False


class TestAgentManager:
    """Tests for AgentManager."""

    def test_list_agents(self, agent_manager):
        """Test listing all agents."""
        agents = agent_manager.list_agents()
        
        # Should have built-in agents
        assert len(agents) > 0

    def test_list_builtin_agents(self, agent_manager):
        """Test listing built-in agents only."""
        builtin = agent_manager.list_builtin_agents()
        
        # All returned agents should be built-in
        for agent in builtin:
            assert agent["is_builtin"] is True

    def test_get_agent(self, agent_manager):
        """Test getting an agent by ID."""
        agents = agent_manager.list_agents()
        if agents:
            agent = agent_manager.get_agent(agents[0]["id"])
            assert agent is not None
            assert agent["id"] == agents[0]["id"]

    def test_get_nonexistent_agent(self, agent_manager):
        """Test getting a non-existent agent."""
        result = agent_manager.get_agent("nonexistent-id")
        assert result is None

    def test_create_custom_agent(self, agent_manager):
        """Test creating a custom agent."""
        agent = agent_manager.create_agent(
            name="My Custom Agent",
            description="A test custom agent",
            avatar="🧪",
            color="#FF5733",
            system_prompt="You are a test agent.",
            tool_ids=["terminal"],
            skill_ids=[],
        )
        
        assert agent.id is not None
        assert agent.name == "My Custom Agent"
        assert agent.is_builtin is False

    def test_delete_custom_agent(self, agent_manager):
        """Test deleting a custom agent."""
        agent = agent_manager.create_agent(
            name="Deletable Agent",
            description="Will be deleted",
        )
        
        result = agent_manager.delete_agent(agent.id)
        
        assert result is True
        assert agent_manager.get_agent(agent.id) is None

    def test_cannot_delete_builtin_agent(self, agent_manager):
        """Test that built-in agents cannot be deleted."""
        builtin_agents = agent_manager.list_builtin_agents()
        if builtin_agents:
            result = agent_manager.delete_agent(builtin_agents[0]["id"])
            assert result is False

    def test_list_available_tools(self, agent_manager):
        """Test listing available tools."""
        tools = agent_manager.list_available_tools()
        
        assert len(tools) > 0
        # Each tool should have required fields
        for tool in tools:
            assert "id" in tool
            assert "name" in tool


class TestSkillManager:
    """Tests for SkillManager."""

    def test_list_skills(self, skill_manager):
        """Test listing all skills."""
        skills = skill_manager.list_skills()
        
        # Should have built-in skills
        assert len(skills) > 0

    def test_list_builtin_skills(self, skill_manager):
        """Test listing built-in skills only."""
        builtin = skill_manager.list_builtin_skills()
        
        # All returned skills should be built-in
        for skill in builtin:
            assert skill["is_builtin"] is True

    def test_get_skill(self, skill_manager):
        """Test getting a skill by ID."""
        skills = skill_manager.list_skills()
        if skills:
            skill = skill_manager.get_skill(skills[0]["id"])
            assert skill is not None
            assert skill["id"] == skills[0]["id"]

    def test_get_nonexistent_skill(self, skill_manager):
        """Test getting a non-existent skill."""
        result = skill_manager.get_skill("nonexistent-id")
        assert result is None

    def test_create_custom_skill(self, skill_manager):
        """Test creating a custom skill."""
        skill = skill_manager.create_skill(
            name="My Custom Skill",
            description="A test custom skill",
            icon="🧪",
            category="custom",
            triggers=["test", "testing"],
            content="# Test Skill\n\nContent here.",
        )
        
        assert skill.id is not None
        assert skill.name == "My Custom Skill"
        assert skill.is_builtin is False

    def test_delete_custom_skill(self, skill_manager):
        """Test deleting a custom skill."""
        skill = skill_manager.create_skill(
            name="Deletable Skill",
            description="Will be deleted",
            content="Delete me",
        )
        
        result = skill_manager.delete_skill(skill.id)
        
        assert result is True
        assert skill_manager.get_skill(skill.id) is None

    def test_cannot_delete_builtin_skill(self, skill_manager):
        """Test that built-in skills cannot be deleted."""
        builtin_skills = skill_manager.list_builtin_skills()
        if builtin_skills:
            result = skill_manager.delete_skill(builtin_skills[0]["id"])
            assert result is False

    def test_search_skills(self, skill_manager):
        """Test searching skills."""
        # Create a skill with specific name
        skill_manager.create_skill(
            name="Unique Searchable Skill",
            description="For search testing",
            content="Search content",
        )
        
        results = skill_manager.search_skills("Unique Searchable")
        
        assert len(results) >= 1
        assert any("Unique Searchable" in s["name"] for s in results)

    def test_list_categories(self, skill_manager):
        """Test listing skill categories."""
        categories = skill_manager.list_categories()
        
        assert len(categories) > 0
        for cat in categories:
            assert "id" in cat
            assert "name" in cat
