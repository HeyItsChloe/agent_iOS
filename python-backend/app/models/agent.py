"""Agent data models."""

from enum import Enum
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class ToolAnnotations(BaseModel):
    """Tool behavioral annotations (MCP spec)."""
    read_only: bool = False      # Tool doesn't modify state
    destructive: bool = False    # Tool may delete/overwrite data
    idempotent: bool = False     # Repeated calls are safe
    open_world: bool = False     # Interacts with external systems


class ToolDefinition(BaseModel):
    """Definition of an available tool."""
    id: str
    name: str
    description: str
    icon: str
    annotations: ToolAnnotations = Field(default_factory=ToolAnnotations)


class AgentType(str, Enum):
    """Type of agent."""
    BUILTIN = "builtin"
    CUSTOM = "custom"


class Agent(BaseModel):
    """An AI agent definition."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    description: str
    avatar: Optional[str] = None  # Emoji or image URL
    color: str = "#007AFF"        # Theme color for UI
    type: AgentType = AgentType.CUSTOM
    
    # Configuration
    system_prompt: str = ""
    tool_ids: list[str] = Field(default_factory=list)
    skill_ids: list[str] = Field(default_factory=list)
    
    # Metadata
    is_builtin: bool = False
    
    class Config:
        use_enum_values = True


class AgentCreate(BaseModel):
    """Request to create a new agent."""
    name: str
    description: str
    avatar: Optional[str] = None
    color: str = "#007AFF"
    system_prompt: str = ""
    tool_ids: list[str] = Field(default_factory=list)
    skill_ids: list[str] = Field(default_factory=list)


class AgentResponse(BaseModel):
    """Response containing agent data."""
    id: str
    name: str
    description: str
    avatar: Optional[str]
    color: str
    type: str
    system_prompt: str
    tool_ids: list[str]
    skill_ids: list[str]
    is_builtin: bool
    
    class Config:
        from_attributes = True


# Built-in tool definitions
BUILTIN_TOOLS: list[ToolDefinition] = [
    ToolDefinition(
        id="terminal",
        name="Terminal",
        description="Execute shell commands (bash, npm, git, python, etc.)",
        icon="🖥️",
        annotations=ToolAnnotations(destructive=True, open_world=True),
    ),
    ToolDefinition(
        id="file_editor",
        name="File Editor",
        description="View, create, edit files with str_replace, insert, undo",
        icon="📄",
        annotations=ToolAnnotations(destructive=True),
    ),
    ToolDefinition(
        id="task_tracker",
        name="Task Tracker",
        description="Plan and track tasks with todo/in_progress/done states",
        icon="📋",
        annotations=ToolAnnotations(read_only=False, idempotent=True),
    ),
    ToolDefinition(
        id="browser",
        name="Web Browser",
        description="Navigate, click, type, scroll on web pages",
        icon="🌐",
        annotations=ToolAnnotations(open_world=True),
    ),
    ToolDefinition(
        id="delegate",
        name="Delegate (Sub-Agents)",
        description="Spawn and delegate tasks to sub-agents",
        icon="🎭",
        annotations=ToolAnnotations(idempotent=True),
    ),
    ToolDefinition(
        id="task",
        name="Task (Sync Agents)",
        description="Synchronous sub-agent task delegation",
        icon="⚙️",
        annotations=ToolAnnotations(idempotent=True),
    ),
]


# Built-in agent definitions
BUILTIN_AGENTS: list[Agent] = [
    Agent(
        id="general-assistant",
        name="General Assistant",
        description="A helpful general-purpose AI assistant",
        avatar="🤖",
        color="#007AFF",
        type=AgentType.BUILTIN,
        system_prompt="You are a helpful AI assistant.",
        tool_ids=["terminal", "file_editor", "task_tracker"],
        is_builtin=True,
    ),
    Agent(
        id="coding-expert",
        name="Coding Expert",
        description="Specialized in code review and implementation",
        avatar="💻",
        color="#34C759",
        type=AgentType.BUILTIN,
        system_prompt="You are an expert software engineer. Write clean, efficient code with best practices.",
        tool_ids=["terminal", "file_editor", "task_tracker"],
        is_builtin=True,
    ),
    Agent(
        id="planning-assistant",
        name="Planning Assistant",
        description="General-purpose delegator with orchestration capabilities",
        avatar="🧠",
        color="#5856D6",
        type=AgentType.BUILTIN,
        system_prompt="You are a planning assistant that can delegate tasks to specialized sub-agents.",
        tool_ids=["delegate", "task_tracker"],
        is_builtin=True,
    ),
    Agent(
        id="lodging-expert",
        name="Lodging Expert",
        description="Finds accommodation with transit-friendly picks",
        avatar="🏨",
        color="#34C759",
        type=AgentType.BUILTIN,
        system_prompt="You specialize in finding great places to stay. Provide hotel recommendations with neighborhoods, pros/cons, and transit notes.",
        tool_ids=[],
        is_builtin=True,
    ),
    Agent(
        id="activities-expert",
        name="Activities Expert",
        description="Creates time-efficient activity itineraries",
        avatar="🎯",
        color="#FF9500",
        type=AgentType.BUILTIN,
        system_prompt="You design concise itineraries. Suggest daily highlights grouped by proximity with food/coffee stops.",
        tool_ids=[],
        is_builtin=True,
    ),
    Agent(
        id="finance-expert",
        name="Finance Expert",
        description="Budget planning and cost breakdowns",
        avatar="💰",
        color="#AF52DE",
        type=AgentType.BUILTIN,
        system_prompt="You specialize in travel budgets and financial planning. Provide detailed cost breakdowns.",
        tool_ids=[],
        is_builtin=True,
    ),
    Agent(
        id="bash-agent",
        name="Bash Agent",
        description="Execute terminal commands",
        avatar="⌨️",
        color="#636366",
        type=AgentType.BUILTIN,
        system_prompt="You execute terminal commands. Be precise and careful with system operations.",
        tool_ids=["terminal"],
        is_builtin=True,
    ),
    Agent(
        id="explore-agent",
        name="Explore Agent",
        description="Navigate and analyze file systems",
        avatar="📂",
        color="#5856D6",
        type=AgentType.BUILTIN,
        system_prompt="You explore and analyze codebases. Summarize file contents and project structure.",
        tool_ids=["terminal", "file_editor"],
        is_builtin=True,
    ),
]
