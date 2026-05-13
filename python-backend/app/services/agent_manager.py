"""Agent management service."""

from typing import Any, Optional
from uuid import uuid4

from app.models.agent import (
    Agent,
    AgentType,
    AgentResponse,
    ToolDefinition,
    BUILTIN_AGENTS,
    BUILTIN_TOOLS,
)


class AgentManager:
    """Service for managing agents."""
    
    def __init__(self):
        # Initialize with built-in agents
        self._agents: dict[str, Agent] = {
            agent.id: agent for agent in BUILTIN_AGENTS
        }
        self._tools: dict[str, ToolDefinition] = {
            tool.id: tool for tool in BUILTIN_TOOLS
        }
    
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
        return True
    
    def list_available_tools(self) -> list[dict[str, Any]]:
        """List all available tools."""
        return [tool.model_dump() for tool in self._tools.values()]
    
    def get_tool(self, tool_id: str) -> Optional[dict[str, Any]]:
        """Get a tool by ID."""
        tool = self._tools.get(tool_id)
        return tool.model_dump() if tool else None
