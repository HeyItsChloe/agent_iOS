"""Settings routes for application configuration."""

from typing import Any, Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, SecretStr

from app.config import (
    settings,
    PROVIDER_OPENHANDS,
    PROVIDER_ANTHROPIC,
    PROVIDER_OPENAI,
    OPENHANDS_BASE_URL,
)
from app.sdk.llm_factory import (
    get_available_models,
    get_provider_from_model,
    get_provider_display_name,
    get_api_key_hint,
)

router = APIRouter(prefix="/settings", tags=["settings"])


class LLMSettingsRequest(BaseModel):
    """Request model for updating LLM settings."""
    model: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None


class LLMSettingsResponse(BaseModel):
    """Response model for LLM settings."""
    model: str
    provider: str
    provider_display_name: str
    has_api_key: bool
    has_api_key_for_model: bool
    base_url: Optional[str]
    api_key_hint: str
    available_models: list[dict[str, Any]]


class TestConnectionRequest(BaseModel):
    """Request model for testing API connection."""
    provider: Optional[str] = None  # If not provided, uses current model's provider
    api_key: Optional[str] = None   # If not provided, uses stored key


class TestConnectionResponse(BaseModel):
    """Response model for connection test."""
    success: bool
    provider: str
    message: str
    details: Optional[dict[str, Any]] = None


class AppSettingsResponse(BaseModel):
    """Response model for application settings."""
    data_dir: str
    default_workspace: str
    debug: bool


class PreferencesResponse(BaseModel):
    """Response model for user preferences."""
    quick_start_enabled: bool
    block_agent_git_actions: bool


class PreferencesRequest(BaseModel):
    """Request model for updating user preferences."""
    quick_start_enabled: Optional[bool] = None
    block_agent_git_actions: Optional[bool] = None


class SDKStatusResponse(BaseModel):
    """Response model for SDK status."""
    sdk_available: bool
    sdk_version: str
    tools_available: bool
    llm_configured: bool
    providers: dict[str, dict[str, Any]]


@router.get("/llm", response_model=LLMSettingsResponse)
async def get_llm_settings():
    """Get current LLM configuration (without exposing API key)."""
    provider = settings.get_provider_from_model()
    
    return LLMSettingsResponse(
        model=settings.llm_model,
        provider=provider,
        provider_display_name=get_provider_display_name(provider),
        has_api_key=settings.has_llm_api_key,
        has_api_key_for_model=settings.has_api_key_for_model(),
        base_url=settings.get_base_url_for_model(),
        api_key_hint=get_api_key_hint(provider),
        available_models=get_available_models(),
    )


@router.post("/llm", response_model=LLMSettingsResponse)
async def update_llm_settings(request: LLMSettingsRequest):
    """Update LLM configuration.
    
    The API key is stored for the provider of the selected model.
    For example, if model is "oh:anthropic/claude-sonnet-4-5-20250929",
    the API key is stored as the OpenHands API key.
    
    Settings are persisted to ~/.agent_ios/settings.json and will
    survive server restarts.
    """
    # Update model if provided
    if request.model:
        settings.llm_model = request.model
    
    # Get the provider for the current model
    provider = settings.get_provider_from_model()
    
    # Store API key for the appropriate provider
    if request.api_key:
        settings.set_api_key_for_provider(provider, request.api_key)
    
    # Update base URL if provided (for custom endpoints)
    if request.base_url is not None:
        settings.llm_base_url = request.base_url if request.base_url else None
    
    # Persist settings to disk
    settings.save_to_disk()
    
    return LLMSettingsResponse(
        model=settings.llm_model,
        provider=provider,
        provider_display_name=get_provider_display_name(provider),
        has_api_key=settings.has_llm_api_key,
        has_api_key_for_model=settings.has_api_key_for_model(),
        base_url=settings.get_base_url_for_model(),
        api_key_hint=get_api_key_hint(provider),
        available_models=get_available_models(),
    )


@router.post("/test-connection", response_model=TestConnectionResponse)
async def test_connection(request: TestConnectionRequest):
    """Test API connection for a provider.
    
    Tests the connection by making a lightweight API call to the provider.
    For OpenHands, it calls /api/v1/users/me.
    For direct providers, it attempts a minimal API request.
    """
    # Determine provider
    if request.provider:
        provider = request.provider
    else:
        provider = settings.get_provider_from_model()
    
    # Get API key
    if request.api_key:
        api_key = request.api_key
    else:
        key = settings.get_api_key_for_provider(provider)
        if not key:
            return TestConnectionResponse(
                success=False,
                provider=provider,
                message=f"No API key configured for {get_provider_display_name(provider)}",
            )
        api_key = key.get_secret_value()
    
    try:
        if provider == PROVIDER_OPENHANDS:
            return await _test_openhands_connection(api_key)
        elif provider == PROVIDER_ANTHROPIC:
            return await _test_anthropic_connection(api_key)
        elif provider == PROVIDER_OPENAI:
            return await _test_openai_connection(api_key)
        else:
            return TestConnectionResponse(
                success=False,
                provider=provider,
                message=f"Unknown provider: {provider}",
            )
    except Exception as e:
        return TestConnectionResponse(
            success=False,
            provider=provider,
            message=f"Connection failed: {str(e)}",
        )


async def _test_openhands_connection(api_key: str) -> TestConnectionResponse:
    """Test OpenHands Cloud API connection."""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{OPENHANDS_BASE_URL}/api/v1/users/me",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=10.0,
            )
            
            if response.status_code == 200:
                data = response.json()
                return TestConnectionResponse(
                    success=True,
                    provider=PROVIDER_OPENHANDS,
                    message="Connected to OpenHands Cloud",
                    details={"email": data.get("email", "unknown")},
                )
            elif response.status_code == 401:
                return TestConnectionResponse(
                    success=False,
                    provider=PROVIDER_OPENHANDS,
                    message="Invalid API key",
                )
            else:
                return TestConnectionResponse(
                    success=False,
                    provider=PROVIDER_OPENHANDS,
                    message=f"API returned status {response.status_code}",
                )
        except httpx.TimeoutException:
            return TestConnectionResponse(
                success=False,
                provider=PROVIDER_OPENHANDS,
                message="Connection timed out",
            )


async def _test_anthropic_connection(api_key: str) -> TestConnectionResponse:
    """Test Anthropic API connection."""
    # Validate key format
    if not api_key.startswith("sk-ant-"):
        return TestConnectionResponse(
            success=False,
            provider=PROVIDER_ANTHROPIC,
            message="Invalid API key format (should start with 'sk-ant-')",
        )
    
    async with httpx.AsyncClient() as client:
        try:
            # Use a minimal request to validate the key
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-haiku-3-5-20241022",
                    "max_tokens": 1,
                    "messages": [{"role": "user", "content": "hi"}],
                },
                timeout=15.0,
            )
            
            if response.status_code == 200:
                return TestConnectionResponse(
                    success=True,
                    provider=PROVIDER_ANTHROPIC,
                    message="Connected to Anthropic API",
                )
            elif response.status_code == 401:
                return TestConnectionResponse(
                    success=False,
                    provider=PROVIDER_ANTHROPIC,
                    message="Invalid API key",
                )
            else:
                return TestConnectionResponse(
                    success=False,
                    provider=PROVIDER_ANTHROPIC,
                    message=f"API returned status {response.status_code}",
                )
        except httpx.TimeoutException:
            return TestConnectionResponse(
                success=False,
                provider=PROVIDER_ANTHROPIC,
                message="Connection timed out",
            )


async def _test_openai_connection(api_key: str) -> TestConnectionResponse:
    """Test OpenAI API connection."""
    # Validate key format
    if not api_key.startswith("sk-"):
        return TestConnectionResponse(
            success=False,
            provider=PROVIDER_OPENAI,
            message="Invalid API key format (should start with 'sk-')",
        )
    
    async with httpx.AsyncClient() as client:
        try:
            # Use models endpoint for a lightweight check
            response = await client.get(
                "https://api.openai.com/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=10.0,
            )
            
            if response.status_code == 200:
                return TestConnectionResponse(
                    success=True,
                    provider=PROVIDER_OPENAI,
                    message="Connected to OpenAI API",
                )
            elif response.status_code == 401:
                return TestConnectionResponse(
                    success=False,
                    provider=PROVIDER_OPENAI,
                    message="Invalid API key",
                )
            else:
                return TestConnectionResponse(
                    success=False,
                    provider=PROVIDER_OPENAI,
                    message=f"API returned status {response.status_code}",
                )
        except httpx.TimeoutException:
            return TestConnectionResponse(
                success=False,
                provider=PROVIDER_OPENAI,
                message="Connection timed out",
            )


@router.get("/app", response_model=AppSettingsResponse)
async def get_app_settings():
    """Get application settings."""
    return AppSettingsResponse(
        data_dir=str(settings.data_dir),
        default_workspace=str(settings.default_workspace),
        debug=settings.debug,
    )


@router.get("/preferences", response_model=PreferencesResponse)
async def get_preferences():
    """Get user preferences."""
    return PreferencesResponse(
        quick_start_enabled=settings.quick_start_enabled,
        block_agent_git_actions=settings.block_agent_git_actions,
    )


@router.post("/preferences", response_model=PreferencesResponse)
async def update_preferences(request: PreferencesRequest):
    """Update user preferences.
    
    Settings are persisted to ~/.agent_ios/settings.json.
    """
    if request.quick_start_enabled is not None:
        settings.quick_start_enabled = request.quick_start_enabled
    
    if request.block_agent_git_actions is not None:
        settings.block_agent_git_actions = request.block_agent_git_actions
    
    # Persist settings to disk
    settings.save_to_disk()
    
    return PreferencesResponse(
        quick_start_enabled=settings.quick_start_enabled,
        block_agent_git_actions=settings.block_agent_git_actions,
    )


@router.get("/sdk-status", response_model=SDKStatusResponse)
async def get_sdk_status():
    """Get OpenHands SDK availability status and provider configuration."""
    try:
        from openhands.sdk import Agent, LLM
        sdk_version = "available"
        sdk_available = True
    except ImportError:
        sdk_version = "not installed"
        sdk_available = False
    
    try:
        from openhands.tools.terminal import TerminalTool
        tools_available = True
    except ImportError:
        tools_available = False
    
    # Provider status
    providers = {
        PROVIDER_OPENHANDS: {
            "name": get_provider_display_name(PROVIDER_OPENHANDS),
            "configured": settings.has_openhands_api_key,
            "base_url": settings.openhands_base_url,
        },
        PROVIDER_ANTHROPIC: {
            "name": get_provider_display_name(PROVIDER_ANTHROPIC),
            "configured": settings.has_anthropic_api_key,
        },
        PROVIDER_OPENAI: {
            "name": get_provider_display_name(PROVIDER_OPENAI),
            "configured": settings.has_openai_api_key,
        },
    }
    
    return SDKStatusResponse(
        sdk_available=sdk_available,
        sdk_version=sdk_version,
        tools_available=tools_available,
        llm_configured=settings.has_llm_api_key,
        providers=providers,
    )
