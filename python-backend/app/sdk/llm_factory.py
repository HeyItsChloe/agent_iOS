"""LLM factory for creating OpenHands SDK LLM instances."""

from typing import Optional

from pydantic import SecretStr

from app.config import settings

try:
    from openhands.sdk import LLM
    SDK_AVAILABLE = True
except ImportError:
    SDK_AVAILABLE = False
    LLM = None


def create_llm(
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    usage_id: str = "agent",
) -> Optional["LLM"]:
    """Create an LLM instance with the given configuration.
    
    Args:
        model: Model name (e.g., "anthropic/claude-sonnet-4-5-20250929")
        api_key: API key for the LLM provider
        base_url: Optional base URL for the LLM API
        usage_id: Identifier for usage tracking
    
    Returns:
        LLM instance if SDK is available and configured, None otherwise
    """
    if not SDK_AVAILABLE:
        return None
    
    # Use provided values or fall back to settings
    model = model or settings.llm_model
    base_url = base_url or settings.llm_base_url
    
    # Get API key
    if api_key:
        secret_key = SecretStr(api_key)
    elif settings.llm_api_key:
        secret_key = settings.llm_api_key
    else:
        return None
    
    return LLM(
        model=model,
        api_key=secret_key,
        base_url=base_url,
        usage_id=usage_id,
    )


def get_available_models() -> list[dict[str, str]]:
    """Get list of available models.
    
    Returns:
        List of model configurations with id, name, and optional base_url
    """
    return [
        # Direct provider APIs (use your own API keys)
        {"id": "anthropic/claude-sonnet-4-5-20250929", "name": "Claude Sonnet 4.5 (Anthropic)", "provider": "anthropic"},
        {"id": "anthropic/claude-haiku-3-5-20241022", "name": "Claude Haiku 3.5 (Anthropic)", "provider": "anthropic"},
        {"id": "openai/gpt-4o", "name": "GPT-4o (OpenAI)", "provider": "openai"},
        {"id": "openai/gpt-4o-mini", "name": "GPT-4o Mini (OpenAI)", "provider": "openai"},
        # OpenHands API (use OpenHands API key)
        {"id": "openhands/claude-sonnet-4-5-20250929", "name": "Claude Sonnet 4.5 (OpenHands)", "provider": "openhands", "base_url": "https://app.all-hands.dev"},
        {"id": "openhands/claude-haiku-3-5-20241022", "name": "Claude Haiku 3.5 (OpenHands)", "provider": "openhands", "base_url": "https://app.all-hands.dev"},
    ]
