"""VS Code integration API routes.

Provides endpoints for the "Open in VS Code" button functionality.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.services.vscode_service import vscode_service

router = APIRouter()


class VSCodeStatusResponse(BaseModel):
    """Response model for VS Code server status."""
    running: bool
    port: int
    url: Optional[str]
    workspace: str
    gitlive_installed: bool
    tunnel_url: Optional[str]
    vscode_uri: Optional[str]


class VSCodeConnectionInfo(BaseModel):
    """Connection information for opening in VS Code."""
    method: str  # "browser", "tunnel", or "vscode-uri"
    url: str
    instructions: str


@router.get("/status", response_model=VSCodeStatusResponse)
async def get_vscode_status():
    """Get current VS Code server status.
    
    Returns information about whether the code-server is running,
    GitLive installation status, and connection URLs.
    """
    status = await vscode_service.get_status()
    return VSCodeStatusResponse(
        running=status.running,
        port=status.port,
        url=status.url,
        workspace=status.workspace,
        gitlive_installed=status.gitlive_installed,
        tunnel_url=status.tunnel_url,
        vscode_uri=vscode_service.get_vscode_uri()
    )


@router.post("/start")
async def start_vscode_server():
    """Start the VS Code server.
    
    Starts code-server if not already running.
    Returns connection information.
    """
    status = await vscode_service.start_server()
    
    if not status.running:
        raise HTTPException(
            status_code=500,
            detail="Failed to start VS Code server"
        )
    
    return {
        "success": True,
        "status": VSCodeStatusResponse(
            running=status.running,
            port=status.port,
            url=status.url,
            workspace=status.workspace,
            gitlive_installed=status.gitlive_installed,
            tunnel_url=status.tunnel_url,
            vscode_uri=vscode_service.get_vscode_uri()
        )
    }


@router.post("/stop")
async def stop_vscode_server():
    """Stop the VS Code server."""
    success = await vscode_service.stop_server()
    return {"success": success}


@router.get("/connect", response_model=VSCodeConnectionInfo)
async def get_connection_info():
    """Get connection information for 'Open in VS Code' button.
    
    Returns the best available method for connecting to the workspace:
    1. vscode:// URI (opens local VS Code directly)
    2. Tunnel URL (for Remote - Tunnels)
    3. Browser URL (code-server in browser)
    """
    status = await vscode_service.get_status()
    
    # Ensure server is running
    if not status.running:
        status = await vscode_service.start_server()
    
    # Priority 1: VS Code URI (best UX - opens local VS Code)
    vscode_uri = vscode_service.get_vscode_uri()
    if vscode_uri:
        return VSCodeConnectionInfo(
            method="vscode-uri",
            url=vscode_uri,
            instructions="Click to open in your local VS Code"
        )
    
    # Priority 2: Tunnel URL
    if status.tunnel_url:
        return VSCodeConnectionInfo(
            method="tunnel",
            url=status.tunnel_url,
            instructions="Opens VS Code in browser, connected to workspace"
        )
    
    # Priority 3: Browser URL (code-server)
    if status.url:
        return VSCodeConnectionInfo(
            method="browser",
            url=status.url,
            instructions="Opens VS Code in your browser with GitLive pre-installed"
        )
    
    raise HTTPException(
        status_code=503,
        detail="VS Code server not available"
    )


@router.get("/gitlive/setup")
async def get_gitlive_setup_instructions():
    """Get GitLive setup instructions for syncing with local VS Code.
    
    Returns step-by-step instructions for setting up GitLive
    to see agent changes in the user's local VS Code.
    """
    status = await vscode_service.get_status()
    
    return {
        "agent_side": {
            "gitlive_installed": status.gitlive_installed,
            "steps": [
                "GitLive is pre-installed in the agent workspace",
                "Sign in with GitHub in the VS Code sidebar",
                "Open the workspace folder"
            ]
        },
        "user_side": {
            "steps": [
                "Install GitLive extension in your local VS Code",
                "Sign in with the same GitHub account",
                "Open the same repository locally",
                "Changes will sync automatically in real-time"
            ]
        },
        "benefits": [
            "See agent changes in real-time without pushing",
            "No manual sync required",
            "Changes appear in GitHub Desktop as local modifications"
        ]
    }
