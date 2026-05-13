"""Agent factory for creating OpenHands SDK agents with tools and skills."""

from typing import Optional, Sequence

from app.config import settings
from app.models.agent import Agent as AgentModel, BUILTIN_TOOLS
from app.models.skill import Skill as SkillModel

try:
    from openhands.sdk import Agent, LLM, Tool
    from openhands.sdk.context import AgentContext, Skill
    from openhands.sdk.tool import register_tool
    from openhands.tools.terminal import TerminalTool
    from openhands.tools.file_editor import FileEditorTool
    from openhands.tools.task_tracker import TaskTrackerTool
    from openhands.tools.delegate import DelegateTool
    from openhands.tools.task import TaskToolSet
    
    # Try to import browser tools (optional)
    try:
        from openhands.tools.browser_use import BrowserToolSet
        BROWSER_AVAILABLE = True
    except ImportError:
        BROWSER_AVAILABLE = False
        BrowserToolSet = None
    
    SDK_AVAILABLE = True
except ImportError:
    SDK_AVAILABLE = False
    Agent = None
    LLM = None
    Tool = None
    AgentContext = None
    Skill = None
    TerminalTool = None
    FileEditorTool = None
    TaskTrackerTool = None
    DelegateTool = None
    TaskToolSet = None
    BrowserToolSet = None
    BROWSER_AVAILABLE = False


# Tool ID to SDK tool class mapping
TOOL_REGISTRY = {}

if SDK_AVAILABLE:
    TOOL_REGISTRY = {
        "terminal": TerminalTool,
        "file_editor": FileEditorTool,
        "task_tracker": TaskTrackerTool,
        "delegate": DelegateTool,
        "task": TaskToolSet,
    }
    if BROWSER_AVAILABLE:
        TOOL_REGISTRY["browser"] = BrowserToolSet


def get_tools_for_agent(tool_ids: list[str]) -> list["Tool"]:
    """Get SDK Tool objects for the given tool IDs.
    
    Args:
        tool_ids: List of tool IDs to include
    
    Returns:
        List of SDK Tool objects
    """
    if not SDK_AVAILABLE:
        return []
    
    tools = []
    for tool_id in tool_ids:
        if tool_id in TOOL_REGISTRY:
            tool_class = TOOL_REGISTRY[tool_id]
            tools.append(Tool(name=tool_class.name))
    
    return tools


def get_skills_for_agent(skill_models: list[SkillModel]) -> list["Skill"]:
    """Convert skill models to SDK Skill objects.
    
    Args:
        skill_models: List of skill model objects
    
    Returns:
        List of SDK Skill objects
    """
    if not SDK_AVAILABLE:
        return []
    
    skills = []
    for skill_model in skill_models:
        skill = Skill(
            name=skill_model.id,
            content=skill_model.content,
            trigger=skill_model.triggers if skill_model.triggers else None,
        )
        skills.append(skill)
    
    return skills


def create_sdk_agent(
    llm: "LLM",
    agent_model: AgentModel,
    skill_models: list[SkillModel] = None,
) -> Optional["Agent"]:
    """Create an SDK Agent from an agent model.
    
    Args:
        llm: LLM instance to use
        agent_model: Agent model with configuration
        skill_models: Optional list of skills to add
    
    Returns:
        SDK Agent instance if successful, None otherwise
    """
    if not SDK_AVAILABLE:
        return None
    
    # Get tools
    tools = get_tools_for_agent(agent_model.tool_ids)
    
    # Get skills
    skills = []
    if skill_models:
        skills = get_skills_for_agent(skill_models)
    
    # Create agent context with skills and system prompt
    agent_context = None
    if skills or agent_model.system_prompt:
        agent_context = AgentContext(
            skills=skills if skills else None,
            system_message_suffix=agent_model.system_prompt if agent_model.system_prompt else None,
        )
    
    # Create the agent
    agent = Agent(
        llm=llm,
        tools=tools,
        agent_context=agent_context,
    )
    
    return agent


def register_custom_agent(
    name: str,
    description: str,
    factory_func,
) -> bool:
    """Register a custom agent type.
    
    Args:
        name: Unique name for the agent type
        description: Description of the agent
        factory_func: Factory function that creates the agent
    
    Returns:
        True if registration successful
    """
    if not SDK_AVAILABLE:
        return False
    
    try:
        from openhands.sdk.subagent import register_agent
        register_agent(
            name=name,
            factory_func=factory_func,
            description=description,
        )
        return True
    except Exception as e:
        print(f"Failed to register agent {name}: {e}")
        return False


def register_builtin_agents() -> list[str]:
    """Register built-in agent types with the SDK.
    
    Returns:
        List of registered agent names
    """
    if not SDK_AVAILABLE:
        return []
    
    try:
        from openhands.tools.preset.default import register_builtins_agents
        return register_builtins_agents(enable_browser=BROWSER_AVAILABLE)
    except Exception as e:
        print(f"Failed to register builtin agents: {e}")
        return []
