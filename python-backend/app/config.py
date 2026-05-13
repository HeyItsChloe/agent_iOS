"""Application configuration."""

import os
from pathlib import Path
from typing import Optional

from pydantic import SecretStr
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # LLM Configuration
    llm_model: str = "anthropic/claude-sonnet-4-5-20250929"
    llm_api_key: Optional[SecretStr] = None
    llm_base_url: Optional[str] = None
    
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
    
    @property
    def has_llm_api_key(self) -> bool:
        """Check if LLM API key is configured."""
        return self.llm_api_key is not None and len(self.llm_api_key.get_secret_value()) > 0


# Global settings instance
settings = Settings()
