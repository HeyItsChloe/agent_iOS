"""Agent management service with OpenHands SDK integration."""

import json
from pathlib import Path
from typing import Any, Optional
from uuid import uuid4

from app.config import settings
from app.models.agent import (
    Agent,
    AgentType,
    AgentResponse,
    ToolDefinition,
    BUILTIN_AGENTS,
    BUILTIN_TOOLS,
)

# Try to import SDK components
try:
    from app.sdk.agent_factory import (
        create_sdk_agent,
        register_custom_agent,
        TOOL_REGISTRY,
    )
    from app.sdk.llm_factory import create_llm
    SDK_AVAILABLE = True
except ImportError:
    SDK_AVAILABLE = False
    TOOL_REGISTRY = {}


class AgentManager:
    """Service for managing agents with SDK integration."""
    
    def __init__(self):
        # Initialize with built-in agents
        self._agents: dict[str, Agent] = {
            agent.id: agent for agent in BUILTIN_AGENTS
        }
        self._tools: dict[str, ToolDefinition] = {
            tool.id: tool for tool in BUILTIN_TOOLS
        }
        
        # Load persisted custom agents
        self._load_custom_agents()
    
    def list_agents(self) -> list[dict[str, Any]]:
        """List all available agents."""
        return [agent.model_dump() for agent in self._agents.values()]
    
    def list_builtin_agents(self) -> list[dict[str, Any]]:
        """List built-in agents only."""
        return [
            agent.model_dump() 
            for agent in self._agents.values() 
            if agent.is_builtin
        ]
    
    def list_custom_agents(self) -> list[dict[str, Any]]:
        """List custom agents only."""
        return [
            agent.model_dump() 
            for agent in self._agents.values() 
            if not agent.is_builtin
        ]
    
    def get_agent(self, agent_id: str) -> Optional[dict[str, Any]]:
        """Get an agent by ID."""
        agent = self._agents.get(agent_id)
        return agent.model_dump() if agent else None
    
    def create_agent(
        self,
        name: str,
        description: str,
        avatar: Optional[str] = None,
        color: str = "#007AFF",
        system_prompt: str = "",
        tool_ids: list[str] = None,
        skill_ids: list[str] = None,
    ) -> AgentResponse:
        """Create a new custom agent."""
        agent = Agent(
            id=str(uuid4()),
            name=name,
            description=description,
            avatar=avatar or "🤖",
            color=color,
            type=AgentType.CUSTOM,
            system_prompt=system_prompt,
            tool_ids=tool_ids or [],
            skill_ids=skill_ids or [],
            is_builtin=False,
        )
        
        self._agents[agent.id] = agent
        
        # Persist to disk
        self._persist_agent(agent)
        
        # Register with SDK
        if SDK_AVAILABLE:
            self.register_agent_with_sdk(agent.id)
        
        return AgentResponse(**agent.model_dump())
    
    def update_agent(
        self,
        agent_id: str,
        **kwargs,
    ) -> Optional[AgentResponse]:
        """Update an agent."""
        agent = self._agents.get(agent_id)
        if not agent:
            return None
        
        # Don't allow updating built-in agents
        if agent.is_builtin:
            return None
        
        # Update fields
        for key, value in kwargs.items():
            if hasattr(agent, key):
                setattr(agent, key, value)
        
        return AgentResponse(**agent.model_dump())
    
    def delete_agent(self, agent_id: str) -> bool:
        """Delete a custom agent."""
        agent = self._agents.get(agent_id)
        if not agent or agent.is_builtin:
            return False
        
        del self._agents[agent_id]
        
        # Delete from disk
        self._delete_persisted_agent(agent_id)
        
        return True
    
    def list_available_tools(self) -> list[dict[str, Any]]:
        """List all available tools."""
        return [tool.model_dump() for tool in self._tools.values()]
    
    def get_tool(self, tool_id: str) -> Optional[dict[str, Any]]:
        """Get a tool by ID."""
        tool = self._tools.get(tool_id)
        return tool.model_dump() if tool else None
    
    # ==================== SDK Integration Methods ====================
    
    def get_sdk_tools(self) -> list[str]:
        """Get list of available SDK tool IDs."""
        if SDK_AVAILABLE:
            return list(TOOL_REGISTRY.keys())
        return []
    
    def register_agent_with_sdk(self, agent_id: str) -> bool:
        """Register a custom agent with the SDK for sub-agent delegation."""
        if not SDK_AVAILABLE:
            return False
        
        agent = self._agents.get(agent_id)
        if not agent:
            return False
        
        # Create factory function for this agent
        def agent_factory(llm):
            from app.services.skill_manager import SkillManager
            skill_manager = SkillManager()
            
            skill_models = []
            for skill_id in agent.skill_ids:
                skill = skill_manager.get_skill(skill_id)
                if skill:
                    from app.models.skill import Skill
                    skill_models.append(Skill(**skill))
            
            return create_sdk_agent(llm, agent, skill_models)
        
        return register_custom_agent(
            name=agent.id,
            description=agent.description,
            factory_func=agent_factory,
        )
    
    # ==================== Persistence Methods ====================
    
    def _load_custom_agents(self):
        """Load custom agents from disk."""
        try:
            for file_path in settings.agents_dir.glob("*.json"):
                try:
                    with open(file_path, "r") as f:
                        data = json.load(f)
                    
                    agent = Agent(**data)
                    self._agents[agent.id] = agent
                    
                    # Register with SDK if available
                    if SDK_AVAILABLE:
                        self.register_agent_with_sdk(agent.id)
                        
                except Exception as e:
                    print(f"Failed to load agent from {file_path}: {e}")
        except Exception as e:
            print(f"Failed to load agents: {e}")
    
    def _persist_agent(self, agent: Agent):
        """Save a custom agent to disk."""
        if agent.is_builtin:
            return
        
        try:
            file_path = settings.agents_dir / f"{agent.id}.json"
            
            with open(file_path, "w") as f:
                json.dump(agent.model_dump(), f, indent=2)
        except Exception as e:
            print(f"Failed to persist agent {agent.id}: {e}")
    
    def _delete_persisted_agent(self, agent_id: str):
        """Delete a persisted agent."""
        try:
            file_path = settings.agents_dir / f"{agent_id}.json"
            if file_path.exists():
                file_path.unlink()
        except Exception as e:
            print(f"Failed to delete persisted agent {agent_id}: {e}")
