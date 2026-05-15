"""Application configuration."""

import json
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

# Config file name for persisted settings
CONFIG_FILE_NAME = "settings.json"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # LLM Configuration
    # Use "oh:cloud" for OpenHands Cloud (uses your account LLM settings)
    # Or use direct provider prefix (anthropic/*, openai/*) with your own API key
    llm_model: str = "oh:cloud"
    llm_base_url: Optional[str] = None
    
    # User Preferences
    quick_start_enabled: bool = False  # Skip agent/skill selection when starting new chat
    
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
        
        # Load persisted settings from disk
        self._load_persisted_settings()
    
    def _get_config_path(self) -> Path:
        """Get path to the persisted settings file."""
        return self.data_dir / CONFIG_FILE_NAME
    
    def _load_persisted_settings(self) -> None:
        """Load settings from the persisted config file."""
        config_path = self._get_config_path()
        if not config_path.exists():
            return
        
        try:
            with open(config_path, "r") as f:
                data = json.load(f)
            
            # Load model
            if "llm_model" in data:
                self.llm_model = data["llm_model"]
            
            if "llm_base_url" in data:
                self.llm_base_url = data["llm_base_url"]
            
            # Load preferences
            if "quick_start_enabled" in data:
                self.quick_start_enabled = data["quick_start_enabled"]
            
            # Load API keys (only if not already set via env vars)
            if "openhands_api_key" in data and not self.openhands_api_key:
                self.openhands_api_key = SecretStr(data["openhands_api_key"])
            
            if "anthropic_api_key" in data and not self.anthropic_api_key:
                self.anthropic_api_key = SecretStr(data["anthropic_api_key"])
            
            if "openai_api_key" in data and not self.openai_api_key:
                self.openai_api_key = SecretStr(data["openai_api_key"])
            
            print(f"[Config] Loaded settings from {config_path}")
        except Exception as e:
            print(f"[Config] Failed to load settings: {e}")
    
    def save_to_disk(self) -> None:
        """Persist current settings to disk."""
        config_path = self._get_config_path()
        
        data = {
            "llm_model": self.llm_model,
            "quick_start_enabled": self.quick_start_enabled,
        }
        
        if self.llm_base_url:
            data["llm_base_url"] = self.llm_base_url
        
        # Save API keys
        if self.openhands_api_key:
            data["openhands_api_key"] = self.openhands_api_key.get_secret_value()
        
        if self.anthropic_api_key:
            data["anthropic_api_key"] = self.anthropic_api_key.get_secret_value()
        
        if self.openai_api_key:
            data["openai_api_key"] = self.openai_api_key.get_secret_value()
        
        try:
            with open(config_path, "w") as f:
                json.dump(data, f, indent=2)
            
            # Set restrictive permissions (owner read/write only)
            config_path.chmod(0o600)
            print(f"[Config] Saved settings to {config_path}")
        except Exception as e:
            print(f"[Config] Failed to save settings: {e}")
    
    def get_provider_from_model(self, model: Optional[str] = None) -> str:
        """Extract provider from model string.
        
        Examples:
            - 'oh:anthropic/claude-...' -> 'openhands' (OpenHands Cloud)
            - 'anthropic/claude-...' -> 'anthropic' (Direct)
            - 'openai/gpt-4o' -> 'openai' (Direct)
        """
        model = model or self.llm_model
        
        # Check for OpenHands prefix
        if model.startswith("oh:"):
            return PROVIDER_OPENHANDS
        
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
            # Use the LiteLLM proxy endpoint for OpenHands Cloud
            return f"{self.openhands_base_url}/api/litellm"
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
