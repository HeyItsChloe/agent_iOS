"""GUI Visualizer for streaming events to WebSocket clients.

This module provides a ConversationVisualizerBase implementation that
emits events to connected WebSocket clients for real-time UI updates.
"""

import asyncio
from datetime import datetime
from typing import Any, Callable, Optional, Awaitable
from uuid import uuid4

try:
    from openhands.sdk.conversation import ConversationVisualizerBase
    from openhands.sdk.event import (
        Event,
        ActionEvent,
        ObservationEvent,
        AgentErrorEvent,
        UserMessageEvent,
    )
    SDK_AVAILABLE = True
except ImportError:
    # Fallback for when SDK is not installed
    SDK_AVAILABLE = False
    ConversationVisualizerBase = object
    Event = object
    ActionEvent = object
    ObservationEvent = object
    AgentErrorEvent = object
    UserMessageEvent = object

from app.models.events import (
    MessageEvent,
    TypingEvent,
    ErrorEvent,
    ActionEvent as AppActionEvent,
    ObservationEvent as AppObservationEvent,
    AgentStateEvent,
    EventType,
)


class GUIVisualizer(ConversationVisualizerBase if SDK_AVAILABLE else object):
    """Visualizer that emits events to WebSocket clients.
    
    This class bridges the OpenHands SDK event system with the GUI's
    WebSocket-based real-time communication.
    """
    
    def __init__(
        self,
        name: str = "Agent",
        conversation_id: str = "",
        agent_id: str = "",
        agent_color: str = "#007AFF",
        on_event: Optional[Callable[[dict[str, Any]], Awaitable[None]]] = None,
    ):
        """Initialize the GUI visualizer.
        
        Args:
            name: Display name for the agent
            conversation_id: ID of the conversation
            agent_id: ID of the agent
            agent_color: Color for UI display
            on_event: Async callback to emit events
        """
        if SDK_AVAILABLE:
            super().__init__(name=name)
        
        self.conversation_id = conversation_id
        self.agent_id = agent_id
        self.agent_name = name
        self.agent_color = agent_color
        self._on_event = on_event
        self._is_typing = False
        self._current_thought: Optional[str] = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None
    
    def set_event_callback(self, callback: Callable[[dict[str, Any]], Awaitable[None]]):
        """Set the event callback after initialization."""
        self._on_event = callback
    
    def set_event_loop(self, loop: asyncio.AbstractEventLoop):
        """Set the event loop for async operations."""
        self._loop = loop
    
    async def _emit_event(self, event: dict[str, Any]):
        """Emit an event to the callback."""
        if self._on_event:
            await self._on_event(event)
    
    def _emit_event_sync(self, event: dict[str, Any]):
        """Emit an event synchronously (schedules async callback)."""
        if self._on_event and self._loop:
            asyncio.run_coroutine_threadsafe(
                self._emit_event(event),
                self._loop
            )
    
    def on_event(self, event: Event) -> None:
        """Handle SDK events and emit GUI events.
        
        This is called by the SDK for each event during conversation execution.
        """
        if not SDK_AVAILABLE:
            return
        
        timestamp = datetime.utcnow().isoformat()
        
        # Handle different event types
        if isinstance(event, ActionEvent):
            self._handle_action_event(event, timestamp)
        elif isinstance(event, ObservationEvent):
            self._handle_observation_event(event, timestamp)
        elif isinstance(event, AgentErrorEvent):
            self._handle_error_event(event, timestamp)
        elif isinstance(event, UserMessageEvent):
            self._handle_user_message_event(event, timestamp)
    
    def _handle_action_event(self, event: ActionEvent, timestamp: str):
        """Handle action events (agent starting to use a tool)."""
        # Start typing indicator if not already typing
        if not self._is_typing:
            self._is_typing = True
            typing_event = TypingEvent(
                type=EventType.TYPING_STARTED,
                conversation_id=self.conversation_id,
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                is_typing=True,
            )
            self._emit_event_sync(typing_event.model_dump())
        
        # Store thought if present
        if hasattr(event, 'thought') and event.thought:
            self._current_thought = event.thought
        
        # Emit action event
        tool_name = getattr(event, 'tool_name', None) or getattr(event, 'action', 'unknown')
        tool_input = {}
        
        # Try to extract tool input
        if hasattr(event, 'args'):
            tool_input = event.args if isinstance(event.args, dict) else {}
        
        action_event = AppActionEvent(
            conversation_id=self.conversation_id,
            agent_id=self.agent_id,
            tool_name=str(tool_name),
            tool_input=tool_input,
            thought=self._current_thought,
        )
        self._emit_event_sync(action_event.model_dump())
    
    def _handle_observation_event(self, event: ObservationEvent, timestamp: str):
        """Handle observation events (tool results)."""
        # Stop typing indicator
        if self._is_typing:
            self._is_typing = False
            typing_event = TypingEvent(
                type=EventType.TYPING_STOPPED,
                conversation_id=self.conversation_id,
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                is_typing=False,
            )
            self._emit_event_sync(typing_event.model_dump())
        
        # Get content from observation
        content = ""
        if hasattr(event, 'content'):
            content = str(event.content)
        elif hasattr(event, 'text'):
            content = str(event.text)
        elif hasattr(event, 'output'):
            content = str(event.output)
        
        # Get tool name
        tool_name = getattr(event, 'tool_name', None) or getattr(event, 'observation', 'result')
        
        # Check if error
        is_error = getattr(event, 'is_error', False) or getattr(event, 'error', False)
        
        obs_event = AppObservationEvent(
            conversation_id=self.conversation_id,
            agent_id=self.agent_id,
            tool_name=str(tool_name),
            content=content,
            is_error=bool(is_error),
        )
        self._emit_event_sync(obs_event.model_dump())
        
        # Emit message event with the observation content
        message_event = MessageEvent(
            conversation_id=self.conversation_id,
            message_id=str(uuid4()),
            content=content,
            sender="agent",
            agent_id=self.agent_id,
            agent_name=self.agent_name,
            agent_color=self.agent_color,
        )
        self._emit_event_sync(message_event.model_dump())
        
        # Clear thought
        self._current_thought = None
    
    def _handle_error_event(self, event: AgentErrorEvent, timestamp: str):
        """Handle error events."""
        # Stop typing
        if self._is_typing:
            self._is_typing = False
            typing_event = TypingEvent(
                type=EventType.TYPING_STOPPED,
                conversation_id=self.conversation_id,
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                is_typing=False,
            )
            self._emit_event_sync(typing_event.model_dump())
        
        # Emit error event
        error_message = getattr(event, 'error', None) or getattr(event, 'message', 'Unknown error')
        error_event = ErrorEvent(
            conversation_id=self.conversation_id,
            error_code="AGENT_ERROR",
            error_message=str(error_message),
        )
        self._emit_event_sync(error_event.model_dump())
        
        # Also emit agent state change
        state_event = AgentStateEvent(
            conversation_id=self.conversation_id,
            agent_id=self.agent_id,
            state="error",
        )
        self._emit_event_sync(state_event.model_dump())
    
    def _handle_user_message_event(self, event: UserMessageEvent, timestamp: str):
        """Handle user message events."""
        content = getattr(event, 'content', '') or getattr(event, 'message', '')
        
        message_event = MessageEvent(
            type=EventType.MESSAGE_RECEIVED,
            conversation_id=self.conversation_id,
            message_id=str(uuid4()),
            content=str(content),
            sender="user",
        )
        self._emit_event_sync(message_event.model_dump())


class MockVisualizer:
    """Mock visualizer for when SDK is not available."""
    
    def __init__(self, **kwargs):
        self.conversation_id = kwargs.get('conversation_id', '')
        self.agent_id = kwargs.get('agent_id', '')
        self.agent_name = kwargs.get('name', 'Agent')
        self.agent_color = kwargs.get('agent_color', '#007AFF')
        self._on_event = kwargs.get('on_event')
        self._loop = None
    
    def set_event_callback(self, callback):
        self._on_event = callback
    
    def set_event_loop(self, loop):
        self._loop = loop
    
    def on_event(self, event):
        pass


# Export the appropriate visualizer based on SDK availability
if not SDK_AVAILABLE:
    GUIVisualizer = MockVisualizer
