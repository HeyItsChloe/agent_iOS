"""Conversation data models."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, Field

from app.models.message import Message


class ConversationType(str, Enum):
    """Type of conversation."""
    SINGLE = "single"      # Single agent conversation
    DELEGATOR = "delegator"  # Main agent with sub-agents
    GROUP = "group"        # Multiple independent agents


class Conversation(BaseModel):
    """A conversation with one or more agents."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    title: Optional[str] = None
    type: ConversationType
    agent_ids: list[str] = Field(default_factory=list)
    skill_ids: list[str] = Field(default_factory=list)
    messages: list[Message] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Typing state: agent_id -> is_typing
    typing_agents: dict[str, bool] = Field(default_factory=dict)
    
    # Metadata
    is_archived: bool = False
    
    class Config:
        use_enum_values = True


class ConversationCreate(BaseModel):
    """Request to create a new conversation."""
    type: ConversationType
    title: Optional[str] = None
    agent_ids: list[str]
    skill_ids: list[str] = Field(default_factory=list)
    
    class Config:
        use_enum_values = True


class ConversationResponse(BaseModel):
    """Response containing conversation data."""
    id: str
    title: Optional[str]
    type: str
    agent_ids: list[str]
    skill_ids: list[str]
    messages: list[Message]
    created_at: datetime
    updated_at: datetime
    typing_agents: dict[str, bool]
    is_archived: bool
    
    class Config:
        from_attributes = True


class ConversationSummary(BaseModel):
    """Summary of a conversation for list views."""
    id: str
    title: Optional[str]
    type: str
    agent_ids: list[str]
    skill_ids: list[str]
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    unread_count: int = 0
    created_at: datetime
    updated_at: datetime
