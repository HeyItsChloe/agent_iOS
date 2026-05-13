"""Conversation management service with OpenHands SDK integration."""

import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Optional
from uuid import uuid4

from fastapi import WebSocket

from app.config import settings
from app.models.conversation import Conversation, ConversationType, ConversationResponse
from app.models.message import Message, MessageSender, MessageStatus, SubAgentResult
from app.models.events import (
    MessageEvent,
    TypingEvent,
    ErrorEvent,
    EventType,
    AgentStateEvent,
)

# Try to import SDK components
try:
    from openhands.sdk import Conversation as SDKConversation
    from app.sdk.visualizer import GUIVisualizer
    from app.sdk.llm_factory import create_llm, get_provider_from_model, OpenHandsCloudClient
    from app.sdk.agent_factory import create_sdk_agent, register_builtin_agents
    from app.config import PROVIDER_OPENHANDS, OPENHANDS_BASE_URL
    SDK_AVAILABLE = True
except ImportError as e:
    print(f"[Warning] SDK import failed: {e}")
    SDK_AVAILABLE = False
    SDKConversation = None
    GUIVisualizer = None
    OpenHandsCloudClient = None


class ConversationService:
    """Service for managing conversations with OpenHands SDK integration."""
    
    def __init__(self):
        # In-memory storage
        self._conversations: dict[str, Conversation] = {}
        self._websockets: dict[str, list[WebSocket]] = {}
        
        # SDK conversation instances
        self._sdk_conversations: dict[str, "SDKConversation"] = {}
        
        # Event loop for async operations
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        
        # Initialize SDK if available
        if SDK_AVAILABLE:
            register_builtin_agents()
        
        # Load persisted conversations
        self._load_persisted_conversations()
    
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
                await ws.send_json(event.model_dump(mode='json'))
            except Exception as e:
                print(f"[WS] Failed to broadcast event: {e}")
    
    async def _send_error(self, websocket: WebSocket, conversation_id: str, message: str):
        """Send an error event."""
        error = ErrorEvent(
            conversation_id=conversation_id,
            error_code="CONVERSATION_ERROR",
            error_message=message,
        )
        await websocket.send_json(error.model_dump(mode='json'))
    
    async def _run_sdk_conversation(
        self,
        conversation: Conversation,
        user_content: str,
        mention_agent_id: Optional[str],
    ) -> Optional[Message]:
        """Run the SDK conversation and return the response.
        
        Routes based on model provider:
        - OpenHands Cloud (oh:*) - fetches LLM config from user's OpenHands account
        - Direct providers (anthropic/*, openai/*) - uses local SDK with direct API key
        """
        from app.services.agent_manager import AgentManager
        from app.services.skill_manager import SkillManager
        
        agent_manager = AgentManager()
        skill_manager = SkillManager()
        
        # Determine provider
        provider = get_provider_from_model(settings.llm_model)
        
        # Get agent to use
        agent_id = mention_agent_id or (conversation.agent_ids[0] if conversation.agent_ids else None)
        if not agent_id:
            return None
        
        agent_data = agent_manager.get_agent(agent_id)
        if not agent_data:
            return await self._generate_fallback_response(
                conversation, user_content, mention_agent_id,
                f"Agent '{agent_id}' not found."
            )
        
        # Get skills
        skill_models = []
        for skill_id in conversation.skill_ids:
            skill = skill_manager.get_skill(skill_id)
            if skill:
                from app.models.skill import Skill
                skill_models.append(Skill(**skill))
        
        # Create agent model
        from app.models.agent import Agent as AgentModel
        agent_model = AgentModel(**agent_data)
        
        # Route based on provider
        if provider == PROVIDER_OPENHANDS:
            # Use OpenHands Cloud API
            return await self._run_openhands_cloud_conversation(
                conversation, user_content, agent_id, agent_model
            )
        else:
            # Use local SDK with direct provider API key
            llm = create_llm(usage_id=f"conv-{conversation.id}")
            if not llm:
                return await self._generate_fallback_response(
                    conversation, user_content, agent_id,
                    "LLM not configured. Please set your API key in Settings."
                )
            
            return await self._run_conversation_with_llm(
                conversation, user_content, agent_id, agent_model, skill_models, llm
            )
    
    async def _run_openhands_cloud_conversation(
        self,
        conversation: Conversation,
        user_content: str,
        agent_id: str,
        agent_model: "AgentModel",
    ) -> Optional[Message]:
        """Run conversation via OpenHands Cloud API.
        
        This starts a conversation on OpenHands Cloud infrastructure,
        which uses your account's LLM configuration.
        """
        if not settings.openhands_api_key:
            return await self._generate_fallback_response(
                conversation, user_content, agent_id,
                "OpenHands API key not configured. Please set it in Settings."
            )
        
        api_key = settings.openhands_api_key.get_secret_value()
        
        # Send typing indicator
        typing_event_data = {
            "type": "typing",
            "conversation_id": conversation.id,
            "agent_id": agent_id,
            "agent_name": agent_model.name,
            "is_typing": True,
        }
        await self._broadcast_event(conversation.id, typing_event_data)
        
        try:
            # Run on OpenHands Cloud
            client = OpenHandsCloudClient(api_key)
            
            loop = asyncio.get_event_loop()
            cloud_conv_id, response_text = await loop.run_in_executor(
                None, 
                lambda: client.run_message(user_content, timeout=300.0)
            )
            
            # Stop typing indicator
            typing_event_data["is_typing"] = False
            await self._broadcast_event(conversation.id, typing_event_data)
            
            # Create response message
            response_content = response_text if response_text else f"Conversation completed. View at: https://app.all-hands.dev/conversations/{cloud_conv_id}"
            
            response_message = Message(
                id=str(uuid4()),
                conversation_id=conversation.id,
                content=response_content,
                sender=MessageSender.AGENT,
                agent_id=agent_id,
                agent_name=agent_model.name,
                agent_color=agent_model.color,
                status=MessageStatus.SENT,
                metadata={"cloud_conversation_id": cloud_conv_id},
            )
            
            # Broadcast the response
            msg_event = MessageEvent(
                conversation_id=conversation.id,
                message=response_message.model_dump(mode='json'),
            )
            await self._broadcast_event(conversation.id, msg_event.model_dump(mode='json'))
            
            return response_message
            
        except Exception as e:
            print(f"[OpenHands Cloud] Error: {e}")
            import traceback
            traceback.print_exc()
            
            # Stop typing indicator
            typing_event_data["is_typing"] = False
            await self._broadcast_event(conversation.id, typing_event_data)
            
            return await self._generate_fallback_response(
                conversation, user_content, agent_id,
                f"OpenHands Cloud error: {str(e)}"
            )
    
    async def _run_conversation_with_llm(
        self,
        conversation: Conversation,
        user_content: str,
        agent_id: str,
        agent_model: "AgentModel",
        skill_models: list,
        llm: "LLM",
    ) -> Optional[Message]:
        """Run conversation with the given LLM instance."""
        from app.models.agent import Agent as AgentModel
        
        # Create SDK agent
        sdk_agent = create_sdk_agent(llm, agent_model, skill_models)
        if not sdk_agent:
            return await self._generate_fallback_response(
                conversation, user_content, agent_id,
                "Failed to create SDK agent."
            )
        
        # Create visualizer with event callback
        visualizer = GUIVisualizer(
            name=agent_model.name,
            conversation_id=conversation.id,
            agent_id=agent_id,
            agent_color=agent_model.color,
        )
        
        async def on_event(event_data: dict):
            await self._broadcast_event(conversation.id, event_data)
        
        visualizer.set_event_callback(on_event)
        if self._loop:
            visualizer.set_event_loop(self._loop)
        
        try:
            # Create SDK conversation with local workspace
            sdk_conv = SDKConversation(
                agent=sdk_agent,
                workspace=str(settings.default_workspace),
                visualizer=visualizer,
            )
            
            # Store SDK conversation
            self._sdk_conversations[conversation.id] = sdk_conv
            
            # Send message and run
            sdk_conv.send_message(user_content)
            
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, sdk_conv.run)
            
            return Message(
                id=str(uuid4()),
                conversation_id=conversation.id,
                content="Response sent via WebSocket stream.",
                sender=MessageSender.AGENT,
                agent_id=agent_id,
                agent_name=agent_model.name,
                agent_color=agent_model.color,
                status=MessageStatus.SENT,
            )
            
        except Exception as e:
            print(f"[SDK] Conversation error: {e}")
            return await self._generate_fallback_response(
                conversation, user_content, agent_id,
                f"Error running conversation: {str(e)}"
            )
    
    async def _run_group_chat(
        self,
        conversation: Conversation,
        user_content: str,
    ) -> list[Message]:
        """Run group chat with multiple agents responding in parallel."""
        from app.services.agent_manager import AgentManager
        
        agent_manager = AgentManager()
        
        # Create tasks for each agent
        tasks = []
        for agent_id in conversation.agent_ids:
            task = self._run_sdk_conversation(
                conversation,
                user_content,
                mention_agent_id=agent_id,
            )
            tasks.append(task)
        
        # Run all agents in parallel
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter successful responses
        messages = []
        for response in responses:
            if isinstance(response, Message):
                messages.append(response)
            elif isinstance(response, Exception):
                print(f"Group chat agent error: {response}")
        
        return messages
    
    async def _generate_fallback_response(
        self,
        conversation: Conversation,
        user_content: str,
        mention_agent_id: Optional[str],
        error_message: str,
    ) -> Message:
        """Generate a fallback response when SDK is not available."""
        agent_id = mention_agent_id or (conversation.agent_ids[0] if conversation.agent_ids else "unknown")
        
        return Message(
            id=str(uuid4()),
            conversation_id=conversation.id,
            content=f"⚠️ {error_message}\n\nYour message: {user_content[:100]}...",
            sender=MessageSender.AGENT,
            agent_id=agent_id,
            agent_name="System",
            agent_color="#FF3B30",
            status=MessageStatus.ERROR,
        )
    
    async def _generate_mock_response(
        self,
        conversation: Conversation,
        user_content: str,
        mention_agent_id: Optional[str],
    ) -> Optional[Message]:
        """Generate a mock response when SDK is not available."""
        # Simulate processing time
        await asyncio.sleep(0.5)
        
        # Pick an agent to respond
        agent_id = mention_agent_id or (conversation.agent_ids[0] if conversation.agent_ids else None)
        if not agent_id:
            return None
        
        # Debug: Check SDK and API key status
        print(f"[Debug] SDK_AVAILABLE: {SDK_AVAILABLE}")
        print(f"[Debug] has_llm_api_key: {settings.has_llm_api_key}")
        print(f"[Debug] openhands_api_key set: {settings.openhands_api_key is not None}")
        print(f"[Debug] llm_model: {settings.llm_model}")
        
        # Check if SDK is available
        if SDK_AVAILABLE and settings.has_llm_api_key:
            return await self._run_sdk_conversation(conversation, user_content, mention_agent_id)
        
        return Message(
            id=str(uuid4()),
            conversation_id=conversation.id,
            content=f"👋 Hi! I received your message: \"{user_content[:100]}...\"\n\n"
                    f"⚠️ SDK not configured. Set LLM_API_KEY to enable AI responses.",
            sender=MessageSender.AGENT,
            agent_id=agent_id,
            agent_name="Agent",
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
    
    # ==================== Persistence Methods ====================
    
    def _load_persisted_conversations(self):
        """Load conversations from disk."""
        try:
            for file_path in settings.conversations_dir.glob("*.json"):
                try:
                    with open(file_path, "r") as f:
                        data = json.load(f)
                    
                    # Parse messages
                    messages = []
                    for msg_data in data.get("messages", []):
                        msg_data["timestamp"] = datetime.fromisoformat(msg_data["timestamp"])
                        messages.append(Message(**msg_data))
                    
                    # Create conversation
                    conv = Conversation(
                        id=data["id"],
                        title=data.get("title"),
                        type=ConversationType(data["type"]),
                        agent_ids=data.get("agent_ids", []),
                        skill_ids=data.get("skill_ids", []),
                        messages=messages,
                        created_at=datetime.fromisoformat(data["created_at"]),
                        updated_at=datetime.fromisoformat(data["updated_at"]),
                        is_archived=data.get("is_archived", False),
                    )
                    
                    self._conversations[conv.id] = conv
                except Exception as e:
                    print(f"Failed to load conversation from {file_path}: {e}")
        except Exception as e:
            print(f"Failed to load conversations: {e}")
    
    def _persist_conversation(self, conversation: Conversation):
        """Save a conversation to disk."""
        try:
            file_path = settings.conversations_dir / f"{conversation.id}.json"
            
            # Convert to dict
            data = {
                "id": conversation.id,
                "title": conversation.title,
                "type": conversation.type.value if hasattr(conversation.type, 'value') else conversation.type,
                "agent_ids": conversation.agent_ids,
                "skill_ids": conversation.skill_ids,
                "messages": [
                    {
                        **msg.model_dump(),
                        "timestamp": msg.timestamp.isoformat(),
                    }
                    for msg in conversation.messages
                ],
                "created_at": conversation.created_at.isoformat(),
                "updated_at": conversation.updated_at.isoformat(),
                "is_archived": conversation.is_archived,
            }
            
            with open(file_path, "w") as f:
                json.dump(data, f, indent=2, default=str)
        except Exception as e:
            print(f"Failed to persist conversation {conversation.id}: {e}")
    
    def _delete_persisted_conversation(self, conversation_id: str):
        """Delete a persisted conversation."""
        try:
            file_path = settings.conversations_dir / f"{conversation_id}.json"
            if file_path.exists():
                file_path.unlink()
        except Exception as e:
            print(f"Failed to delete persisted conversation {conversation_id}: {e}")
