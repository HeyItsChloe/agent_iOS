"""VS Code Server Service for 'Open in VS Code' integration.

This service manages the code-server instance and provides connection
information for the frontend's "Open in VS Code" button.

Supports two modes:
1. Docker/Container: Uses code-server (pre-baked in image)
2. Local development: Uses native VS Code via vscode:// URL
"""

import asyncio
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from app.config import settings


@dataclass
class VSCodeServerStatus:
    """Status of the VS Code server."""
    running: bool
    port: int
    url: Optional[str]
    workspace: str
    gitlive_installed: bool
    tunnel_url: Optional[str] = None
    is_local_mode: bool = False


class VSCodeService:
    """Manages VS Code server for workspace integration."""
    
    def __init__(self):
        self.port = int(os.environ.get("VSCODE_SERVER_PORT", 12000))
        self.workspace = os.environ.get("WORKSPACE_DIR", self._get_default_workspace())
        self.pid_file = Path("/tmp/code-server.pid")
        self.log_file = Path("/tmp/code-server.log")
        self._tunnel_process: Optional[subprocess.Popen] = None
        self._is_local_mode: Optional[bool] = None
    
    def _get_default_workspace(self) -> str:
        """Get the default workspace path."""
        # Try to get from settings
        try:
            return settings.default_workspace or os.getcwd()
        except Exception:
            return os.getcwd()
    
    @property
    def is_local_mode(self) -> bool:
        """Check if running in local mode (not Docker/container)."""
        if self._is_local_mode is not None:
            return self._is_local_mode
        
        # Detect local mode: no code-server available OR running on macOS/Windows
        has_code_server = shutil.which("code-server") is not None
        is_container = Path("/.dockerenv").exists() or os.environ.get("DOCKER_CONTAINER")
        
        self._is_local_mode = not has_code_server or (sys.platform == "darwin" and not is_container)
        return self._is_local_mode
    
    @property
    def is_running(self) -> bool:
        """Check if code-server is running."""
        if self.is_local_mode:
            return False  # Local mode doesn't run code-server
            
        if not self.pid_file.exists():
            return False
        try:
            pid = int(self.pid_file.read_text().strip())
            os.kill(pid, 0)  # Check if process exists
            return True
        except (ProcessLookupError, ValueError, FileNotFoundError):
            return False
    
    @property
    def server_url(self) -> Optional[str]:
        """Get the code-server URL if running."""
        if self.is_local_mode:
            return None
            
        if self.is_running:
            forwarded_url = os.environ.get("VSCODE_FORWARDED_URL")
            if forwarded_url:
                return forwarded_url
            return f"http://localhost:{self.port}"
        return None
    
    async def start_server(self) -> VSCodeServerStatus:
        """Start the code-server if not already running."""
        # In local mode, we don't start code-server
        if self.is_local_mode:
            return await self.get_status()
        
        if self.is_running:
            return await self.get_status()
        
        # Check if code-server is available
        if not shutil.which("code-server"):
            return await self.get_status()
        
        # Run startup script if available
        script_path = Path("/usr/local/bin/start-vscode-server.sh")
        if script_path.exists():
            try:
                process = await asyncio.create_subprocess_exec(
                    str(script_path),
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                await process.communicate()
            except Exception as e:
                print(f"[VS Code] Warning: Failed to run startup script: {e}")
        else:
            # Fallback: start code-server directly
            try:
                cmd = [
                    "code-server",
                    "--bind-addr", f"0.0.0.0:{self.port}",
                    "--auth", "none",
                    "--disable-telemetry",
                    self.workspace
                ]
                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                self.pid_file.write_text(str(process.pid))
            except FileNotFoundError:
                # code-server not installed, use local mode
                self._is_local_mode = True
                return await self.get_status()
        
        # Wait for server to be ready
        await asyncio.sleep(2)
        
        return await self.get_status()
    
    async def stop_server(self) -> bool:
        """Stop the code-server."""
        if self.is_local_mode or not self.is_running:
            return True
        
        try:
            pid = int(self.pid_file.read_text().strip())
            os.kill(pid, 15)  # SIGTERM
            self.pid_file.unlink(missing_ok=True)
            return True
        except Exception:
            return False
    
    async def get_status(self) -> VSCodeServerStatus:
        """Get current status of VS Code server."""
        return VSCodeServerStatus(
            running=self.is_running,
            port=self.port,
            url=self.server_url,
            workspace=self.workspace,
            gitlive_installed=self._check_gitlive_installed(),
            tunnel_url=self._get_tunnel_url(),
            is_local_mode=self.is_local_mode
        )
    
    def _check_gitlive_installed(self) -> bool:
        """Check if GitLive extension is installed."""
        # Check code-server extensions
        extensions_dir = Path.home() / ".local/share/code-server/extensions"
        if extensions_dir.exists():
            for ext in extensions_dir.iterdir():
                if "gitlive" in ext.name.lower():
                    return True
        
        # Check VS Code extensions (for local mode)
        vscode_extensions = Path.home() / ".vscode/extensions"
        if vscode_extensions.exists():
            for ext in vscode_extensions.iterdir():
                if "gitlive" in ext.name.lower():
                    return True
        
        return False
    
    def _get_tunnel_url(self) -> Optional[str]:
        """Get tunnel URL if available."""
        return os.environ.get("VSCODE_TUNNEL_URL")
    
    def get_vscode_uri(self) -> str:
        """Generate vscode:// URI for opening in local VS Code.
        
        This URI opens the workspace directly in the user's local VS Code.
        """
        # Use the workspace path
        workspace_path = self.workspace
        
        # Check for tunnel name (for remote connections)
        tunnel_name = os.environ.get("VSCODE_TUNNEL_NAME")
        if tunnel_name:
            return f"vscode://vscode-remote/tunnel+{tunnel_name}{workspace_path}"
        
        # Default: open folder directly in VS Code
        return f"vscode://file{workspace_path}"


# Singleton instance
vscode_service = VSCodeService()
