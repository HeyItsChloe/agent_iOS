"""Conversation management endpoints."""

from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel

from app.services.conversation_service import ConversationService
from app.models.conversation import (
    ConversationCreate,
    ConversationResponse,
)
from app.models.message import MessageCreate

router = APIRouter()

# In-memory conversation service (will be replaced with proper state management)
conversation_service = ConversationService()


class CreateConversationRequest(BaseModel):
    """Request to create a new conversation."""
    type: str  # "single", "delegator", "group"
    title: Optional[str] = None
    agent_ids: list[str]
    skill_ids: list[str] = []


class SendMessageRequest(BaseModel):
    """Request to send a message."""
    content: str
    mention_agent_id: Optional[str] = None


@router.get("/")
async def list_conversations():
    """List all conversations."""
    return conversation_service.list_conversations()


@router.post("/", response_model=ConversationResponse)
async def create_conversation(request: CreateConversationRequest):
    """Create a new conversation."""
    conversation = conversation_service.create_conversation(
        conversation_type=request.type,
        title=request.title,
        agent_ids=request.agent_ids,
        skill_ids=request.skill_ids,
    )
    return conversation


@router.get("/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get a specific conversation."""
    conversation = conversation_service.get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.delete("/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation."""
    success = conversation_service.delete_conversation(conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "deleted"}


@router.post("/{conversation_id}/messages")
async def send_message(conversation_id: str, request: SendMessageRequest):
    """Send a message to a conversation (non-streaming)."""
    result = await conversation_service.send_message(
        conversation_id=conversation_id,
        content=request.content,
        mention_agent_id=request.mention_agent_id,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return result


@router.websocket("/{conversation_id}/stream")
async def websocket_stream(websocket: WebSocket, conversation_id: str):
    """WebSocket endpoint for real-time conversation streaming."""
    await websocket.accept()
    
    try:
        # Register the WebSocket connection
        conversation_service.register_websocket(conversation_id, websocket)
        
        while True:
            # Receive messages from the client
            data = await websocket.receive_json()
            
            if data.get("type") == "message":
                # Handle incoming message
                await conversation_service.handle_websocket_message(
                    conversation_id=conversation_id,
                    content=data.get("content", ""),
                    mention_agent_id=data.get("mention_agent_id"),
                    websocket=websocket,
                )
            elif data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        conversation_service.unregister_websocket(conversation_id, websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        conversation_service.unregister_websocket(conversation_id, websocket)
