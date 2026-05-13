"""WebSocket event models for real-time communication."""

from datetime import datetime
from enum import Enum
from typing import Any, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class EventType(str, Enum):
    """Types of WebSocket events."""
    # Client -> Server
    MESSAGE = "message"
    PING = "ping"
    
    # Server -> Client
    MESSAGE_RECEIVED = "message_received"
    TYPING_STARTED = "typing_started"
    TYPING_STOPPED = "typing_stopped"
    ERROR = "error"
    PONG = "pong"
    
    # Agent events
    ACTION = "action"
    OBSERVATION = "observation"
    AGENT_STATE_CHANGE = "agent_state_change"
    
    # Conversation events
    CONVERSATION_UPDATED = "conversation_updated"


class WebSocketEvent(BaseModel):
    """Base WebSocket event."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    type: EventType
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        use_enum_values = True


class MessageEvent(WebSocketEvent):
    """Event for a new message."""
    type: EventType = EventType.MESSAGE_RECEIVED
    conversation_id: str
    message_id: str
    content: str
    sender: str  # "user" or "agent"
    agent_id: Optional[str] = None
    agent_name: Optional[str] = None
    agent_color: Optional[str] = None


class TypingEvent(WebSocketEvent):
    """Event for typing indicator."""
    type: EventType = EventType.TYPING_STARTED
    conversation_id: str
    agent_id: str
    agent_name: str
    is_typing: bool = True


class ErrorEvent(WebSocketEvent):
    """Event for errors."""
    type: EventType = EventType.ERROR
    conversation_id: Optional[str] = None
    error_code: str
    error_message: str
    details: Optional[dict[str, Any]] = None


class ActionEvent(WebSocketEvent):
    """Event for an agent action (tool use)."""
    type: EventType = EventType.ACTION
    conversation_id: str
    agent_id: str
    tool_name: str
    tool_input: dict[str, Any]
    thought: Optional[str] = None


class ObservationEvent(WebSocketEvent):
    """Event for an observation (tool result)."""
    type: EventType = EventType.OBSERVATION
    conversation_id: str
    agent_id: str
    tool_name: str
    content: str
    is_error: bool = False


class AgentStateEvent(WebSocketEvent):
    """Event for agent state changes."""
    type: EventType = EventType.AGENT_STATE_CHANGE
    conversation_id: str
    agent_id: str
    state: str  # "idle", "thinking", "acting", "waiting", "finished", "error"


class ConversationUpdatedEvent(WebSocketEvent):
    """Event when conversation is updated."""
    type: EventType = EventType.CONVERSATION_UPDATED
    conversation_id: str
    update_type: str  # "title", "agents", "skills", "archived"
