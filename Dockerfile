# iOS Agent Messenger - Docker Image
# Multi-stage build for optimized production image

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build frontend
RUN npm run build

# Stage 2: Python backend
FROM python:3.11-slim AS backend

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# ============================================================
# Pre-bake code-server and GitLive for VS Code integration
# ============================================================

# Install code-server
RUN curl -fsSL https://code-server.dev/install.sh | sh

# Install GitLive extension for real-time sync
RUN code-server --install-extension GitLive.gitlive

# Install VS Code CLI for tunnel support
RUN curl -Lk 'https://code.visualstudio.com/sha/download?build=stable&os=cli-alpine-x64' -o /tmp/vscode_cli.tar.gz \
    && tar -xzf /tmp/vscode_cli.tar.gz -C /usr/local/bin \
    && rm /tmp/vscode_cli.tar.gz

# Create startup script for VS Code server
COPY scripts/start-vscode-server.sh /usr/local/bin/start-vscode-server.sh
RUN chmod +x /usr/local/bin/start-vscode-server.sh

# ============================================================

# Copy Python requirements and install
COPY python-backend/requirements.txt ./python-backend/
RUN pip install --no-cache-dir -r python-backend/requirements.txt

# Copy backend code
COPY python-backend ./python-backend

# Copy built frontend
COPY --from=frontend-builder /app/dist ./dist

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV HOST=0.0.0.0
ENV PORT=8765
ENV VSCODE_SERVER_PORT=12000
ENV WORKSPACE_DIR=/workspace

# Expose ports
EXPOSE 8765
EXPOSE 12000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8765/health || exit 1

# Run the application with VS Code server startup
WORKDIR /app/python-backend
CMD ["/bin/bash", "-c", "start-vscode-server.sh & python -m uvicorn app.main:app --host 0.0.0.0 --port 8765"]
