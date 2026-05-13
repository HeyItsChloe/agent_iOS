"""Settings routes for application configuration."""

from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, SecretStr

from app.config import settings
from app.sdk.llm_factory import get_available_models

router = APIRouter(prefix="/settings", tags=["settings"])


class LLMSettingsRequest(BaseModel):
    """Request model for updating LLM settings."""
    model: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None


class LLMSettingsResponse(BaseModel):
    """Response model for LLM settings."""
    model: str
    has_api_key: bool
    base_url: Optional[str]
    available_models: list[dict[str, str]]


class AppSettingsResponse(BaseModel):
    """Response model for application settings."""
    data_dir: str
    default_workspace: str
    debug: bool


@router.get("/llm", response_model=LLMSettingsResponse)
async def get_llm_settings():
    """Get current LLM configuration (without exposing API key)."""
    return LLMSettingsResponse(
        model=settings.llm_model,
        has_api_key=settings.has_llm_api_key,
        base_url=settings.llm_base_url,
        available_models=get_available_models(),
    )


@router.post("/llm", response_model=LLMSettingsResponse)
async def update_llm_settings(request: LLMSettingsRequest):
    """Update LLM configuration.
    
    Note: This updates the runtime settings. For persistence across restarts,
    set environment variables or use a .env file.
    """
    if request.model:
        settings.llm_model = request.model
    
    if request.api_key:
        settings.llm_api_key = SecretStr(request.api_key)
    
    if request.base_url is not None:
        settings.llm_base_url = request.base_url if request.base_url else None
    
    return LLMSettingsResponse(
        model=settings.llm_model,
        has_api_key=settings.has_llm_api_key,
        base_url=settings.llm_base_url,
        available_models=get_available_models(),
    )


@router.get("/app", response_model=AppSettingsResponse)
async def get_app_settings():
    """Get application settings."""
    return AppSettingsResponse(
        data_dir=str(settings.data_dir),
        default_workspace=str(settings.default_workspace),
        debug=settings.debug,
    )


@router.get("/sdk-status")
async def get_sdk_status():
    """Get OpenHands SDK availability status."""
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
    
    return {
        "sdk_available": sdk_available,
        "sdk_version": sdk_version,
        "tools_available": tools_available,
        "llm_configured": settings.has_llm_api_key,
    }
