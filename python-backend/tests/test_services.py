"""Tests for backend services."""

import pytest
from datetime import datetime
from uuid import uuid4
from unittest.mock import MagicMock, AsyncMock

from app.models.conversation import ConversationType
from app.models.message import MessageSender, MessageStatus


class MockWebSocket:
    """Mock WebSocket for testing."""
    
    def __init__(self, connected=True):
        self.client_state = MagicMock()
        self.client_state.name = "CONNECTED" if connected else "DISCONNECTED"
        self.sent_messages = []
        self._closed = False
    
    async def send_json(self, data):
        if self._closed:
            raise Exception("WebSocket is closed")
        self.sent_messages.append(data)
    
    def close(self):
        self._closed = True
        self.client_state.name = "DISCONNECTED"


class TestConversationService:
    """Tests for ConversationService."""

    def test_create_conversation(self, conversation_service):
        """Test creating a new conversation."""
        conv = conversation_service.create_conversation(
            conversation_type="single",
            agent_ids=["agent-1"],
            skill_ids=[],
            title="Test Chat",
        )
        
        assert conv.id is not None
        assert conv.type == "single"
        assert conv.agent_ids == ["agent-1"]
        assert conv.title == "Test Chat"

    def test_create_group_conversation(self, conversation_service):
        """Test creating a group conversation."""
        conv = conversation_service.create_conversation(
            conversation_type="group",
            agent_ids=["agent-1", "agent-2", "agent-3"],
            skill_ids=["skill-1"],
            title=None,
        )
        
        assert conv.type == "group"
        assert len(conv.agent_ids) == 3
        assert len(conv.skill_ids) == 1

    def test_get_conversation(self, conversation_service):
        """Test retrieving a conversation by ID."""
        created = conversation_service.create_conversation(
            conversation_type="single",
            agent_ids=["agent-1"],
            skill_ids=[],
            title=None,
        )
        
        retrieved = conversation_service.get_conversation(created.id)
        
        assert retrieved is not None
        assert retrieved.id == created.id

    def test_get_nonexistent_conversation(self, conversation_service):
        """Test retrieving a non-existent conversation."""
        result = conversation_service.get_conversation("nonexistent-id")
        assert result is None

    def test_list_conversations(self, conversation_service):
        """Test listing all conversations."""
        # Create multiple conversations
        conversation_service.create_conversation(
            conversation_type="single",
            agent_ids=["agent-1"],
            skill_ids=[],
            title=None,
        )
        conversation_service.create_conversation(
            conversation_type="group",
            agent_ids=["agent-1", "agent-2"],
            skill_ids=[],
            title=None,
        )
        
        conversations = conversation_service.list_conversations()
        
        assert len(conversations) == 2

    def test_delete_conversation(self, conversation_service):
        """Test deleting a conversation."""
        conv = conversation_service.create_conversation(
            conversation_type="single",
            agent_ids=["agent-1"],
            skill_ids=[],
            title=None,
        )
        
        result = conversation_service.delete_conversation(conv.id)
        
        assert result is True
        assert conversation_service.get_conversation(conv.id) is None

    def test_delete_nonexistent_conversation(self, conversation_service):
        """Test deleting a non-existent conversation."""
        result = conversation_service.delete_conversation("nonexistent-id")
        assert result is False


class TestWebSocketManagement:
    """Tests for WebSocket registration and broadcasting."""

    def test_register_websocket(self, conversation_service):
        """Test registering a WebSocket connection."""
        conv = conversation_service.create_conversation(
            conversation_type="single",
            agent_ids=["agent-1"],
            skill_ids=[],
            title=None,
        )
        
        ws = MockWebSocket()
        conversation_service.register_websocket(conv.id, ws)
        
        assert conv.id in conversation_service._websockets
        assert ws in conversation_service._websockets[conv.id]

    def test_unregister_websocket(self, conversation_service):
        """Test unregistering a WebSocket connection."""
        conv = conversation_service.create_conversation(
            conversation_type="single",
            agent_ids=["agent-1"],
            skill_ids=[],
            title=None,
        )
        
        ws = MockWebSocket()
        conversation_service.register_websocket(conv.id, ws)
        conversation_service.unregister_websocket(conv.id, ws)
        
        # Empty list should be deleted
        assert conv.id not in conversation_service._websockets

    def test_unregister_one_of_multiple_websockets(self, conversation_service):
        """Test unregistering one WebSocket when multiple are registered."""
        conv = conversation_service.create_conversation(
            conversation_type="single",
            agent_ids=["agent-1"],
            skill_ids=[],
            title=None,
        )
        
        ws1 = MockWebSocket()
        ws2 = MockWebSocket()
        conversation_service.register_websocket(conv.id, ws1)
        conversation_service.register_websocket(conv.id, ws2)
        conversation_service.unregister_websocket(conv.id, ws1)
        
        assert conv.id in conversation_service._websockets
        assert len(conversation_service._websockets[conv.id]) == 1
        assert ws2 in conversation_service._websockets[conv.id]

    @pytest.mark.asyncio
    async def test_broadcast_to_connected_websocket(self, conversation_service):
        """Test broadcasting to a connected WebSocket."""
        conv = conversation_service.create_conversation(
            conversation_type="single",
            agent_ids=["agent-1"],
            skill_ids=[],
            title=None,
        )
        
        ws = MockWebSocket(connected=True)
        conversation_service.register_websocket(conv.id, ws)
        
        await conversation_service._broadcast_event(conv.id, {"type": "test", "data": "hello"})
        
        assert len(ws.sent_messages) == 1
        assert ws.sent_messages[0]["type"] == "test"

    @pytest.mark.asyncio
    async def test_broadcast_removes_dead_websockets(self, conversation_service):
        """Test that broadcasting removes disconnected WebSockets."""
        conv = conversation_service.create_conversation(
            conversation_type="single",
            agent_ids=["agent-1"],
            skill_ids=[],
            title=None,
        )
        
        ws_connected = MockWebSocket(connected=True)
        ws_disconnected = MockWebSocket(connected=False)
        conversation_service.register_websocket(conv.id, ws_connected)
        conversation_service.register_websocket(conv.id, ws_disconnected)
        
        await conversation_service._broadcast_event(conv.id, {"type": "test"})
        
        # Disconnected WebSocket should be removed
        assert len(conversation_service._websockets[conv.id]) == 1
        assert ws_connected in conversation_service._websockets[conv.id]
        
        # Only connected WebSocket should receive the message
        assert len(ws_connected.sent_messages) == 1
        assert len(ws_disconnected.sent_messages) == 0

    @pytest.mark.asyncio
    async def test_broadcast_to_wrong_conversation_does_nothing(self, conversation_service):
        """Test that broadcasting to wrong conversation ID has no effect."""
        conv = conversation_service.create_conversation(
            conversation_type="single",
            agent_ids=["agent-1"],
            skill_ids=[],
            title=None,
        )
        
        ws = MockWebSocket()
        conversation_service.register_websocket(conv.id, ws)
        
        # Broadcast to different conversation
        await conversation_service._broadcast_event("different-conv-id", {"type": "test"})
        
        # WebSocket should not receive the message
        assert len(ws.sent_messages) == 0


class TestConversationIsolation:
    """Tests for conversation isolation - ensuring events don't cross-contaminate."""

    def test_websocket_registration_is_per_conversation(self, conversation_service):
        """Test that WebSocket registration is isolated per conversation."""
        conv_a = conversation_service.create_conversation(
            conversation_type="single",
            agent_ids=["agent-1"],
            skill_ids=[],
            title="Conversation A",
        )
        conv_b = conversation_service.create_conversation(
            conversation_type="single",
            agent_ids=["agent-1"],
            skill_ids=[],
            title="Conversation B",
        )
        
        ws_a = MockWebSocket()
        ws_b = MockWebSocket()
        conversation_service.register_websocket(conv_a.id, ws_a)
        conversation_service.register_websocket(conv_b.id, ws_b)
        
        assert ws_a in conversation_service._websockets[conv_a.id]
        assert ws_a not in conversation_service._websockets.get(conv_b.id, [])
        assert ws_b in conversation_service._websockets[conv_b.id]
        assert ws_b not in conversation_service._websockets.get(conv_a.id, [])

    @pytest.mark.asyncio
    async def test_broadcast_only_goes_to_correct_conversation(self, conversation_service):
        """Test that broadcasts only go to the correct conversation's WebSockets."""
        conv_a = conversation_service.create_conversation(
            conversation_type="single",
            agent_ids=["agent-1"],
            skill_ids=[],
            title="Conversation A",
        )
        conv_b = conversation_service.create_conversation(
            conversation_type="single",
            agent_ids=["agent-1"],
            skill_ids=[],
            title="Conversation B",
        )
        
        ws_a = MockWebSocket()
        ws_b = MockWebSocket()
        conversation_service.register_websocket(conv_a.id, ws_a)
        conversation_service.register_websocket(conv_b.id, ws_b)
        
        # Broadcast to conversation A
        await conversation_service._broadcast_event(conv_a.id, {"type": "message", "content": "for A"})
        
        # Only ws_a should receive the message
        assert len(ws_a.sent_messages) == 1
        assert ws_a.sent_messages[0]["content"] == "for A"
        assert len(ws_b.sent_messages) == 0

    def test_messages_are_isolated_per_conversation(self, conversation_service):
        """Test that messages added to one conversation don't appear in another."""
        conv_a = conversation_service.create_conversation(
            conversation_type="single",
            agent_ids=["agent-1"],
            skill_ids=[],
            title="Conversation A",
        )
        conv_b = conversation_service.create_conversation(
            conversation_type="single",
            agent_ids=["agent-1"],
            skill_ids=[],
            title="Conversation B",
        )
        
        # Get the internal conversation objects
        internal_conv_a = conversation_service._conversations[conv_a.id]
        
        # Add a message to conversation A
        from app.models.message import Message
        message = Message(
            id=str(uuid4()),
            conversation_id=conv_a.id,
            content="Message for A only",
            sender=MessageSender.USER,
            status=MessageStatus.SENT,
        )
        internal_conv_a.messages.append(message)
        
        # Verify isolation
        assert len(conversation_service._conversations[conv_a.id].messages) == 1
        assert len(conversation_service._conversations[conv_b.id].messages) == 0


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
