"""FastAPI main application entry point."""

import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import conversations, agents, skills, health


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler for startup/shutdown."""
    # Startup
    print("[Backend] Starting up...")
    yield
    # Shutdown
    print("[Backend] Shutting down...")


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


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "Agent iOS Backend",
        "version": "0.1.0",
        "status": "running",
    }
