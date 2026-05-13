# iOS Agent Messenger 💬

<p align="center">
  <strong>An iOS Messages-style desktop messaging GUI for OpenHands SDK agents</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#development">Development</a> •
  <a href="#deployment">Deployment</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-blue" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/Python-3.11-green" alt="Python">
  <img src="https://img.shields.io/badge/Electron-28-purple" alt="Electron">
  <img src="https://img.shields.io/badge/Status-Complete-success" alt="Status">
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License">
</p>

---

## Features

### 💬 iOS-Style Interface
- Beautiful, familiar messaging UI inspired by iOS Messages
- Blue/gray message bubbles with smooth animations
- Message grouping by date with relative timestamps
- Typing indicators with bounce animation

### 🤖 Multi-Agent Support
- Chat with one or multiple AI agents simultaneously
- Create group conversations with different agent personalities
- @mention specific agents in group chats
- Visual agent avatars with customizable colors

### 🔧 Skills System
- Equip agents with specialized skills (coding, research, etc.)
- Create custom skills with triggers and content
- Built-in skills for common tasks

### ⚡ Real-time Communication
- WebSocket-powered live messaging
- Automatic reconnection with exponential backoff
- Connection health monitoring
- Live typing indicators

### 🎨 Modern Design
- Full dark mode support
- System theme detection
- Reduced motion accessibility
- Keyboard navigation with skip links

### 💻 Cross-Platform
- Native desktop app for macOS, Windows, and Linux
- Web browser support
- Docker deployment option

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Electron App (TypeScript/React)                    │
│  ┌───────────────┐  ┌────────────────────────────┐ │
│  │ Main Process  │  │ Renderer (React + Tailwind)│ │
│  │ - Spawns Python│  │ - iOS Messages UI          │ │
│  │ - IPC Bridge   │  │ - State Management         │ │
│  └───────┬───────┘  └────────────────────────────┘ │
│          │ WebSocket                                │
│  ┌───────▼─────────────────────────────────────────┐│
│  │ Python Sidecar (FastAPI)                        ││
│  │ - OpenHands SDK                                 ││
│  │ - Agent Management                              ││
│  │ - Conversation State                            ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

---

## Installation

### Prerequisites

- **Node.js** 20+ ([download](https://nodejs.org/))
- **Python** 3.10+ ([download](https://python.org/))
- **npm** (included with Node.js)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/HeyItsChloe/agent_iOS.git
cd agent_iOS

# Install frontend dependencies
npm install

# Install backend dependencies (use virtual environment)
cd python-backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..

# Configure environment (optional)
cp .env.example .env
# Edit .env with your API keys

# Start the app
npm run electron:dev
```

### macOS Quick Start

```bash
# Clone and install
git clone https://github.com/HeyItsChloe/agent_iOS.git
cd agent_iOS
npm install

# Python setup (requires Python 3.10+)
cd python-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

# Run in development mode
npm run electron:dev

# Or build the .app bundle
npm run electron:build
# Find the app at: dist-electron/mac-arm64/iOS Agent Messenger.app
```

### Using Docker

```bash
# Production build
docker-compose up -d

# Development with hot reload
docker-compose --profile dev up
```

---

## Usage

### Creating a Conversation

1. Click **New Chat** (or press `Cmd/Ctrl+N`)
2. Choose conversation type:
   - **Single Agent** - One-on-one chat
   - **Group Chat** - Multiple agents
   - **Sub-agents** - Hierarchical structure
3. Select agents and skills
4. Start chatting!

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+N` | New conversation |
| `Cmd/Ctrl+K` | Search conversations |
| `Enter` | Send message |
| `Shift+Enter` | New line |
| `Escape` | Close modal |

---

## Development

### Project Structure

```
ios-agent-messenger/
├── src/                      # React frontend
│   ├── components/           # UI components
│   ├── stores/               # Zustand state
│   ├── hooks/                # Custom hooks
│   ├── api/                  # API client
│   └── types/                # TypeScript types
├── python-backend/           # FastAPI backend
│   ├── app/
│   │   ├── routes/           # API endpoints
│   │   ├── services/         # Business logic
│   │   └── sdk/              # OpenHands SDK
│   └── tests/                # Backend tests
├── electron/                 # Electron main process
├── .github/workflows/        # CI/CD pipelines
└── assets/                   # Static assets
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Zustand, TailwindCSS |
| Backend | FastAPI, Pydantic, WebSockets |
| Desktop | Electron 28 |
| Build | Vite, electron-builder |
| Testing | Vitest, pytest |

### Scripts

```bash
# Development
npm run dev              # Start Vite dev server
npm run electron:dev     # Start Electron in dev mode

# Testing
npm run test             # Run frontend tests
npm run test:run         # Single run
cd python-backend && pytest  # Backend tests

# Building
npm run build            # Build frontend
npm run electron:build   # Build Electron app

# Linting
npm run lint             # Lint code
npm run typecheck        # Type check
```

---

## Deployment

### Desktop App

```bash
# macOS
npm run electron:build -- --mac

# Windows
npm run electron:build -- --win

# Linux
npm run electron:build -- --linux
```

### Docker

```bash
docker build -t ios-agent-messenger .
docker run -p 8765:8765 ios-agent-messenger
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | `8765` |
| `LLM_MODEL` | Default LLM model | `gpt-4` |
| `LLM_API_KEY` | LLM API key | - |
| `OPENHANDS_API_KEY` | OpenHands Cloud API key | - |

---

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/conversations` | List conversations |
| `POST` | `/api/conversations` | Create conversation |
| `GET` | `/api/agents` | List agents |
| `POST` | `/api/agents` | Create agent |
| `GET` | `/api/skills` | List skills |

### WebSocket

```typescript
const ws = new WebSocket('ws://localhost:8765/ws/conversations/{id}/stream');
ws.onmessage = (e) => {
  const data = JSON.parse(e.data);
  // Handle: message, typing, agent_update, error
};
```

---

## Progress

- [x] Phase 1: Project Setup & Architecture
- [x] Phase 2: Core Data Models & Types
- [x] Phase 3: Python Backend - SDK Integration
- [x] Phase 4: UI Components - Layout
- [x] Phase 5: UI Components - Chat
- [x] Phase 6: UI Components - Modals
- [x] Phase 7: Hooks & Features
- [x] Phase 8: Testing
- [x] Phase 9: Optimization
- [x] Phase 10: Deployment

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- [OpenHands SDK](https://docs.openhands.dev/sdk) - AI agent framework
- [Electron](https://www.electronjs.org/) - Desktop framework
- Apple iOS Messages - Design inspiration

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/HeyItsChloe">HeyItsChloe</a>
</p>
