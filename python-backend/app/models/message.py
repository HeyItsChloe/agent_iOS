"""Message data models."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class MessageStatus(str, Enum):
    """Message delivery status."""
    SENDING = "sending"
    SENT = "sent"
    DELIVERED = "delivered"
    ERROR = "error"


class MessageSender(str, Enum):
    """Message sender type."""
    USER = "user"
    AGENT = "agent"
    SYSTEM = "system"


class SubAgentResult(BaseModel):
    """Result from a sub-agent in a delegator conversation."""
    agent_id: str
    agent_name: str
    icon: str = "🤖"
    content: str


class Message(BaseModel):
    """A chat message."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    conversation_id: str
    content: str
    sender: MessageSender
    agent_id: Optional[str] = None
    agent_name: Optional[str] = None
    agent_color: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: MessageStatus = MessageStatus.SENT
    sub_agent_results: list[SubAgentResult] = Field(default_factory=list)
    
    # Tool-related fields
    tool_name: Optional[str] = None
    tool_input: Optional[dict] = None
    tool_output: Optional[str] = None
    
    class Config:
        use_enum_values = True


class MessageCreate(BaseModel):
    """Request to create a new message."""
    content: str
    mention_agent_id: Optional[str] = None
