"""Conversation management service with OpenHands SDK integration."""

import asyncio
import json
from datetime import datetime, timedelta
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


GIT_BLOCK_INSTRUCTION = """
IMPORTANT RESTRICTION: You are NOT allowed to execute any git commands. This includes:
- git push (pushing commits)
- git pull (pulling changes)
- git commit (committing changes)
- git checkout (switching branches)
- Any other git operations that modify the repository state

If the user asks you to perform a git operation, politely explain that git actions are blocked 
and suggest they use the toolbar buttons or execute the commands themselves.
"""

VSCODE_TUNNEL_SETUP_MESSAGE = """Set up VS Code Remote Tunnel. Run these commands:

```bash
curl -Lk 'https://code.visualstudio.com/sha/download?build=stable&os=cli-linux-x64' -o /tmp/vscode_cli.tar.gz && \
tar -xzf /tmp/vscode_cli.tar.gz -C /usr/local/bin && \
code tunnel --accept-server-license-terms --name openhands-workspace > /tmp/tunnel.log 2>&1 &
sleep 5 && cat /tmp/tunnel.log
```

Look for a URL like "https://vscode.dev/tunnel/..." or an auth code in the output. Give me that URL or instructions to authenticate."""

VSCODE_TUNNEL_SKILL_ID = "gitlive-sync"


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
    
    def _prepare_content_with_restrictions(self, content: str) -> str:
        """Prepare user content with any active restrictions.
        
        If git blocking is enabled, prepends the restriction instruction.
        """
        if settings.block_agent_git_actions:
            return f"{GIT_BLOCK_INSTRUCTION}\n\nUser message: {content}"
        return content
    
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
                title = "Group Chat"
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
        self._persist_conversation(conversation)
        return ConversationResponse(**conversation.model_dump())
    
    def get_conversation(self, conversation_id: str, sync_from_cloud: bool = False) -> Optional[ConversationResponse]:
        """Get a conversation by ID.
        
        Args:
            conversation_id: Local conversation ID
            sync_from_cloud: If True, fetch latest messages from cloud before returning
        """
        conversation = self._conversations.get(conversation_id)
        if conversation:
            # Sync from cloud if requested and we have a cloud conversation ID
            if sync_from_cloud and conversation.cloud_conversation_id:
                self._sync_messages_from_cloud(conversation)
            return ConversationResponse(**conversation.model_dump())
        return None
    
    def _sync_messages_from_cloud(self, conversation: Conversation) -> None:
        """Sync messages from OpenHands Cloud to local conversation.
        
        Fetches events from the cloud and converts them to local messages.
        Only adds messages that don't already exist locally.
        """
        if not conversation.cloud_conversation_id:
            return
        
        if not SDK_AVAILABLE or not settings.openhands_api_key:
            print(f"[Sync] Cannot sync - SDK not available or no API key")
            return
        
        try:
            print(f"[Sync] Syncing messages from cloud conversation: {conversation.cloud_conversation_id}")
            
            api_key = settings.openhands_api_key.get_secret_value()
            client = OpenHandsCloudClient(api_key)
            
            # Fetch events from cloud
            events = client.get_events(conversation.cloud_conversation_id, limit=200)
            print(f"[Sync] Fetched {len(events)} events from cloud")
            
            # Get existing message IDs to avoid duplicates
            existing_ids = {msg.id for msg in conversation.messages}
            # Also track by content+timestamp to catch messages created from different sources
            existing_content = {(msg.content[:100], msg.sender) for msg in conversation.messages}
            
            new_messages = []
            for event in events:
                msg = self._cloud_event_to_message(event, conversation.id)
                if msg and msg.id not in existing_ids:
                    # Check if this content already exists (from a different source)
                    content_key = (msg.content[:100], msg.sender)
                    if content_key not in existing_content:
                        new_messages.append(msg)
                        existing_content.add(content_key)
            
            if new_messages:
                print(f"[Sync] Adding {len(new_messages)} new messages from cloud")
                # Sort by timestamp and add
                new_messages.sort(key=lambda m: m.timestamp)
                conversation.messages.extend(new_messages)
                # Re-sort all messages by timestamp
                conversation.messages.sort(key=lambda m: m.timestamp)
                conversation.updated_at = datetime.utcnow()
                self._persist_conversation(conversation)
            else:
                print(f"[Sync] No new messages to add")
                
        except Exception as e:
            print(f"[Sync] Error syncing from cloud: {e}")
            import traceback
            traceback.print_exc()
    
    def _cloud_event_to_message(self, event: dict, conversation_id: str) -> Optional[Message]:
        """Convert a cloud event to a local Message.
        
        Args:
            event: Cloud event dict
            conversation_id: Local conversation ID
        
        Returns:
            Message if event is a user or agent message, None otherwise
        """
        event_type = event.get("type", "")
        
        # Handle user messages
        if event_type == "UserMessageEvent":
            content = event.get("content", "")
            if isinstance(content, list):
                # Extract text from content array
                content = " ".join(
                    item.get("text", "") for item in content 
                    if isinstance(item, dict) and item.get("type") == "text"
                )
            
            if not content:
                return None
            
            timestamp = event.get("timestamp")
            if timestamp:
                try:
                    timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                except:
                    timestamp = datetime.utcnow()
            else:
                timestamp = datetime.utcnow()
            
            return Message(
                id=event.get("id", str(uuid4())),
                conversation_id=conversation_id,
                content=content,
                sender=MessageSender.USER,
                timestamp=timestamp,
                status=MessageStatus.SENT,
            )
        
        # Handle agent messages
        elif event_type == "MessageEvent":
            # Extract content from various possible locations
            content = ""
            
            # Try direct content field
            if event.get("content"):
                content = event.get("content")
            
            # Try llm_message.content
            llm_msg = event.get("llm_message", {})
            if not content and llm_msg:
                llm_content = llm_msg.get("content")
                if isinstance(llm_content, str):
                    content = llm_content
                elif isinstance(llm_content, list):
                    for item in llm_content:
                        if isinstance(item, dict) and item.get("type") == "text":
                            content = item.get("text", "")
                            break
                        elif isinstance(item, str):
                            content = item
                            break
            
            if not content:
                return None
            
            timestamp = event.get("timestamp")
            if timestamp:
                try:
                    timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                except:
                    timestamp = datetime.utcnow()
            else:
                timestamp = datetime.utcnow()
            
            return Message(
                id=event.get("id", str(uuid4())),
                conversation_id=conversation_id,
                content=content,
                sender=MessageSender.AGENT,
                agent_id="cloud-agent",
                agent_name="Agent",
                agent_color="#007AFF",
                timestamp=timestamp,
                status=MessageStatus.SENT,
            )
        
        # Skip other event types (tool calls, observations, etc.)
        return None
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """Delete a conversation."""
        if conversation_id in self._conversations:
            del self._conversations[conversation_id]
            self._delete_persisted_conversation(conversation_id)
            return True
        return False
    
    async def send_gitlive_setup(self, conversation_id: str) -> None:
        """Send VS Code Tunnel setup message to start the conversation."""
        print(f"[VSCode Tunnel] Sending setup message to conversation {conversation_id}")
        await self.send_message(conversation_id, VSCODE_TUNNEL_SETUP_MESSAGE)
        print(f"[VSCode Tunnel] Setup message sent")
    
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
        
        # Persist after adding messages
        self._persist_conversation(conversation)
        
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
        print(f"[ConvService] ========== handle_websocket_message START ==========")
        print(f"[ConvService] conversation_id: {conversation_id}")
        print(f"[ConvService] content: {content[:100]}...")
        print(f"[ConvService] mention_agent_id: {mention_agent_id}")
        
        conversation = self._conversations.get(conversation_id)
        if not conversation:
            print(f"[ConvService] ERROR: Conversation not found")
            await self._send_error(websocket, conversation_id, "Conversation not found")
            return
        
        print(f"[ConvService] Conversation found with {len(conversation.agent_ids)} agents")
        
        # Create and store user message
        user_message = Message(
            id=str(uuid4()),
            conversation_id=conversation_id,
            content=content,
            sender=MessageSender.USER,
            status=MessageStatus.SENT,
        )
        conversation.messages.append(user_message)
        print(f"[ConvService] User message created: {user_message.id}")
        
        # Send user message confirmation
        print(f"[ConvService] Broadcasting user message event...")
        await self._broadcast_event(
            conversation_id,
            MessageEvent(
                conversation_id=conversation_id,
                message_id=user_message.id,
                content=content,
                sender="user",
                timestamp=user_message.timestamp,
            ),
        )
        
        # Simulate typing indicator
        print(f"[ConvService] Broadcasting typing indicators...")
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
        
        # Generate response using SDK
        print(f"[ConvService] Calling _generate_mock_response (which uses SDK)...")
        try:
            agent_response = await self._generate_mock_response(
                conversation, content, mention_agent_id, user_message.timestamp
            )
            print(f"[ConvService] _generate_mock_response returned: {agent_response}")
            if agent_response:
                print(f"[ConvService] Response content: {agent_response.content[:200] if agent_response.content else 'None'}...")
        except Exception as e:
            print(f"[ConvService] ERROR in _generate_mock_response: {e}")
            import traceback
            traceback.print_exc()
            agent_response = None
        
        if agent_response:
            conversation.messages.append(agent_response)
            print(f"[ConvService] Agent response appended to conversation")
            
            # Stop typing indicator
            print(f"[ConvService] Stopping typing indicators...")
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
            print(f"[ConvService] Broadcasting agent response event...")
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
                    timestamp=agent_response.timestamp,
                ),
            )
            print(f"[ConvService] Agent response broadcast complete")
        else:
            print(f"[ConvService] WARNING: No agent response generated!")
        
        conversation.updated_at = datetime.utcnow()
        
        # Persist conversation after messages are added
        self._persist_conversation(conversation)
        print(f"[ConvService] ========== handle_websocket_message END ==========")
    
    def register_websocket(self, conversation_id: str, websocket: WebSocket):
        """Register a WebSocket connection for a conversation."""
        if conversation_id not in self._websockets:
            self._websockets[conversation_id] = []
        self._websockets[conversation_id].append(websocket)
        # DEBUG: Log all registered websockets
        print(f"[WS DEBUG] Registered websocket for conversation: {conversation_id}")
        print(f"[WS DEBUG] Total websockets for this conversation: {len(self._websockets[conversation_id])}")
        print(f"[WS DEBUG] All registered conversation IDs: {list(self._websockets.keys())}")
        for cid, ws_list in self._websockets.items():
            print(f"[WS DEBUG]   - {cid}: {len(ws_list)} connections")
    
    def unregister_websocket(self, conversation_id: str, websocket: WebSocket):
        """Unregister a WebSocket connection."""
        print(f"[WS DEBUG] Unregistering websocket for conversation: {conversation_id}")
        if conversation_id in self._websockets:
            try:
                self._websockets[conversation_id].remove(websocket)
                print(f"[WS DEBUG] Successfully removed. Remaining: {len(self._websockets[conversation_id])}")
            except ValueError:
                print(f"[WS DEBUG] WebSocket not found in list for conversation: {conversation_id}")
    
    async def _broadcast_event(self, conversation_id: str, event: Any):
        """Broadcast an event to all connected WebSockets for a conversation."""
        websockets = self._websockets.get(conversation_id, [])
        
        # Convert to dict if needed
        if hasattr(event, 'model_dump'):
            event_data = event.model_dump(mode='json')
        elif isinstance(event, dict):
            event_data = event
        else:
            event_data = {"data": str(event)}
        
        event_type = event_data.get('type', 'unknown')
        print(f"[WS DEBUG] ====== BROADCAST EVENT ======")
        print(f"[WS DEBUG] Target conversation_id: {conversation_id}")
        print(f"[WS DEBUG] Event type: {event_type}")
        print(f"[WS DEBUG] Number of websockets for this conversation: {len(websockets)}")
        print(f"[WS DEBUG] All registered conversations: {list(self._websockets.keys())}")
        
        if len(websockets) == 0:
            print(f"[WS DEBUG] WARNING: No websockets registered for conversation {conversation_id}!")
        
        for idx, ws in enumerate(websockets):
            try:
                print(f"[WS DEBUG] Sending to websocket {idx + 1}/{len(websockets)}")
                await ws.send_json(event_data)
                print(f"[WS DEBUG] Successfully sent to websocket {idx + 1}")
            except Exception as e:
                print(f"[WS DEBUG] Failed to broadcast event to websocket {idx + 1}: {e}")
    
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
        response_timestamp: Optional[datetime] = None,
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
                f"Agent '{agent_id}' not found.",
                response_timestamp,
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
                conversation, user_content, agent_id, agent_model, response_timestamp
            )
        else:
            # Use local SDK with direct provider API key
            llm = create_llm(usage_id=f"conv-{conversation.id}")
            if not llm:
                return await self._generate_fallback_response(
                    conversation, user_content, agent_id,
                    "LLM not configured. Please set your API key in Settings.",
                    response_timestamp,
                )
            
            return await self._run_conversation_with_llm(
                conversation, user_content, agent_id, agent_model, skill_models, llm, response_timestamp
            )
    
    async def _run_openhands_cloud_conversation(
        self,
        conversation: Conversation,
        user_content: str,
        agent_id: str,
        agent_model: "AgentModel",
        response_timestamp: Optional[datetime] = None,
    ) -> Optional[Message]:
        """Run conversation via OpenHands Cloud API.
        
        This starts a conversation on OpenHands Cloud infrastructure,
        which uses your account's LLM configuration.
        """
        print(f"[ConvService] ========== _run_openhands_cloud_conversation START ==========")
        print(f"[ConvService] conversation.id: {conversation.id}")
        print(f"[ConvService] user_content: {user_content[:100]}...")
        print(f"[ConvService] agent_id: {agent_id}")
        print(f"[ConvService] agent_model.name: {agent_model.name}")
        
        if not settings.openhands_api_key:
            print(f"[ConvService] ERROR: No OpenHands API key configured")
            return await self._generate_fallback_response(
                conversation, user_content, agent_id,
                "OpenHands API key not configured. Please set it in Settings.",
                response_timestamp,
            )
        
        api_key = settings.openhands_api_key.get_secret_value()
        print(f"[ConvService] API key obtained (length: {len(api_key)})")
        
        # Send typing indicator
        print(f"[ConvService] Sending typing indicator...")
        await self._broadcast_event(
            conversation.id,
            TypingEvent(
                conversation_id=conversation.id,
                agent_id=agent_id,
                agent_name=agent_model.name,
                is_typing=True,
            ),
        )
        
        try:
            # Run on OpenHands Cloud
            print(f"[ConvService] Creating OpenHandsCloudClient...")
            client = OpenHandsCloudClient(api_key)
            
            # Apply git restrictions if enabled
            prepared_content = self._prepare_content_with_restrictions(user_content)
            
            print(f"[ConvService] Calling client.run_message in executor...")
            loop = asyncio.get_event_loop()
            cloud_conv_id, response_text = await loop.run_in_executor(
                None, 
                lambda: client.run_message(prepared_content, timeout=300.0)
            )
            print(f"[ConvService] run_message returned:")
            print(f"[ConvService]   cloud_conv_id: {cloud_conv_id}")
            print(f"[ConvService]   response_text length: {len(response_text) if response_text else 0}")
            print(f"[ConvService]   response_text: {response_text[:500] if response_text else 'EMPTY'}...")
            
            # Store the cloud conversation ID so terminal can resume this conversation
            if cloud_conv_id:
                conversation.cloud_conversation_id = cloud_conv_id
                self._persist_conversation(conversation)
                print(f"[ConvService] Stored cloud_conversation_id: {cloud_conv_id}")
            
            # Stop typing indicator
            print(f"[ConvService] Stopping typing indicator...")
            await self._broadcast_event(
                conversation.id,
                TypingEvent(
                    type=EventType.TYPING_STOPPED,
                    conversation_id=conversation.id,
                    agent_id=agent_id,
                    agent_name=agent_model.name,
                    is_typing=False,
                ),
            )
            
            # Create response message
            if response_text:
                response_content = response_text
                print(f"[ConvService] Using actual response text")
            else:
                response_content = f"Conversation completed. View at: https://app.all-hands.dev/conversations/{cloud_conv_id}"
                print(f"[ConvService] WARNING: No response text, using fallback link message")
            
            message_id = str(uuid4())
            response_message = Message(
                id=message_id,
                conversation_id=conversation.id,
                content=response_content,
                sender=MessageSender.AGENT,
                agent_id=agent_id,
                agent_name=agent_model.name,
                agent_color=agent_model.color,
                status=MessageStatus.SENT,
                timestamp=response_timestamp or datetime.utcnow(),
            )
            
            print(f"[ConvService] Created response message: {message_id}")
            print(f"[ConvService] ========== _run_openhands_cloud_conversation END (SUCCESS) ==========")
            
            # Don't broadcast here - handle_websocket_message already broadcasts the returned message
            return response_message
            
        except Exception as e:
            print(f"[ConvService] ========== _run_openhands_cloud_conversation ERROR ==========")
            print(f"[ConvService] Error: {e}")
            import traceback
            traceback.print_exc()
            
            # Stop typing indicator
            await self._broadcast_event(
                conversation.id,
                TypingEvent(
                    type=EventType.TYPING_STOPPED,
                    conversation_id=conversation.id,
                    agent_id=agent_id,
                    agent_name=agent_model.name,
                    is_typing=False,
                ),
            )
            
            return await self._generate_fallback_response(
                conversation, user_content, agent_id,
                f"OpenHands Cloud error: {str(e)}",
                response_timestamp,
            )
    
    async def _run_conversation_with_llm(
        self,
        conversation: Conversation,
        user_content: str,
        agent_id: str,
        agent_model: "AgentModel",
        skill_models: list,
        llm: "LLM",
        response_timestamp: Optional[datetime] = None,
    ) -> Optional[Message]:
        """Run conversation with the given LLM instance."""
        from app.models.agent import Agent as AgentModel
        
        # Create SDK agent
        sdk_agent = create_sdk_agent(llm, agent_model, skill_models)
        if not sdk_agent:
            return await self._generate_fallback_response(
                conversation, user_content, agent_id,
                "Failed to create SDK agent.",
                response_timestamp,
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
            
            # Apply git restrictions if enabled
            prepared_content = self._prepare_content_with_restrictions(user_content)
            
            # Send message and run
            sdk_conv.send_message(prepared_content)
            
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
                timestamp=response_timestamp or datetime.utcnow(),
            )
            
        except Exception as e:
            print(f"[SDK] Conversation error: {e}")
            return await self._generate_fallback_response(
                conversation, user_content, agent_id,
                f"Error running conversation: {str(e)}",
                response_timestamp,
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
        response_timestamp: Optional[datetime] = None,
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
            timestamp=response_timestamp or datetime.utcnow(),
        )
    
    async def _generate_mock_response(
        self,
        conversation: Conversation,
        user_content: str,
        mention_agent_id: Optional[str],
        user_message_timestamp: Optional[datetime] = None,
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
        
        # Use timestamp slightly after user message to ensure correct ordering
        response_timestamp = (user_message_timestamp + timedelta(milliseconds=100)) if user_message_timestamp else datetime.utcnow()
        
        # Check if SDK is available
        if SDK_AVAILABLE and settings.has_llm_api_key:
            return await self._run_sdk_conversation(conversation, user_content, mention_agent_id, response_timestamp)
        
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
            timestamp=response_timestamp,
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
                        cloud_conversation_id=data.get("cloud_conversation_id"),
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
                "cloud_conversation_id": conversation.cloud_conversation_id,
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
