"""VS Code Server Service for 'Open in VS Code' integration.

This service manages the code-server instance and provides connection
information for the frontend's "Open in VS Code" button.
"""

import asyncio
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

@dataclass
class VSCodeServerStatus:
    """Status of the VS Code server."""
    running: bool
    port: int
    url: Optional[str]
    workspace: str
    gitlive_installed: bool
    tunnel_url: Optional[str] = None


class VSCodeService:
    """Manages VS Code server for workspace integration."""
    
    def __init__(self):
        self.port = int(os.environ.get("VSCODE_SERVER_PORT", 12000))
        self.workspace = os.environ.get("WORKSPACE_DIR", "/workspace")
        self.pid_file = Path("/tmp/code-server.pid")
        self.log_file = Path("/tmp/code-server.log")
        self._tunnel_process: Optional[subprocess.Popen] = None
    
    @property
    def is_running(self) -> bool:
        """Check if code-server is running."""
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
        if self.is_running:
            # Check for forwarded URL (e.g., OpenHands Cloud)
            forwarded_url = os.environ.get("VSCODE_FORWARDED_URL")
            if forwarded_url:
                return forwarded_url
            return f"http://localhost:{self.port}"
        return None
    
    async def start_server(self) -> VSCodeServerStatus:
        """Start the code-server if not already running."""
        if self.is_running:
            return await self.get_status()
        
        # Run startup script
        script_path = "/usr/local/bin/start-vscode-server.sh"
        if Path(script_path).exists():
            process = await asyncio.create_subprocess_exec(
                script_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            await process.communicate()
        else:
            # Fallback: start code-server directly
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
        
        # Wait for server to be ready
        await asyncio.sleep(2)
        
        return await self.get_status()
    
    async def stop_server(self) -> bool:
        """Stop the code-server."""
        if not self.is_running:
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
            tunnel_url=self._get_tunnel_url()
        )
    
    def _check_gitlive_installed(self) -> bool:
        """Check if GitLive extension is installed."""
        extensions_dir = Path.home() / ".local/share/code-server/extensions"
        if extensions_dir.exists():
            for ext in extensions_dir.iterdir():
                if "gitlive" in ext.name.lower():
                    return True
        return False
    
    def _get_tunnel_url(self) -> Optional[str]:
        """Get tunnel URL if available."""
        return os.environ.get("VSCODE_TUNNEL_URL")
    
    def get_vscode_uri(self) -> Optional[str]:
        """Generate vscode:// URI for opening in local VS Code.
        
        This URI can be used to open the user's local VS Code
        and connect it to this workspace via Remote - Tunnels.
        """
        tunnel_name = os.environ.get("VSCODE_TUNNEL_NAME")
        if tunnel_name:
            return f"vscode://vscode-remote/tunnel+{tunnel_name}{self.workspace}"
        return None


# Singleton instance
vscode_service = VSCodeService()
