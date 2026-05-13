# iOS Agent Chat - Implementation Tasks

A comprehensive task list to implement the iOS-style messaging GUI for OpenHands SDK agents.

## Overview

| Phase | Description | Tasks |
|-------|-------------|-------|
| 1 | Project Setup & Architecture | 6 |
| 2 | Core Data Models & Types | 6 |
| 3 | Python Backend - SDK Integration | 8 |
| 4 | UI Components - Layout & Navigation | 5 |
| 5 | UI Components - Chat View | 8 |
| 6 | UI Components - Tool Output Rendering | 5 |
| 7 | UI Components - Modals & Forms | 6 |
| 8 | Hooks & State Management | 6 |
| 9 | Advanced Features | 6 |
| 10 | Testing & Polish | 6 |
| **Total** | | **62** |

---

## Phase 1: Project Setup & Architecture
*Foundation and tooling setup*

- [ ] **1.1 Initialize Electron + React + TypeScript project**
  - Use Vite or CRA with Electron Forge
  - Install: `electron`, `react`, `typescript`, `tailwindcss`

- [ ] **1.2 Set up Python backend sidecar (FastAPI)**
  - Create `python-backend/` directory
  - FastAPI server with WebSocket support
  - `requirements.txt` with dependencies

- [ ] **1.3 Create IPC bridge between Electron and Python**
  - Spawn Python process from Electron main process
  - Establish WebSocket connection for real-time events

- [ ] **1.4 Install and configure OpenHands SDK in Python backend**
  - `pip install openhands-sdk openhands-tools`
  - Set up LLM configuration (API keys, model selection)

- [ ] **1.5 Set up state management (Zustand)**
  - Create stores: `conversationStore`, `agentStore`, `settingsStore`

- [ ] **1.6 Configure Tailwind CSS with iOS theme**
  - Custom colors (`#007AFF` blue)
  - SF Pro font (or Inter fallback)
  - Rounded corners, shadows

---

## Phase 2: Core Data Models & Types
*TypeScript interfaces and Python models*

- [ ] **2.1 Define Message types**
  ```typescript
  interface Message {
    id: string;
    content: string;
    sender: 'user' | 'agent';
    agentId?: string;
    agentName?: string;
    agentColor?: string;
    timestamp: Date;
    status: 'sending' | 'sent' | 'delivered' | 'error';
    subAgentResults?: SubAgentResult[];
  }
  ```

- [ ] **2.2 Define Conversation types**
  ```typescript
  interface Conversation {
    id: string;
    title: string;
    type: 'single' | 'delegator' | 'group';
    agents: AgentDefinition[];
    skills: Skill[];
    messages: Message[];
    createdAt: Date;
    updatedAt: Date;
    isTyping: Record<string, boolean>;
  }
  ```

- [ ] **2.3 Define Agent types**
  ```typescript
  interface AgentDefinition {
    id: string;
    name: string;
    description: string;
    avatar: string;
    color: string;
    tools: string[];
    skills: string[];
    systemPrompt: string;
  }
  ```

- [ ] **2.4 Define Skill types**
  ```typescript
  interface Skill {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'coding' | 'documentation' | 'analysis' | 'custom';
    triggers?: string[];
    content: string;
  }
  ```

- [ ] **2.5 Define Tool types with annotations**
  ```typescript
  interface Tool {
    id: string;
    name: string;
    description: string;
    icon: string;
    annotations: {
      readOnly: boolean;
      destructive: boolean;
      idempotent: boolean;
      openWorld: boolean;
    };
  }
  ```

- [ ] **2.6 Create API protocol types (WebSocket messages)**
  - `MessageEvent`, `TypingEvent`, `ErrorEvent`
  - `ActionEvent`, `ObservationEvent`

---

## Phase 3: Python Backend - SDK Integration
*FastAPI routes and OpenHands SDK wiring*

- [ ] **3.1 Create ConversationService class**
  - Manage `Conversation` instances
  - Methods: `send_message()`, `run()`, `get_state()`

- [ ] **3.2 Create AgentManager class**
  - Create agents with tools/skills
  - Register custom agents
  - Manage LLM configuration

- [ ] **3.3 Implement GUIVisualizer (ConversationVisualizerBase)**
  ```python
  class GUIVisualizer(ConversationVisualizerBase):
      def on_event(self, event):
          # Emit WebSocket events:
          # - message_received
          # - typing_started
          # - typing_stopped
          # - error_occurred
  ```

- [ ] **3.4 Create WebSocket endpoint for real-time events**
  - `POST /conversations` - Create new conversation
  - `WS /conversations/{id}/stream` - Real-time event stream

- [ ] **3.5 Implement single agent conversation flow**
  - Create agent → Start conversation → Send message → Stream responses

- [ ] **3.6 Implement DelegateTool for sub-agent support**
  - Register `DelegateTool`
  - Spawn sub-agents
  - Delegate tasks, return nested results

- [ ] **3.7 Implement group chat (parallel agents)**
  - Multiple `Conversation` instances
  - `asyncio.gather()` for parallel responses

- [ ] **3.8 Add conversation persistence (save/restore)**
  - Save conversation state to JSON
  - Restore on app restart

---

## Phase 4: UI Components - Layout & Navigation
*Main app structure*

- [ ] **4.1 Create MainWindow component (split layout)**
  - Left sidebar (conversation list) + right panel (chat view)
  - Resizable divider

- [ ] **4.2 Create ConversationList sidebar component**
  - Search bar
  - Conversation items with avatar/preview/timestamp/skill badges

- [ ] **4.3 Create ConversationItem component**
  - Avatar (gradient background)
  - Title, last message preview, time
  - Unread indicator

- [ ] **4.4 Create NewChatButton and modal trigger**
  - Floating compose button
  - Opens chat type selector modal

- [ ] **4.5 Create ChatHeader component**
  - Back button, avatar, title
  - Agent count/status, skills badge, info button

---

## Phase 5: UI Components - Chat View
*Message display and input*

- [ ] **5.1 Create ChatView container component**
  - Header + messages area + input bar
  - Auto-scroll to bottom on new messages

- [ ] **5.2 Create MessageBubble component (user)**
  - Blue bubble (`#007AFF`)
  - Right-aligned
  - Rounded corners with tail
  - Timestamp, read status

- [ ] **5.3 Create MessageBubble component (agent)**
  - Gray bubble (`#E5E5EA`)
  - Left-aligned
  - Avatar (for group chat)
  - Agent name label

- [ ] **5.4 Create SubAgentResultCard component**
  - White nested card inside agent bubble
  - Icon, agent name, content

- [ ] **5.5 Create TypingIndicator component**
  - Animated 3 dots
  - Agent avatar(s)
  - "X is typing..." text

- [ ] **5.6 Create DateSeparator component**
  - Centered pill
  - "Today", "Yesterday", or date

- [ ] **5.7 Create InputBar component**
  - Plus button (attachments)
  - Rounded text input
  - Emoji button
  - Blue send button

- [ ] **5.8 Implement @mention autocomplete for group chat**
  - Type `@` to show agent picker
  - Insert `@AgentName`

---

## Phase 6: UI Components - Tool Output Rendering
*Render tool observations in chat*

- [ ] **6.1 Create TerminalOutput component**
  ```
  ┌─────────────────────────────────────┐
  │ 🖥️ Terminal                 exit: 0 │
  ├─────────────────────────────────────┤
  │ $ npm install                       │
  │ added 245 packages in 12s           │
  └─────────────────────────────────────┘
  ```

- [ ] **6.2 Create FileEditorOutput component**
  ```
  ┌─────────────────────────────────────┐
  │ 📄 src/app.py                       │
  ├─────────────────────────────────────┤
  │ - old line (red)                    │
  │ + new line (green)                  │
  └─────────────────────────────────────┘
  ```

- [ ] **6.3 Create TaskTrackerOutput component**
  ```
  ✅ Setup project
  🔄 Implement API (in progress)
  ⬜ Write tests
  ```

- [ ] **6.4 Create BrowserOutput component**
  - URL bar
  - Screenshot/preview area
  - Interactive element indices

- [ ] **6.5 Create DelegateOutput component**
  - Spawned agents list
  - Delegation results as nested cards

---

## Phase 7: UI Components - Modals & Forms
*Creation and selection flows*

- [ ] **7.1 Create NewChatModal component**
  - Chat type selector:
    - 👤 Single Agent
    - 🎭 Delegator + Sub-Agents
    - 👥 Group Chat

- [ ] **7.2 Create AgentSelectorModal component**
  - Chat type tabs
  - Main agent radio buttons
  - Sub-agent checkboxes
  - Built-in agents section

- [ ] **7.3 Create SkillSelectorModal component**
  - Search bar
  - Categorized skills (Coding, Docs, Analysis, Custom)
  - Checkboxes with descriptions

- [ ] **7.4 Create CreateAgentForm component**
  - Avatar picker
  - Name, description inputs
  - Color theme selector
  - System prompt textarea
  - Tools checkboxes

- [ ] **7.5 Create CreateSkillForm component**
  - Icon picker
  - Name, description inputs
  - Category dropdown
  - Trigger keywords input
  - Content textarea
  - Live preview

- [ ] **7.6 Create ToolSelector component**
  - 6 tools with icons and descriptions:
    - 🖥️ Terminal (⚡ Destructive, 🌐 Open World)
    - 📄 File Editor (⚡ Destructive)
    - 📋 Task Tracker (🔒 Safe, ♻️ Idempotent)
    - 🌐 Web Browser (🌐 Open World)
    - 🎭 Delegate (♻️ Idempotent)
    - ⚙️ Task (♻️ Idempotent)

---

## Phase 8: Hooks & State Management
*React hooks for data flow*

- [ ] **8.1 Create useConversations hook**
  - CRUD operations
  - Active conversation selection
  - Message history

- [ ] **8.2 Create useAgents hook**
  - Available agents list
  - Custom agents management
  - Agent creation

- [ ] **8.3 Create useSkills hook**
  - Available skills list
  - Custom skills management
  - Skill creation

- [ ] **8.4 Create useWebSocket hook**
  - Connect to Python backend
  - Handle events (message, typing, error)
  - Reconnection logic

- [ ] **8.5 Create useTypingIndicator hook**
  - Track which agents are typing
  - Timeout auto-clear

- [ ] **8.6 Create useMessageSender hook**
  - Send message
  - Optimistic update
  - Error handling

---

## Phase 9: Advanced Features
*Enhanced functionality*

- [ ] **9.1 Implement LLM streaming for typing effect**
  - Stream tokens from SDK
  - Update bubble text progressively

- [ ] **9.2 Implement conversation persistence to disk**
  - Save to `~/agent_iOS/conversations/*.json`
  - Restore on app launch

- [ ] **9.3 Implement agent/skill persistence**
  - Save custom agents and skills to config files
  - Load on app launch

- [ ] **9.4 Add keyboard shortcuts**
  - `Cmd+N` - New chat
  - `Cmd+Enter` - Send message
  - `Escape` - Close modal

- [ ] **9.5 Add notification sounds**
  - iOS-style message sent sound
  - Message received sound

- [ ] **9.6 Add dark mode support**
  - System preference detection
  - Dark theme colors

---

## Phase 10: Testing & Polish
*Quality assurance*

- [ ] **10.1 Write unit tests for Python backend**
  - Test `ConversationService`
  - Test `AgentManager`
  - Test WebSocket events

- [ ] **10.2 Write unit tests for React components**
  - Test `MessageBubble`
  - Test `InputBar`
  - Test modals with Vitest

- [ ] **10.3 Write integration tests for conversation flow**
  - End-to-end: create agent → send message → receive response

- [ ] **10.4 Add error boundaries and fallback UI**
  - Graceful error handling
  - Retry buttons

- [ ] **10.5 Performance optimization**
  - Virtualized message list (react-window)
  - Memoization
  - Lazy loading modals

- [ ] **10.6 Build and package for distribution**
  - electron-builder configuration
  - macOS `.dmg`
  - Windows `.exe`
  - Linux `.AppImage`

---

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| **Desktop Framework** | Electron |
| **Frontend** | React + TypeScript |
| **Styling** | Tailwind CSS |
| **State Management** | Zustand |
| **Backend** | Python + FastAPI |
| **SDK** | OpenHands SDK (`openhands-sdk`, `openhands-tools`) |
| **Communication** | WebSocket |
| **Testing** | Vitest (frontend), pytest (backend) |
| **Packaging** | electron-builder |

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/HeyItsChloe/agent_iOS.git
cd agent_iOS

# Install frontend dependencies
npm install

# Install backend dependencies
cd python-backend
pip install -r requirements.txt

# Set up environment variables
export LLM_API_KEY="your-api-key"
export LLM_MODEL="anthropic/claude-sonnet-4-5-20250929"

# Run in development mode
npm run dev
```

---

## Resources

- [OpenHands SDK Documentation](https://docs.openhands.dev/sdk)
- [Electron Documentation](https://www.electronjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [FastAPI](https://fastapi.tiangolo.com/)
