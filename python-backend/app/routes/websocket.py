"""WebSocket routes for real-time conversation streaming."""

import json
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services import conversation_service

router = APIRouter(tags=["websocket"])


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
    print(f"[WebSocket] ========== CONNECTION REQUEST ==========")
    print(f"[WebSocket] conversation_id: {conversation_id}")
    
    # Verify conversation exists
    conversation = conversation_service.get_conversation(conversation_id)
    if not conversation:
        print(f"[WebSocket] ERROR: Conversation not found: {conversation_id}")
        await websocket.close(code=4004, reason="Conversation not found")
        return
    
    print(f"[WebSocket] Conversation found, accepting connection...")
    
    # Accept connection
    await websocket.accept()
    print(f"[WebSocket] Connection accepted")
    
    # Register WebSocket with service
    conversation_service.register_websocket(conversation_id, websocket)
    print(f"[WebSocket] Registered with conversation service")
    
    try:
        # Send initial conversation state
        print(f"[WebSocket] Sending initial state...")
        await websocket.send_json({
            "type": "connected",
            "conversation_id": conversation_id,
            "conversation": conversation.model_dump(mode='json') if hasattr(conversation, 'model_dump') else conversation,
        })
        print(f"[WebSocket] Initial state sent")
        
        # Listen for messages from client
        print(f"[WebSocket] Entering message loop...")
        while True:
            try:
                # Receive message from client
                print(f"[WebSocket] Waiting for message...")
                data = await websocket.receive_text()
                print(f"[WebSocket] Received: {data[:200]}...")
                message_data = json.loads(data)
                
                msg_type = message_data.get("type", "message")
                print(f"[WebSocket] Message type: {msg_type}")
                
                if msg_type == "message":
                    # Handle user message
                    content = message_data.get("content", "")
                    mention_agent_id = message_data.get("mention_agent_id")
                    
                    print(f"[WebSocket] User message: {content[:100]}...")
                    print(f"[WebSocket] Mention agent: {mention_agent_id}")
                    
                    if content.strip():
                        # Send message and broadcast response via WebSocket
                        print(f"[WebSocket] Calling handle_websocket_message...")
                        await conversation_service.handle_websocket_message(
                            conversation_id=conversation_id,
                            content=content,
                            mention_agent_id=mention_agent_id,
                            websocket=websocket,
                        )
                        print(f"[WebSocket] handle_websocket_message completed")
                
                elif msg_type == "ping":
                    # Respond to ping
                    print(f"[WebSocket] Responding to ping")
                    await websocket.send_json({"type": "pong"})
                
                elif msg_type == "get_state":
                    # Return current conversation state
                    print(f"[WebSocket] Getting state...")
                    conv = conversation_service.get_conversation(conversation_id)
                    if conv:
                        await websocket.send_json({
                            "type": "state",
                            "conversation": conv.model_dump(mode='json') if hasattr(conv, 'model_dump') else conv,
                        })
                
            except json.JSONDecodeError as e:
                print(f"[WebSocket] JSON decode error: {e}")
                await websocket.send_json({
                    "type": "error",
                    "error_code": "INVALID_JSON",
                    "error_message": "Invalid JSON message",
                })
    
    except WebSocketDisconnect:
        # Client disconnected
        print(f"[WebSocket] Client disconnected")
        pass
    
    except Exception as e:
        print(f"[WebSocket] ERROR in message loop: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Unregister WebSocket
        print(f"[WebSocket] Unregistering and closing...")
        conversation_service.unregister_websocket(conversation_id, websocket)


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
