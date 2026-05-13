"""Tests for FastAPI API routes."""

import pytest


class TestHealthEndpoint:
    """Tests for health check endpoint."""

    def test_health_check(self, client):
        """Test the health check endpoint returns OK."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


class TestRootEndpoint:
    """Tests for root endpoint."""

    def test_root(self, client):
        """Test the root endpoint returns app info."""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Agent iOS Backend"
        assert "version" in data
        assert data["status"] == "running"


class TestConversationsAPI:
    """Tests for conversations API endpoints."""

    def test_list_conversations(self, client):
        """Test listing conversations."""
        response = client.get("/api/conversations")
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_create_conversation(self, client, sample_conversation_data):
        """Test creating a conversation."""
        response = client.post(
            "/api/conversations",
            json=sample_conversation_data,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] is not None
        assert data["type"] == sample_conversation_data["type"]

    def test_create_conversation_missing_agent_ids(self, client):
        """Test creating a conversation without agent_ids fails."""
        response = client.post(
            "/api/conversations",
            json={"type": "single"},
        )
        
        # Should fail validation
        assert response.status_code == 422

    def test_get_conversation(self, client, sample_conversation_data):
        """Test getting a specific conversation."""
        # First create a conversation
        create_response = client.post(
            "/api/conversations",
            json=sample_conversation_data,
        )
        conv_id = create_response.json()["id"]
        
        # Then retrieve it
        response = client.get(f"/api/conversations/{conv_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == conv_id

    def test_get_nonexistent_conversation(self, client):
        """Test getting a non-existent conversation returns 404."""
        response = client.get("/api/conversations/nonexistent-id")
        
        assert response.status_code == 404

    def test_delete_conversation(self, client, sample_conversation_data):
        """Test deleting a conversation."""
        # Create a conversation
        create_response = client.post(
            "/api/conversations",
            json=sample_conversation_data,
        )
        conv_id = create_response.json()["id"]
        
        # Delete it
        response = client.delete(f"/api/conversations/{conv_id}")
        
        assert response.status_code == 200
        
        # Verify it's gone
        get_response = client.get(f"/api/conversations/{conv_id}")
        assert get_response.status_code == 404


class TestAgentsAPI:
    """Tests for agents API endpoints."""

    def test_list_agents(self, client):
        """Test listing all agents."""
        response = client.get("/api/agents")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have built-in agents
        assert len(data) > 0

    def test_get_agent(self, client):
        """Test getting a specific agent."""
        # First list agents to get an ID
        list_response = client.get("/api/agents")
        agents = list_response.json()
        
        if agents:
            agent_id = agents[0]["id"]
            response = client.get(f"/api/agents/{agent_id}")
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == agent_id

    def test_get_nonexistent_agent(self, client):
        """Test getting a non-existent agent returns 404."""
        response = client.get("/api/agents/nonexistent-id")
        
        assert response.status_code == 404

    def test_create_agent(self, client, sample_agent_data):
        """Test creating a custom agent."""
        response = client.post(
            "/api/agents",
            json=sample_agent_data,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == sample_agent_data["name"]
        assert data["is_builtin"] is False

    def test_delete_custom_agent(self, client, sample_agent_data):
        """Test deleting a custom agent."""
        # Create an agent
        create_response = client.post(
            "/api/agents",
            json=sample_agent_data,
        )
        agent_id = create_response.json()["id"]
        
        # Delete it
        response = client.delete(f"/api/agents/{agent_id}")
        
        assert response.status_code == 200

    def test_list_tools(self, client):
        """Test listing available tools."""
        response = client.get("/api/agents/tools")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestSkillsAPI:
    """Tests for skills API endpoints."""

    def test_list_skills(self, client):
        """Test listing all skills."""
        response = client.get("/api/skills")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have built-in skills
        assert len(data) > 0

    def test_get_skill(self, client):
        """Test getting a specific skill."""
        # First list skills to get an ID
        list_response = client.get("/api/skills")
        skills = list_response.json()
        
        if skills:
            skill_id = skills[0]["id"]
            response = client.get(f"/api/skills/{skill_id}")
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == skill_id

    def test_get_nonexistent_skill(self, client):
        """Test getting a non-existent skill returns 404."""
        response = client.get("/api/skills/nonexistent-id")
        
        assert response.status_code == 404

    def test_create_skill(self, client, sample_skill_data):
        """Test creating a custom skill."""
        response = client.post(
            "/api/skills",
            json=sample_skill_data,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == sample_skill_data["name"]
        assert data["is_builtin"] is False

    def test_delete_custom_skill(self, client, sample_skill_data):
        """Test deleting a custom skill."""
        # Create a skill
        create_response = client.post(
            "/api/skills",
            json=sample_skill_data,
        )
        skill_id = create_response.json()["id"]
        
        # Delete it
        response = client.delete(f"/api/skills/{skill_id}")
        
        assert response.status_code == 200

    def test_list_categories(self, client):
        """Test listing skill categories."""
        response = client.get("/api/skills/categories")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestSettingsAPI:
    """Tests for settings API endpoints."""

    def test_get_llm_settings(self, client):
        """Test getting LLM settings."""
        response = client.get("/api/settings/llm")
        
        assert response.status_code == 200
        data = response.json()
        assert "model" in data
        assert "has_api_key" in data

    def test_get_app_settings(self, client):
        """Test getting app settings."""
        response = client.get("/api/settings/app")
        
        assert response.status_code == 200
        data = response.json()
        assert "data_dir" in data
        assert "default_workspace" in data

    def test_get_sdk_status(self, client):
        """Test getting SDK status."""
        response = client.get("/api/settings/sdk-status")
        
        assert response.status_code == 200
        data = response.json()
        assert "sdk_available" in data
        assert "llm_configured" in data
