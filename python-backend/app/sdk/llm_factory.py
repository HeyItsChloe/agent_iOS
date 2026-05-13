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


def get_llm_from_openhands_cloud(api_key: str) -> Optional["LLM"]:
    """Get LLM configuration from OpenHands Cloud account.
    
    Calls GET /api/v1/users/me?expose_secrets=true to fetch the user's
    LLM configuration from their OpenHands Cloud account.
    
    Args:
        api_key: OpenHands Cloud API key
    
    Returns:
        Configured LLM instance, or None if failed
    """
    if not SDK_AVAILABLE:
        return None
    
    try:
        # Call OpenHands Cloud API to get user's LLM settings
        response = httpx.get(
            f"{OPENHANDS_BASE_URL}/api/v1/users/me",
            params={"expose_secrets": "true"},
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=30.0,
        )
        
        if response.status_code != 200:
            print(f"[OpenHands Cloud] Failed to get user settings: {response.status_code}")
            print(f"[OpenHands Cloud] Response: {response.text[:500]}")
            return None
        
        data = response.json()
        
        # Extract LLM settings from response
        llm_model = data.get("settings", {}).get("llm_model")
        llm_api_key = data.get("settings", {}).get("llm_api_key")
        llm_base_url = data.get("settings", {}).get("llm_base_url")
        
        if not llm_model or not llm_api_key:
            print(f"[OpenHands Cloud] No LLM configured in your account. Configure at {OPENHANDS_BASE_URL}")
            print(f"[OpenHands Cloud] Available settings: {list(data.get('settings', {}).keys())}")
            return None
        
        print(f"[OpenHands Cloud] Using LLM from your account: {llm_model}")
        
        return LLM(
            model=llm_model,
            api_key=SecretStr(llm_api_key),
            base_url=llm_base_url if llm_base_url else None,
        )
        
    except Exception as e:
        print(f"[OpenHands Cloud] Error fetching LLM config: {e}")
        return None


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
