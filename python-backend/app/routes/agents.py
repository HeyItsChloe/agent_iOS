"""Agent management endpoints."""

from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.agent_manager import AgentManager
from app.models.agent import AgentCreate, AgentResponse

router = APIRouter()

# Agent manager instance
agent_manager = AgentManager()


class CreateAgentRequest(BaseModel):
    """Request to create a custom agent."""
    name: str
    description: str
    avatar: Optional[str] = None
    color: str = "#007AFF"
    system_prompt: str
    tool_ids: list[str] = []
    skill_ids: list[str] = []


class UpdateAgentRequest(BaseModel):
    """Request to update an agent."""
    name: Optional[str] = None
    description: Optional[str] = None
    avatar: Optional[str] = None
    color: Optional[str] = None
    system_prompt: Optional[str] = None
    tool_ids: Optional[list[str]] = None
    skill_ids: Optional[list[str]] = None


@router.get("/")
async def list_agents():
    """List all available agents (built-in and custom)."""
    return agent_manager.list_agents()


@router.get("/builtin")
async def list_builtin_agents():
    """List built-in agents only."""
    return agent_manager.list_builtin_agents()


@router.get("/custom")
async def list_custom_agents():
    """List custom agents only."""
    return agent_manager.list_custom_agents()


@router.post("/", response_model=AgentResponse)
async def create_agent(request: CreateAgentRequest):
    """Create a new custom agent."""
    agent = agent_manager.create_agent(
        name=request.name,
        description=request.description,
        avatar=request.avatar,
        color=request.color,
        system_prompt=request.system_prompt,
        tool_ids=request.tool_ids,
        skill_ids=request.skill_ids,
    )
    return agent


@router.get("/{agent_id}")
async def get_agent(agent_id: str):
    """Get a specific agent."""
    agent = agent_manager.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.put("/{agent_id}")
async def update_agent(agent_id: str, request: UpdateAgentRequest):
    """Update an agent."""
    agent = agent_manager.update_agent(
        agent_id=agent_id,
        **request.model_dump(exclude_none=True),
    )
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.delete("/{agent_id}")
async def delete_agent(agent_id: str):
    """Delete a custom agent."""
    success = agent_manager.delete_agent(agent_id)
    if not success:
        raise HTTPException(status_code=404, detail="Agent not found or is built-in")
    return {"status": "deleted"}


@router.get("/tools/available")
async def list_available_tools():
    """List all available tools."""
    return agent_manager.list_available_tools()
