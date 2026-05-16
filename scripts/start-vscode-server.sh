#!/bin/bash
# VS Code Server Startup Script
# Starts code-server in background on conversation start for "Open in VS Code" feature

set -o pipefail

# Configuration
VSCODE_PORT="${VSCODE_SERVER_PORT:-12000}"
WORKSPACE="${WORKSPACE_DIR:-/workspace}"
LOG_FILE="/tmp/code-server.log"
PID_FILE="/tmp/code-server.pid"

# Colors for logging
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[VS Code Server]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[VS Code Server]${NC} $1"
}

# Check if already running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        log "Already running with PID $OLD_PID"
        exit 0
    else
        rm -f "$PID_FILE"
    fi
fi

# Ensure workspace directory exists
mkdir -p "$WORKSPACE"

# Start code-server in background
log "Starting code-server on port $VSCODE_PORT..."
log "Workspace: $WORKSPACE"

nohup code-server \
    --bind-addr "0.0.0.0:$VSCODE_PORT" \
    --auth none \
    --disable-telemetry \
    "$WORKSPACE" \
    > "$LOG_FILE" 2>&1 &

# Save PID
echo $! > "$PID_FILE"

# Wait briefly and verify startup
sleep 2

if kill -0 "$(cat $PID_FILE)" 2>/dev/null; then
    log "✓ code-server started successfully (PID: $(cat $PID_FILE))"
    log "✓ GitLive extension pre-installed"
    log "✓ Access at: http://localhost:$VSCODE_PORT"
else
    warn "✗ Failed to start code-server. Check $LOG_FILE for details."
    exit 1
fi
