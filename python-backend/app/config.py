"""Application configuration."""

import os
from pathlib import Path
from typing import Optional

from pydantic import SecretStr
from pydantic_settings import BaseSettings


# Provider constants
PROVIDER_OPENHANDS = "openhands"
PROVIDER_ANTHROPIC = "anthropic"
PROVIDER_OPENAI = "openai"

# Default OpenHands Cloud base URL
OPENHANDS_BASE_URL = "https://app.all-hands.dev"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # LLM Configuration
    llm_model: str = "openhands/claude-sonnet-4-5-20250929"
    llm_base_url: Optional[str] = None
    
    # Provider-specific API keys
    openhands_api_key: Optional[SecretStr] = None
    anthropic_api_key: Optional[SecretStr] = None
    openai_api_key: Optional[SecretStr] = None
    
    # Legacy fallback (maps to provider based on model)
    llm_api_key: Optional[SecretStr] = None
    
    # OpenHands Cloud configuration
    openhands_base_url: str = OPENHANDS_BASE_URL
    
    # Server Configuration
    host: str = "127.0.0.1"
    port: int = 8765
    debug: bool = False
    
    # Storage paths
    data_dir: Path = Path.home() / ".agent_ios"
    conversations_dir: Path = data_dir / "conversations"
    agents_dir: Path = data_dir / "agents"
    skills_dir: Path = data_dir / "skills"
    
    # Workspace
    default_workspace: Path = Path.cwd()
    
    class Config:
        env_prefix = ""
        env_file = ".env"
        env_file_encoding = "utf-8"
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Create data directories if they don't exist
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.conversations_dir.mkdir(parents=True, exist_ok=True)
        self.agents_dir.mkdir(parents=True, exist_ok=True)
        self.skills_dir.mkdir(parents=True, exist_ok=True)
    
    def get_provider_from_model(self, model: Optional[str] = None) -> str:
        """Extract provider from model string (e.g., 'openhands/claude-...' -> 'openhands')."""
        model = model or self.llm_model
        if "/" in model:
            return model.split("/")[0].lower()
        return PROVIDER_OPENAI  # Default fallback
    
    def get_api_key_for_provider(self, provider: str) -> Optional[SecretStr]:
        """Get the appropriate API key for a provider."""
        if provider == PROVIDER_OPENHANDS:
            return self.openhands_api_key or self.llm_api_key
        elif provider == PROVIDER_ANTHROPIC:
            return self.anthropic_api_key or self.llm_api_key
        elif provider == PROVIDER_OPENAI:
            return self.openai_api_key or self.llm_api_key
        return self.llm_api_key
    
    def get_api_key_for_model(self, model: Optional[str] = None) -> Optional[SecretStr]:
        """Get the appropriate API key for the current or specified model."""
        provider = self.get_provider_from_model(model)
        return self.get_api_key_for_provider(provider)
    
    def get_base_url_for_model(self, model: Optional[str] = None) -> Optional[str]:
        """Get the appropriate base URL for the current or specified model."""
        provider = self.get_provider_from_model(model)
        if provider == PROVIDER_OPENHANDS:
            return self.openhands_base_url
        return self.llm_base_url
    
    def set_api_key_for_provider(self, provider: str, api_key: str) -> None:
        """Set the API key for a specific provider."""
        secret_key = SecretStr(api_key)
        if provider == PROVIDER_OPENHANDS:
            self.openhands_api_key = secret_key
        elif provider == PROVIDER_ANTHROPIC:
            self.anthropic_api_key = secret_key
        elif provider == PROVIDER_OPENAI:
            self.openai_api_key = secret_key
        else:
            self.llm_api_key = secret_key
    
    @property
    def has_llm_api_key(self) -> bool:
        """Check if any LLM API key is configured."""
        return any([
            self.openhands_api_key and len(self.openhands_api_key.get_secret_value()) > 0,
            self.anthropic_api_key and len(self.anthropic_api_key.get_secret_value()) > 0,
            self.openai_api_key and len(self.openai_api_key.get_secret_value()) > 0,
            self.llm_api_key and len(self.llm_api_key.get_secret_value()) > 0,
        ])
    
    @property
    def has_openhands_api_key(self) -> bool:
        """Check if OpenHands API key is configured."""
        key = self.openhands_api_key or self.llm_api_key
        return key is not None and len(key.get_secret_value()) > 0
    
    @property
    def has_anthropic_api_key(self) -> bool:
        """Check if Anthropic API key is configured."""
        key = self.anthropic_api_key or self.llm_api_key
        return key is not None and len(key.get_secret_value()) > 0
    
    @property
    def has_openai_api_key(self) -> bool:
        """Check if OpenAI API key is configured."""
        key = self.openai_api_key or self.llm_api_key
        return key is not None and len(key.get_secret_value()) > 0
    
    def has_api_key_for_model(self, model: Optional[str] = None) -> bool:
        """Check if API key is configured for the current or specified model."""
        key = self.get_api_key_for_model(model)
        return key is not None and len(key.get_secret_value()) > 0


# Global settings instance
settings = Settings()
