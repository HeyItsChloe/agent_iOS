"""LLM factory for creating OpenHands SDK LLM instances."""

from typing import Optional

import httpx
from pydantic import SecretStr

from app.config import (
    settings,
    PROVIDER_OPENHANDS,
    PROVIDER_ANTHROPIC,
    PROVIDER_OPENAI,
    OPENHANDS_BASE_URL,
)

try:
    from openhands.sdk import LLM
    SDK_AVAILABLE = True
except ImportError:
    SDK_AVAILABLE = False
    LLM = None


class OpenHandsCloudClient:
    """Client for OpenHands Cloud conversation API.
    
    Uses the Cloud API to run conversations on OpenHands infrastructure,
    which has access to your account's LLM configuration.
    """
    
    def __init__(self, api_key: str, base_url: str = OPENHANDS_BASE_URL):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
    
    def start_conversation(self, message: str) -> dict:
        """Start a new conversation on OpenHands Cloud.
        
        Args:
            message: The initial message/prompt
        
        Returns:
            Start task response with id and possibly app_conversation_id
        """
        response = httpx.post(
            f"{self.base_url}/api/v1/app-conversations",
            headers=self.headers,
            json={
                "initial_message": {
                    "content": [{"type": "text", "text": message}]
                }
            },
            timeout=60.0,
        )
        
        if response.status_code not in (200, 201):
            raise Exception(f"Failed to start conversation: {response.status_code} - {response.text}")
        
        return response.json()
    
    def get_start_task(self, start_task_id: str) -> dict:
        """Poll start task status to get app_conversation_id."""
        response = httpx.get(
            f"{self.base_url}/api/v1/app-conversations/start-tasks",
            params={"ids": start_task_id},
            headers=self.headers,
            timeout=30.0,
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to get start task: {response.status_code}")
        
        data = response.json()
        # Handle both list and dict responses
        if isinstance(data, list):
            return data[0] if data else {}
        items = data.get("items", [])
        return items[0] if items else {}
    
    def get_conversation(self, conversation_id: str) -> dict:
        """Get conversation status."""
        response = httpx.get(
            f"{self.base_url}/api/v1/app-conversations",
            params={"ids": conversation_id},
            headers=self.headers,
            timeout=30.0,
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to get conversation: {response.status_code}")
        
        data = response.json()
        # Handle both list and dict responses
        if isinstance(data, list):
            return data[0] if data else {}
        items = data.get("items", [])
        return items[0] if items else {}
    
    def get_events(self, conversation_id: str, limit: int = 100) -> list:
        """Get conversation events."""
        response = httpx.get(
            f"{self.base_url}/api/v1/conversation/{conversation_id}/events/search",
            params={"limit": limit},
            headers=self.headers,
            timeout=30.0,
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to get events: {response.status_code}")
        
        data = response.json()
        # Handle both list and dict responses
        if isinstance(data, list):
            return data
        return data.get("items", [])
    
    def wait_for_completion(self, conversation_id: str, timeout: float = 300.0) -> dict:
        """Wait for conversation to complete."""
        import time
        start_time = time.time()
        poll_count = 0
        
        print(f"[OpenHands Cloud] wait_for_completion: Starting polling for {conversation_id}")
        
        while time.time() - start_time < timeout:
            poll_count += 1
            elapsed = time.time() - start_time
            conv = self.get_conversation(conversation_id)
            status = conv.get("execution_status", "")
            
            print(f"[OpenHands Cloud] wait_for_completion: Poll #{poll_count} ({elapsed:.1f}s) - status={status}")
            
            if status in ("finished", "error", "stopped"):
                print(f"[OpenHands Cloud] wait_for_completion: Completed with status={status}")
                return conv
            
            time.sleep(2.0)
        
        print(f"[OpenHands Cloud] wait_for_completion: TIMEOUT after {timeout}s ({poll_count} polls)")
        raise Exception(f"Conversation timed out after {timeout}s")
    
    def run_message(self, message: str, timeout: float = 300.0) -> tuple[str, str]:
        """Run a message and return the response.
        
        Args:
            message: User message
            timeout: Max time to wait for completion
        
        Returns:
            Tuple of (conversation_id, assistant_response)
        """
        import time
        
        print(f"[OpenHands Cloud] ========== START run_message ==========")
        print(f"[OpenHands Cloud] Message: {message[:100]}...")
        print(f"[OpenHands Cloud] Timeout: {timeout}s")
        
        # Start conversation
        print(f"[OpenHands Cloud] Calling start_conversation...")
        start = self.start_conversation(message)
        print(f"[OpenHands Cloud] Started conversation response: {start}")
        
        # Get app_conversation_id
        conv_id = start.get("app_conversation_id")
        print(f"[OpenHands Cloud] Initial conv_id from response: {conv_id}")
        
        if not conv_id:
            # Poll start task
            start_task_id = start.get("id")
            print(f"[OpenHands Cloud] No conv_id, polling start_task_id: {start_task_id}")
            if not start_task_id:
                raise Exception("No start_task_id in response")
            
            for poll_attempt in range(30):
                task = self.get_start_task(start_task_id)
                print(f"[OpenHands Cloud] Poll {poll_attempt+1}/30 - Task status: {task}")
                conv_id = task.get("app_conversation_id")
                if conv_id:
                    print(f"[OpenHands Cloud] Got conv_id from polling: {conv_id}")
                    break
                time.sleep(1.0)
            
            if not conv_id:
                raise Exception("Failed to get conversation ID after 30 polls")
        
        print(f"[OpenHands Cloud] Final Conversation ID: {conv_id}")
        print(f"[OpenHands Cloud] View at: {self.base_url}/conversations/{conv_id}")
        
        # Wait for completion
        print(f"[OpenHands Cloud] Waiting for completion...")
        completion_result = self.wait_for_completion(conv_id, timeout)
        print(f"[OpenHands Cloud] Completion result: {completion_result}")
        print(f"[OpenHands Cloud] Execution status: {completion_result.get('execution_status')}")
        
        # Get events and extract assistant response
        print(f"[OpenHands Cloud] Fetching events...")
        events = self.get_events(conv_id)
        print(f"[OpenHands Cloud] Got {len(events)} events")
        
        # Debug: Print all event types
        for i, event in enumerate(events):
            source = event.get("source", "unknown")
            kind = event.get("kind", "unknown")
            print(f"[OpenHands Cloud] Event {i}: source={source}, kind={kind}")
        
        # Find the last assistant message
        # Note: MessageEvent uses source="assistant" (not "agent" - that's for ActionEvents)
        assistant_response = ""
        for event in reversed(events):
            kind = event.get("kind", "")
            source = event.get("source", "")
            
            # Check for assistant/agent MessageEvent
            if kind == "MessageEvent" and source in ("assistant", "agent"):
                print(f"[OpenHands Cloud] Found {source} MessageEvent")
                
                # Try multiple content extraction paths:
                
                # Path 1: Direct "message" field
                msg = event.get("message")
                if msg and isinstance(msg, str):
                    assistant_response = msg
                    print(f"[OpenHands Cloud] Extracted from 'message' field: {assistant_response[:200]}...")
                    break
                
                # Path 2: Direct "content" as string
                content = event.get("content")
                if content and isinstance(content, str):
                    assistant_response = content
                    print(f"[OpenHands Cloud] Extracted from 'content' string: {assistant_response[:200]}...")
                    break
                
                # Path 3: llm_message structure (OpenAI chat format)
                llm_msg = event.get("llm_message", {})
                if llm_msg:
                    llm_content = llm_msg.get("content")
                    
                    # 3a: content is a string directly
                    if isinstance(llm_content, str) and llm_content:
                        assistant_response = llm_content
                        print(f"[OpenHands Cloud] Extracted from 'llm_message.content' string: {assistant_response[:200]}...")
                        break
                    
                    # 3b: content is an array of content blocks
                    if isinstance(llm_content, list):
                        for block in llm_content:
                            if isinstance(block, dict):
                                # Text block: {"type": "text", "text": "..."}
                                if block.get("type") == "text" and block.get("text"):
                                    assistant_response = block.get("text", "")
                                    print(f"[OpenHands Cloud] Extracted from 'llm_message.content[].text': {assistant_response[:200]}...")
                                    break
                            elif isinstance(block, str) and block:
                                # Plain string in array
                                assistant_response = block
                                print(f"[OpenHands Cloud] Extracted from 'llm_message.content[]' string: {assistant_response[:200]}...")
                                break
                        if assistant_response:
                            break
                
                # Path 4: Check for nested message in llm_message
                if llm_msg.get("message"):
                    assistant_response = llm_msg.get("message")
                    print(f"[OpenHands Cloud] Extracted from 'llm_message.message': {assistant_response[:200]}...")
                    break
                
                # Path 5: extended_content field (some SDK versions)
                ext_content = event.get("extended_content", [])
                if ext_content and isinstance(ext_content, list):
                    for item in ext_content:
                        if isinstance(item, dict) and item.get("type") == "text":
                            assistant_response = item.get("text", "")
                            if assistant_response:
                                print(f"[OpenHands Cloud] Extracted from 'extended_content': {assistant_response[:200]}...")
                                break
                    if assistant_response:
                        break
                
                print(f"[OpenHands Cloud] Could not extract content from MessageEvent, full event: {event}")
        
        if not assistant_response:
            print(f"[OpenHands Cloud] WARNING: No assistant response extracted from events!")
            # Print condensed event info for debugging
            print(f"[OpenHands Cloud] Event summary for debugging:")
            for i, event in enumerate(events):
                print(f"[OpenHands Cloud]   {i}: kind={event.get('kind')}, source={event.get('source')}, keys={list(event.keys())}")
        
        print(f"[OpenHands Cloud] ========== END run_message ==========")
        print(f"[OpenHands Cloud] Returning: conv_id={conv_id}, response_length={len(assistant_response)}")
        
        return conv_id, assistant_response


def verify_openhands_api_key(api_key: str) -> bool:
    """Verify that an OpenHands API key is valid."""
    try:
        response = httpx.get(
            f"{OPENHANDS_BASE_URL}/api/v1/users/me",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10.0,
        )
        return response.status_code == 200
    except Exception:
        return False


def get_provider_from_model(model: str) -> str:
    """Extract provider from model string.
    
    Args:
        model: Model string like "oh:anthropic/claude-sonnet-4-5-20250929" or "anthropic/claude-sonnet-4-5-20250929"
    
    Returns:
        Provider string: "openhands", "anthropic", "openai", etc.
    
    Note:
        - "oh:" prefix indicates OpenHands Cloud routing
        - Without prefix, uses the first segment (e.g., "anthropic/..." -> "anthropic")
    """
    # Check for OpenHands prefix
    if model.startswith("oh:"):
        return PROVIDER_OPENHANDS
    
    if "/" in model:
        return model.split("/")[0].lower()
    return PROVIDER_OPENAI  # Default fallback


def normalize_model_for_llm(model: str) -> str:
    """Normalize model string for the LLM SDK.
    
    Removes the "oh:" prefix if present, since the SDK expects standard model names.
    
    Args:
        model: Model string, possibly with "oh:" prefix
    
    Returns:
        Normalized model string without "oh:" prefix
    """
    if model.startswith("oh:"):
        return model[3:]  # Remove "oh:" prefix
    return model


def create_llm(
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    usage_id: str = "agent",
) -> Optional["LLM"]:
    """Create an LLM instance with the given configuration.
    
    Automatically routes to the correct provider based on model prefix:
    - oh:* -> Uses OpenHands API key and OpenHands LiteLLM proxy
    - anthropic/* -> Uses Anthropic API key (direct)
    - openai/* -> Uses OpenAI API key (direct)
    
    Args:
        model: Model name (e.g., "oh:anthropic/claude-sonnet-4-5-20250929" or "anthropic/claude-sonnet-4-5-20250929")
        api_key: Override API key (uses provider-specific key from settings if not provided)
        base_url: Override base URL (auto-set for OpenHands models if not provided)
        usage_id: Identifier for usage tracking
    
    Returns:
        LLM instance if SDK is available and configured, None otherwise
    """
    if not SDK_AVAILABLE:
        return None
    
    # Use provided model or fall back to settings
    model = model or settings.llm_model
    provider = get_provider_from_model(model)
    
    # Get API key - use provided, then provider-specific, then legacy fallback
    if api_key:
        secret_key = SecretStr(api_key)
    else:
        secret_key = settings.get_api_key_for_provider(provider)
        if not secret_key:
            return None
    
    # Get base URL - use provided, then provider-specific
    if base_url is None:
        base_url = settings.get_base_url_for_model(model)
    
    # Normalize model name (remove "oh:" prefix) for the LLM SDK
    llm_model = normalize_model_for_llm(model)
    
    return LLM(
        model=llm_model,
        api_key=secret_key,
        base_url=base_url,
        usage_id=usage_id,
    )


def create_llm_for_provider(
    provider: str,
    model_suffix: str,
    api_key: Optional[str] = None,
    usage_id: str = "agent",
) -> Optional["LLM"]:
    """Create an LLM instance for a specific provider.
    
    Args:
        provider: Provider name ("openhands", "anthropic", "openai")
        model_suffix: Model name without provider prefix (e.g., "claude-sonnet-4-5-20250929")
        api_key: Override API key
        usage_id: Identifier for usage tracking
    
    Returns:
        LLM instance if SDK is available and configured, None otherwise
    """
    model = f"{provider}/{model_suffix}"
    return create_llm(model=model, api_key=api_key, usage_id=usage_id)


def get_available_models() -> list[dict[str, str]]:
    """Get list of available models grouped by provider.
    
    Returns:
        List of model configurations with id, name, provider, and optional base_url.
        Models are ordered with OpenHands first (recommended), then direct providers.
    
    Note: OpenHands Cloud models use a special "oh:" prefix. These run on OpenHands
    Cloud infrastructure and use the LLM configured in your OpenHands account.
    Direct models run locally and require your own provider API key.
    """
    return [
        # OpenHands Cloud (use OpenHands API key)
        # These run on OpenHands Cloud and use your account's LLM settings
        # The "oh:" prefix indicates OpenHands Cloud routing
        {
            "id": "oh:cloud",
            "name": "OpenHands Cloud (Your Account LLM)",
            "provider": PROVIDER_OPENHANDS,
            "description": "Uses LLM from your OpenHands Cloud account settings",
        },
        # Direct Anthropic API (use Anthropic API key)
        {
            "id": "anthropic/claude-sonnet-4-5-20250929",
            "name": "Claude Sonnet 4.5 (Direct)",
            "provider": PROVIDER_ANTHROPIC,
            "description": "Direct Anthropic API access",
        },
        {
            "id": "anthropic/claude-haiku-3-5-20241022",
            "name": "Claude Haiku 3.5 (Direct)",
            "provider": PROVIDER_ANTHROPIC,
            "description": "Direct Anthropic API access",
        },
        # Direct OpenAI API (use OpenAI API key)
        {
            "id": "openai/gpt-4o",
            "name": "GPT-4o (Direct)",
            "provider": PROVIDER_OPENAI,
            "description": "Direct OpenAI API access",
        },
        {
            "id": "openai/gpt-4o-mini",
            "name": "GPT-4o Mini (Direct)",
            "provider": PROVIDER_OPENAI,
            "description": "Fast and affordable OpenAI model",
        },
    ]


def get_provider_display_name(provider: str) -> str:
    """Get human-readable display name for a provider."""
    names = {
        PROVIDER_OPENHANDS: "OpenHands Cloud",
        PROVIDER_ANTHROPIC: "Anthropic",
        PROVIDER_OPENAI: "OpenAI",
    }
    return names.get(provider, provider.title())


def get_api_key_hint(provider: str) -> str:
    """Get hint text for where to obtain API key for a provider."""
    hints = {
        PROVIDER_OPENHANDS: "Get your API key at app.all-hands.dev",
        PROVIDER_ANTHROPIC: "Get your API key at console.anthropic.com",
        PROVIDER_OPENAI: "Get your API key at platform.openai.com",
    }
    return hints.get(provider, "Enter your API key")
