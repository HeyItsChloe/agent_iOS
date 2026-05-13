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
        
        return response.json().get("items", [])
    
    def wait_for_completion(self, conversation_id: str, timeout: float = 300.0) -> dict:
        """Wait for conversation to complete."""
        import time
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            conv = self.get_conversation(conversation_id)
            status = conv.get("execution_status", "")
            
            if status in ("finished", "error", "stopped"):
                return conv
            
            time.sleep(2.0)
        
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
        
        # Start conversation
        start = self.start_conversation(message)
        print(f"[OpenHands Cloud] Started conversation: {start}")
        
        # Get app_conversation_id
        conv_id = start.get("app_conversation_id")
        if not conv_id:
            # Poll start task
            start_task_id = start.get("id")
            if not start_task_id:
                raise Exception("No start_task_id in response")
            
            for _ in range(30):
                task = self.get_start_task(start_task_id)
                conv_id = task.get("app_conversation_id")
                if conv_id:
                    break
                time.sleep(1.0)
            
            if not conv_id:
                raise Exception("Failed to get conversation ID")
        
        print(f"[OpenHands Cloud] Conversation ID: {conv_id}")
        print(f"[OpenHands Cloud] View at: {self.base_url}/conversations/{conv_id}")
        
        # Wait for completion
        self.wait_for_completion(conv_id, timeout)
        
        # Get events and extract assistant response
        events = self.get_events(conv_id)
        
        # Find the last assistant message
        assistant_response = ""
        for event in reversed(events):
            if event.get("source") == "assistant" and event.get("kind") == "MessageEvent":
                msg = event.get("message", {})
                if isinstance(msg, dict):
                    content = msg.get("content", [])
                    for c in content:
                        if isinstance(c, dict) and c.get("type") == "text":
                            assistant_response = c.get("text", "")
                            break
                elif isinstance(msg, str):
                    assistant_response = msg
                if assistant_response:
                    break
        
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
