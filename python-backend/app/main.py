"""FastAPI main application entry point with OpenHands SDK integration."""

import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import conversations, agents, skills, health
from app.routes.websocket import router as websocket_router
from app.routes.settings import router as settings_router
from app.routes.vscode import router as vscode_router

# Check SDK availability
try:
    from openhands.sdk import Agent, LLM
    SDK_AVAILABLE = True
except ImportError:
    SDK_AVAILABLE = False


async def start_vscode_server_background():
    """Start VS Code server in background on app startup."""
    try:
        from app.services.vscode_service import vscode_service
        status = await vscode_service.start_server()
        if status.running:
            print(f"[VS Code] Server started on port {status.port}")
            print(f"[VS Code] GitLive installed: {status.gitlive_installed}")
            print(f"[VS Code] Workspace: {status.workspace}")
        else:
            print("[VS Code] Warning: Failed to start server")
    except Exception as e:
        print(f"[VS Code] Warning: Could not start server: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler for startup/shutdown."""
    # Startup
    print("=" * 50)
    print("[Backend] Starting iOS Agent Chat...")
    print(f"  Data directory: {settings.data_dir}")
    print(f"  SDK available: {SDK_AVAILABLE}")
    print(f"  LLM configured: {settings.has_llm_api_key}")
    print(f"  Model: {settings.llm_model}")
    print("=" * 50)
    
    # Register built-in agents with SDK if available
    if SDK_AVAILABLE:
        try:
            from app.sdk.agent_factory import register_builtin_agents
            registered = register_builtin_agents()
            print(f"[Backend] Registered {len(registered)} built-in agents with SDK")
        except Exception as e:
            print(f"[Backend] Warning: Failed to register built-in agents: {e}")
    
    # Start VS Code server in background (non-blocking)
    import asyncio
    asyncio.create_task(start_vscode_server_background())
    
    yield
    
    # Shutdown
    print("[Backend] Shutting down...")
    
    # Stop VS Code server
    try:
        from app.services.vscode_service import vscode_service
        await vscode_service.stop_server()
        print("[VS Code] Server stopped")
    except Exception:
        pass


app = FastAPI(
    title="Agent iOS Backend",
    description="FastAPI backend for iOS-style OpenHands SDK chat GUI",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware for Electron renderer
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to app origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(conversations.router, prefix="/api/conversations", tags=["Conversations"])
app.include_router(agents.router, prefix="/api/agents", tags=["Agents"])
app.include_router(skills.router, prefix="/api/skills", tags=["Skills"])
app.include_router(settings_router, prefix="/api", tags=["Settings"])
app.include_router(websocket_router, prefix="/ws", tags=["WebSocket"])
app.include_router(vscode_router, prefix="/api/vscode", tags=["VS Code"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "Agent iOS Backend",
        "version": "0.1.0",
        "status": "running",
        "sdk_available": SDK_AVAILABLE,
        "llm_configured": settings.has_llm_api_key,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        log_level="debug" if settings.debug else "info",
    )
