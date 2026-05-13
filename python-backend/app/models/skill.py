"""Skill data models."""

from enum import Enum
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class SkillCategory(str, Enum):
    """Skill category."""
    CODING = "coding"
    DOCUMENTATION = "documentation"
    ANALYSIS = "analysis"
    CUSTOM = "custom"


class Skill(BaseModel):
    """A skill that enhances agent capabilities."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    description: str
    icon: str = "⚡"
    category: SkillCategory = SkillCategory.CUSTOM
    triggers: list[str] = Field(default_factory=list)  # Keywords that activate the skill
    content: str  # The skill prompt content
    
    # Metadata
    is_builtin: bool = False
    
    class Config:
        use_enum_values = True


class SkillCreate(BaseModel):
    """Request to create a new skill."""
    name: str
    description: str
    icon: str = "⚡"
    category: str = "custom"
    triggers: list[str] = Field(default_factory=list)
    content: str


class SkillResponse(BaseModel):
    """Response containing skill data."""
    id: str
    name: str
    description: str
    icon: str
    category: str
    triggers: list[str]
    content: str
    is_builtin: bool
    
    class Config:
        from_attributes = True


# Built-in skill definitions
BUILTIN_SKILLS: list[Skill] = [
    # Coding skills
    Skill(
        id="python-expert",
        name="Python Expert",
        description="Deep knowledge of Python best practices, type hints, and modern patterns",
        icon="🐍",
        category=SkillCategory.CODING,
        triggers=["python", "py", "django", "flask", "fastapi"],
        content="""You are a Python expert. When writing Python code:
- Use type hints for all function parameters and return values
- Follow PEP 8 style guidelines
- Prefer f-strings over .format() or % formatting
- Use dataclasses or Pydantic for data structures
- Write comprehensive docstrings
- Handle exceptions appropriately
- Use context managers for resource management""",
        is_builtin=True,
    ),
    Skill(
        id="typescript-react",
        name="TypeScript/React",
        description="Frontend development with React, hooks, and TypeScript",
        icon="⚛️",
        category=SkillCategory.CODING,
        triggers=["react", "typescript", "tsx", "frontend", "component"],
        content="""You are a TypeScript/React expert. When writing React code:
- Use functional components with hooks
- Define proper TypeScript interfaces for props and state
- Use React.FC only when needed, prefer explicit return types
- Implement proper error boundaries
- Use React Query or SWR for data fetching
- Follow the component composition pattern
- Keep components small and focused""",
        is_builtin=True,
    ),
    Skill(
        id="database-design",
        name="Database Design",
        description="SQL, NoSQL, schema optimization, and query performance",
        icon="🗄️",
        category=SkillCategory.CODING,
        triggers=["database", "sql", "postgres", "mysql", "mongodb", "schema"],
        content="""You are a database design expert. When working with databases:
- Normalize schemas appropriately (usually 3NF)
- Use proper indexes for query optimization
- Consider read vs write patterns
- Use transactions for data integrity
- Implement proper foreign key constraints
- Write efficient queries avoiding N+1 problems
- Consider partitioning for large tables""",
        is_builtin=True,
    ),
    
    # Documentation skills
    Skill(
        id="technical-writer",
        name="Technical Writer",
        description="Clear, concise documentation with proper structure",
        icon="📝",
        category=SkillCategory.DOCUMENTATION,
        triggers=["docs", "documentation", "readme", "wiki"],
        content="""You are a technical writing expert. When writing documentation:
- Use clear, concise language
- Structure content with headers and sections
- Include code examples where helpful
- Write for your target audience's technical level
- Use bullet points for lists
- Include a table of contents for long documents
- Add diagrams when they clarify concepts""",
        is_builtin=True,
    ),
    Skill(
        id="api-documentation",
        name="API Documentation",
        description="OpenAPI specs, endpoint docs, and examples",
        icon="📚",
        category=SkillCategory.DOCUMENTATION,
        triggers=["api", "openapi", "swagger", "endpoint", "rest"],
        content="""You are an API documentation expert. When documenting APIs:
- Follow OpenAPI 3.0+ specification
- Document all endpoints with method, path, and description
- Include request/response schemas
- Provide example requests and responses
- Document error codes and messages
- Include authentication requirements
- Add rate limiting information""",
        is_builtin=True,
    ),
    
    # Analysis skills
    Skill(
        id="security-analyst",
        name="Security Analyst",
        description="Identify vulnerabilities, suggest secure patterns",
        icon="🔒",
        category=SkillCategory.ANALYSIS,
        triggers=["security", "vulnerability", "auth", "authentication", "xss", "injection"],
        content="""You are a security analyst. When reviewing code for security:
- Check for SQL injection vulnerabilities
- Look for XSS (Cross-Site Scripting) issues
- Verify authentication and authorization
- Check for sensitive data exposure
- Review cryptographic implementations
- Look for insecure dependencies
- Verify input validation and sanitization
- Check for CSRF protections""",
        is_builtin=True,
    ),
    Skill(
        id="performance-optimizer",
        name="Performance Optimizer",
        description="Code profiling, bottleneck identification, optimization",
        icon="⚡",
        category=SkillCategory.ANALYSIS,
        triggers=["performance", "optimize", "speed", "slow", "fast", "bottleneck"],
        content="""You are a performance optimization expert. When optimizing code:
- Identify computational bottlenecks
- Check for O(n²) or worse algorithms
- Look for unnecessary memory allocations
- Review database query patterns
- Suggest caching opportunities
- Recommend algorithm improvements
- Identify parallelization options
- Propose lazy loading patterns

Always provide:
- Current complexity analysis
- Specific optimization suggestions
- Expected performance improvement
- Trade-offs to consider""",
        is_builtin=True,
    ),
]


# Skill categories with metadata
SKILL_CATEGORIES = [
    {"id": "coding", "name": "Coding", "icon": "💻"},
    {"id": "documentation", "name": "Documentation", "icon": "📝"},
    {"id": "analysis", "name": "Analysis", "icon": "🔍"},
    {"id": "custom", "name": "Custom", "icon": "⚡"},
]
