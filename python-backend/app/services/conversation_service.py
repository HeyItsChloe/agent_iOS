"""Conversation management service."""

from datetime import datetime
from typing import Any, Optional
from uuid import uuid4

from fastapi import WebSocket

from app.models.conversation import Conversation, ConversationType, ConversationResponse
from app.models.message import Message, MessageSender, MessageStatus
from app.models.events import (
    MessageEvent,
    TypingEvent,
    ErrorEvent,
    EventType,
)


class ConversationService:
    """Service for managing conversations with OpenHands SDK integration."""
    
    def __init__(self):
        # In-memory storage (replace with database in production)
        self._conversations: dict[str, Conversation] = {}
        self._websockets: dict[str, list[WebSocket]] = {}
    
    def list_conversations(self) -> list[dict[str, Any]]:
        """List all conversations."""
        return [
            self._conversation_to_summary(conv) 
            for conv in self._conversations.values()
        ]
    
    def create_conversation(
        self,
        conversation_type: str,
        title: Optional[str],
        agent_ids: list[str],
        skill_ids: list[str],
    ) -> ConversationResponse:
        """Create a new conversation."""
        conv_type = ConversationType(conversation_type)
        
        # Generate title if not provided
        if not title:
            if conv_type == ConversationType.GROUP:
                title = f"Group Chat ({len(agent_ids)} agents)"
            elif conv_type == ConversationType.DELEGATOR:
                title = "Planning Assistant"
            else:
                title = "New Chat"
        
        conversation = Conversation(
            id=str(uuid4()),
            title=title,
            type=conv_type,
            agent_ids=agent_ids,
            skill_ids=skill_ids,
            messages=[],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        
        self._conversations[conversation.id] = conversation
        return ConversationResponse(**conversation.model_dump())
    
    def get_conversation(self, conversation_id: str) -> Optional[ConversationResponse]:
        """Get a conversation by ID."""
        conversation = self._conversations.get(conversation_id)
        if conversation:
            return ConversationResponse(**conversation.model_dump())
        return None
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """Delete a conversation."""
        if conversation_id in self._conversations:
            del self._conversations[conversation_id]
            return True
        return False
    
    async def send_message(
        self,
        conversation_id: str,
        content: str,
        mention_agent_id: Optional[str] = None,
    ) -> Optional[dict[str, Any]]:
        """Send a message to a conversation."""
        conversation = self._conversations.get(conversation_id)
        if not conversation:
            return None
        
        # Create user message
        user_message = Message(
            id=str(uuid4()),
            conversation_id=conversation_id,
            content=content,
            sender=MessageSender.USER,
            status=MessageStatus.SENT,
        )
        conversation.messages.append(user_message)
        conversation.updated_at = datetime.utcnow()
        
        # TODO: Integrate with OpenHands SDK here
        # For now, create a mock response
        agent_response = await self._generate_mock_response(
            conversation, content, mention_agent_id
        )
        
        return {
            "user_message": user_message.model_dump(),
            "agent_response": agent_response.model_dump() if agent_response else None,
        }
    
    async def handle_websocket_message(
        self,
        conversation_id: str,
        content: str,
        mention_agent_id: Optional[str],
        websocket: WebSocket,
    ):
        """Handle a message from WebSocket and stream responses."""
        conversation = self._conversations.get(conversation_id)
        if not conversation:
            await self._send_error(websocket, conversation_id, "Conversation not found")
            return
        
        # Create and store user message
        user_message = Message(
            id=str(uuid4()),
            conversation_id=conversation_id,
            content=content,
            sender=MessageSender.USER,
            status=MessageStatus.SENT,
        )
        conversation.messages.append(user_message)
        
        # Send user message confirmation
        await self._broadcast_event(
            conversation_id,
            MessageEvent(
                conversation_id=conversation_id,
                message_id=user_message.id,
                content=content,
                sender="user",
            ),
        )
        
        # Simulate typing indicator
        for agent_id in conversation.agent_ids:
            await self._broadcast_event(
                conversation_id,
                TypingEvent(
                    conversation_id=conversation_id,
                    agent_id=agent_id,
                    agent_name=f"Agent {agent_id}",
                    is_typing=True,
                ),
            )
        
        # TODO: Integrate with OpenHands SDK for real responses
        # For now, generate mock response
        agent_response = await self._generate_mock_response(
            conversation, content, mention_agent_id
        )
        
        if agent_response:
            conversation.messages.append(agent_response)
            
            # Stop typing indicator
            for agent_id in conversation.agent_ids:
                await self._broadcast_event(
                    conversation_id,
                    TypingEvent(
                        type=EventType.TYPING_STOPPED,
                        conversation_id=conversation_id,
                        agent_id=agent_id,
                        agent_name=f"Agent {agent_id}",
                        is_typing=False,
                    ),
                )
            
            # Send agent response
            await self._broadcast_event(
                conversation_id,
                MessageEvent(
                    conversation_id=conversation_id,
                    message_id=agent_response.id,
                    content=agent_response.content,
                    sender="agent",
                    agent_id=agent_response.agent_id,
                    agent_name=agent_response.agent_name,
                    agent_color=agent_response.agent_color,
                ),
            )
        
        conversation.updated_at = datetime.utcnow()
    
    def register_websocket(self, conversation_id: str, websocket: WebSocket):
        """Register a WebSocket connection for a conversation."""
        if conversation_id not in self._websockets:
            self._websockets[conversation_id] = []
        self._websockets[conversation_id].append(websocket)
    
    def unregister_websocket(self, conversation_id: str, websocket: WebSocket):
        """Unregister a WebSocket connection."""
        if conversation_id in self._websockets:
            try:
                self._websockets[conversation_id].remove(websocket)
            except ValueError:
                pass
    
    async def _broadcast_event(self, conversation_id: str, event: Any):
        """Broadcast an event to all connected WebSockets for a conversation."""
        websockets = self._websockets.get(conversation_id, [])
        for ws in websockets:
            try:
                await ws.send_json(event.model_dump())
            except Exception:
                pass
    
    async def _send_error(self, websocket: WebSocket, conversation_id: str, message: str):
        """Send an error event."""
        error = ErrorEvent(
            conversation_id=conversation_id,
            error_code="CONVERSATION_ERROR",
            error_message=message,
        )
        await websocket.send_json(error.model_dump())
    
    async def _generate_mock_response(
        self,
        conversation: Conversation,
        user_content: str,
        mention_agent_id: Optional[str],
    ) -> Optional[Message]:
        """Generate a mock response (replace with SDK integration)."""
        import asyncio
        
        # Simulate processing time
        await asyncio.sleep(0.5)
        
        # Pick an agent to respond
        agent_id = mention_agent_id or (conversation.agent_ids[0] if conversation.agent_ids else None)
        if not agent_id:
            return None
        
        return Message(
            id=str(uuid4()),
            conversation_id=conversation.id,
            content=f"This is a mock response to: '{user_content[:50]}...' [SDK integration pending]",
            sender=MessageSender.AGENT,
            agent_id=agent_id,
            agent_name=f"Agent",
            agent_color="#007AFF",
            status=MessageStatus.SENT,
        )
    
    def _conversation_to_summary(self, conversation: Conversation) -> dict[str, Any]:
        """Convert conversation to summary format."""
        last_message = conversation.messages[-1] if conversation.messages else None
        return {
            "id": conversation.id,
            "title": conversation.title,
            "type": conversation.type,
            "agent_ids": conversation.agent_ids,
            "skill_ids": conversation.skill_ids,
            "last_message": last_message.content[:100] if last_message else None,
            "last_message_time": last_message.timestamp.isoformat() if last_message else None,
            "unread_count": 0,
            "created_at": conversation.created_at.isoformat(),
            "updated_at": conversation.updated_at.isoformat(),
        }
