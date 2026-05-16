# VS Code Integration

This document explains how the "Open in VS Code" feature works and how to use GitLive for real-time synchronization between the agent workspace and your local VS Code.

## Overview

The VS Code integration allows users to see agent changes in their local VS Code without manual push/pull operations. This is achieved through:

1. **Pre-baked code-server**: VS Code server is pre-installed in the container
2. **GitLive extension**: Pre-installed for real-time sync
3. **Background startup**: Server starts automatically on conversation start
4. **Zero user interaction**: Changes sync automatically

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CONTAINER                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  App Startup                                                     │   │
│  │     │                                                            │   │
│  │     ├──► Backend (FastAPI) ─────────────────► Port 8765          │   │
│  │     │                                                            │   │
│  │     └──► VS Code Server (background) ───────► Port 12000         │   │
│  │            + GitLive extension                                   │   │
│  │            + Workspace: /workspace                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                    │                              │
                    ▼                              ▼
             ┌──────────────┐              ┌──────────────────┐
             │  Frontend    │              │  User's VS Code  │
             │  "Open in    │              │  + GitLive       │
             │   VS Code"   │              │                  │
             └──────────────┘              └──────────────────┘
```

## How It Works

### 1. Container Build (Pre-baking)

The Dockerfile installs:
- `code-server` - VS Code in the browser
- `GitLive` extension - Real-time sync
- `VS Code CLI` - For tunnel support

```dockerfile
# Pre-bake code-server and GitLive
RUN curl -fsSL https://code-server.dev/install.sh | sh
RUN code-server --install-extension GitLive.gitlive
```

### 2. App Startup (Background)

When the conversation starts, the backend automatically starts the VS Code server:

```python
# In main.py lifespan
asyncio.create_task(start_vscode_server_background())
```

This is non-blocking - the main app starts immediately while VS Code server starts in the background.

### 3. User Clicks "Open in VS Code"

The button component calls `/api/vscode/connect` which returns the best available connection method:

| Priority | Method | Description |
|----------|--------|-------------|
| 1 | `vscode-uri` | Opens local VS Code directly |
| 2 | `tunnel` | VS Code in browser via tunnel |
| 3 | `browser` | code-server in browser |

### 4. GitLive Sync

Once both sides have GitLive:
- Changes sync in real-time
- No push/pull needed
- User's GitHub Desktop shows diffs as local changes

## API Endpoints

### GET /api/vscode/status

Returns VS Code server status:

```json
{
  "running": true,
  "port": 12000,
  "url": "http://localhost:12000",
  "workspace": "/workspace",
  "gitlive_installed": true,
  "tunnel_url": null,
  "vscode_uri": null
}
```

### POST /api/vscode/start

Starts the VS Code server (if not already running).

### POST /api/vscode/stop

Stops the VS Code server.

### GET /api/vscode/connect

Returns connection information for the "Open in VS Code" button:

```json
{
  "method": "browser",
  "url": "http://localhost:12000",
  "instructions": "Opens VS Code in your browser with GitLive pre-installed"
}
```

### GET /api/vscode/gitlive/setup

Returns GitLive setup instructions:

```json
{
  "agent_side": {
    "gitlive_installed": true,
    "steps": [...]
  },
  "user_side": {
    "steps": [...]
  },
  "benefits": [...]
}
```

## Frontend Components

### OpenInVSCodeButton

A React component that provides the "Open in VS Code" button:

```tsx
import { OpenInVSCodeButton } from './components/common/OpenInVSCodeButton';

// Default variant
<OpenInVSCodeButton />

// Compact variant
<OpenInVSCodeButton variant="compact" />

// Icon only
<OpenInVSCodeButton variant="icon-only" />
```

### useVSCode Hook

A React hook for VS Code integration:

```tsx
import { useVSCode } from './hooks/useVSCode';

function MyComponent() {
  const { status, loading, error, connect, refresh } = useVSCode();
  
  // status.running - is server running?
  // status.gitlive_installed - is GitLive installed?
  // connect() - get connection info and open VS Code
}
```

## User Setup (One-Time)

For real-time sync with GitLive, users need to:

1. **Install GitLive in local VS Code**
   - Open Extensions (Ctrl+Shift+X)
   - Search "GitLive"
   - Install

2. **Sign in with GitHub**
   - Click GitLive icon in sidebar
   - Sign in with same GitHub account used in agent

3. **Open the same repository locally**
   - Clone the repo if needed
   - Open in VS Code

4. **See live changes!**
   - Agent edits appear in real-time
   - Changes show in GitHub Desktop as local modifications

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VSCODE_SERVER_PORT` | 12000 | Port for code-server |
| `WORKSPACE_DIR` | /workspace | Workspace directory |
| `VSCODE_FORWARDED_URL` | - | Forwarded URL (for cloud deployments) |
| `VSCODE_TUNNEL_NAME` | - | Tunnel name for vscode:// URI |
| `VSCODE_TUNNEL_URL` | - | Full tunnel URL |

## Troubleshooting

### VS Code server not starting

Check logs:
```bash
cat /tmp/code-server.log
```

### GitLive not syncing

1. Ensure both sides are signed into the same GitHub account
2. Both must have the same repository open
3. Refresh GitLive in both VS Code instances

### Port already in use

Change `VSCODE_SERVER_PORT` environment variable:
```bash
VSCODE_SERVER_PORT=12001 docker-compose up
```

## Security Considerations

- code-server runs with `--auth none` by default (suitable for development)
- For production, configure authentication or use tunnels
- GitLive data syncs through GitLive's servers (not direct P2P)
