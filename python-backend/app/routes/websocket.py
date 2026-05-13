"""WebSocket routes for real-time conversation streaming."""

import json
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.conversation_service import ConversationService

router = APIRouter(tags=["websocket"])

# Singleton conversation service (in production, use dependency injection)
_conversation_service = None


def get_conversation_service() -> ConversationService:
    """Get or create the conversation service singleton."""
    global _conversation_service
    if _conversation_service is None:
        _conversation_service = ConversationService()
    return _conversation_service


@router.websocket("/conversations/{conversation_id}/stream")
async def conversation_stream(websocket: WebSocket, conversation_id: str):
    """WebSocket endpoint for real-time conversation streaming.
    
    Protocol:
    - Client connects and receives conversation state
    - Client sends messages as JSON: {"type": "message", "content": "...", "mention_agent_id": "..."}
    - Server streams events as JSON: {"type": "message_received|typing_started|typing_stopped|error", ...}
    
    Event types:
    - message_received: A new message from agent or user
    - typing_started: Agent started processing
    - typing_stopped: Agent finished processing  
    - action: Agent is executing an action
    - observation: Agent received observation from tool
    - error: An error occurred
    - agent_state: Agent state changed
    """
    service = get_conversation_service()
    
    # Verify conversation exists
    conversation = service.get_conversation(conversation_id)
    if not conversation:
        await websocket.close(code=4004, reason="Conversation not found")
        return
    
    # Accept connection
    await websocket.accept()
    
    # Register WebSocket with service
    await service.register_websocket(conversation_id, websocket)
    
    try:
        # Send initial conversation state
        await websocket.send_json({
            "type": "connected",
            "conversation_id": conversation_id,
            "conversation": conversation,
        })
        
        # Listen for messages from client
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                msg_type = message_data.get("type", "message")
                
                if msg_type == "message":
                    # Handle user message
                    content = message_data.get("content", "")
                    mention_agent_id = message_data.get("mention_agent_id")
                    
                    if content.strip():
                        # Send message and get response
                        await service.send_message(
                            conversation_id=conversation_id,
                            content=content,
                            mention_agent_id=mention_agent_id,
                        )
                
                elif msg_type == "ping":
                    # Respond to ping
                    await websocket.send_json({"type": "pong"})
                
                elif msg_type == "get_state":
                    # Return current conversation state
                    conv = service.get_conversation(conversation_id)
                    if conv:
                        await websocket.send_json({
                            "type": "state",
                            "conversation": conv,
                        })
                
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "error_code": "INVALID_JSON",
                    "error_message": "Invalid JSON message",
                })
    
    except WebSocketDisconnect:
        # Client disconnected
        pass
    
    finally:
        # Unregister WebSocket
        await service.unregister_websocket(conversation_id, websocket)


@router.websocket("/events")
async def global_events(websocket: WebSocket):
    """WebSocket endpoint for global events (new conversations, agent updates, etc.).
    
    This endpoint receives system-wide events that aren't specific to a conversation.
    
    Event types:
    - conversation_created: A new conversation was created
    - conversation_deleted: A conversation was deleted
    - agent_created: A new agent was created
    - agent_deleted: An agent was deleted
    - skill_created: A new skill was created
    - skill_deleted: A skill was deleted
    - settings_updated: App settings were updated
    """
    await websocket.accept()
    
    try:
        while True:
            # Listen for messages
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            msg_type = message_data.get("type", "")
            
            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
            
            elif msg_type == "subscribe":
                # Client wants to subscribe to specific event types
                event_types = message_data.get("event_types", [])
                await websocket.send_json({
                    "type": "subscribed",
                    "event_types": event_types,
                })
    
    except WebSocketDisconnect:
        pass
