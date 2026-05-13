# Agent iOS 💬

An iOS-style messaging GUI for OpenHands SDK agents.

![Preview](https://img.shields.io/badge/Status-Phase_1--2_Complete-green)

## Features

- 🎨 **iOS Messages-style UI** - Familiar, beautiful chat interface
- 👥 **Group Chat** - Chat with multiple independent agents
- 🎭 **Delegator Mode** - One agent orchestrating sub-agents
- ⚡ **Skills** - Enhance agents with specialized knowledge
- 🔧 **Tools** - Terminal, File Editor, Browser, and more

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

## Project Structure

```
agent_iOS/
├── electron/               # Electron main process
│   ├── main.js            # Main process entry
│   └── preload.js         # IPC bridge
├── src/                   # React frontend
│   ├── components/        # UI components (Phase 4+)
│   ├── hooks/             # React hooks (Phase 8)
│   ├── stores/            # Zustand state stores
│   ├── types/             # TypeScript definitions
│   ├── styles/            # CSS and Tailwind
│   ├── api/               # API client (Phase 3+)
│   ├── App.tsx            # Main React component
│   └── main.tsx           # React entry point
├── python-backend/        # FastAPI backend
│   ├── app/
│   │   ├── main.py        # FastAPI app
│   │   ├── routes/        # API endpoints
│   │   ├── models/        # Pydantic models
│   │   └── services/      # Business logic
│   └── requirements.txt   # Python dependencies
├── index.html             # Static preview (demo)
├── app.html               # React app entry
├── TASKS.md               # Implementation checklist
└── package.json           # Node.js dependencies
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop Framework | Electron |
| Frontend | React + TypeScript |
| Styling | Tailwind CSS |
| State Management | Zustand |
| Backend | Python + FastAPI |
| SDK | OpenHands SDK |
| Communication | WebSocket |

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- OpenHands API Key (or your own LLM API key)

### Installation

```bash
# Clone the repository
git clone https://github.com/HeyItsChloe/agent_iOS.git
cd agent_iOS

# Install frontend dependencies
npm install

# Install backend dependencies
cd python-backend
pip install -r requirements.txt
cd ..

# Set up environment variables
export LLM_API_KEY="your-api-key"
export LLM_MODEL="anthropic/claude-sonnet-4-5-20250929"
```

### Development

```bash
# Run frontend only (for UI development)
npm run dev

# Run with Electron
npm run electron:dev

# Run Python backend separately
cd python-backend
uvicorn app.main:app --reload --port 8765
```

### Build

```bash
# Build for production
npm run electron:build
```

## Available Tools

| Tool | Description | Annotations |
|------|-------------|-------------|
| 🖥️ Terminal | Execute shell commands | ⚡ Destructive, 🌐 Open World |
| 📄 File Editor | View, create, edit files | ⚡ Destructive |
| 📋 Task Tracker | Track tasks with status | 🔒 Safe, ♻️ Idempotent |
| 🌐 Web Browser | Browse web pages | 🌐 Open World |
| 🎭 Delegate | Sub-agent delegation | ♻️ Idempotent |
| ⚙️ Task | Sync sub-agent tasks | ♻️ Idempotent |

## Built-in Agents

- 🤖 **General Assistant** - General-purpose AI assistant
- 💻 **Coding Expert** - Code review and implementation
- 🧠 **Planning Assistant** - Delegator with orchestration
- 🏨 **Lodging Expert** - Accommodation recommendations
- 🎯 **Activities Expert** - Activity itineraries
- 💰 **Finance Expert** - Budget planning
- ⌨️ **Bash Agent** - Terminal commands
- 📂 **Explore Agent** - File system navigation

## Built-in Skills

- 🐍 **Python Expert** - Python best practices
- ⚛️ **TypeScript/React** - Frontend development
- 🗄️ **Database Design** - SQL/NoSQL optimization
- 📝 **Technical Writer** - Documentation
- 📚 **API Documentation** - OpenAPI specs
- 🔒 **Security Analyst** - Vulnerability detection
- ⚡ **Performance Optimizer** - Code optimization

## Progress

See [TASKS.md](./TASKS.md) for the full implementation checklist.

- [x] Phase 1: Project Setup & Architecture
- [x] Phase 2: Core Data Models & Types
- [ ] Phase 3: Python Backend - SDK Integration
- [ ] Phase 4: UI Components - Layout & Navigation
- [ ] Phase 5: UI Components - Chat View
- [ ] Phase 6: UI Components - Tool Output Rendering
- [ ] Phase 7: UI Components - Modals & Forms
- [ ] Phase 8: Hooks & State Management
- [ ] Phase 9: Advanced Features
- [ ] Phase 10: Testing & Polish

## License

MIT

## Acknowledgments

- [OpenHands SDK](https://docs.openhands.dev/sdk) - AI agent framework
- [Electron](https://www.electronjs.org/) - Desktop app framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
