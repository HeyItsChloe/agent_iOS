# Contributing to iOS Agent Messenger

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions. We're all here to build something great together.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/agent_iOS.git
   cd agent_iOS
   ```
3. **Set up the development environment**:
   ```bash
   npm install
   cd python-backend && pip install -r requirements.txt
   ```
4. **Create a branch** for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Running the App

```bash
# Frontend only
npm run dev

# With Electron
npm run electron:dev

# Backend only
cd python-backend
uvicorn app.main:app --reload --port 8765
```

### Code Style

#### TypeScript/React
- Use TypeScript for all new files
- Follow the existing code style
- Use functional components with hooks
- Run linting before committing:
  ```bash
  npm run lint
  npm run typecheck
  ```

#### Python
- Follow PEP 8 style guidelines
- Use type hints
- Run tests before committing:
  ```bash
  cd python-backend && pytest
  ```

### Testing

**Frontend tests:**
```bash
npm run test:run        # Single run
npm run test            # Watch mode
npm run test:coverage   # With coverage
```

**Backend tests:**
```bash
cd python-backend
pytest -v
pytest --cov           # With coverage
```

### Commit Messages

Use clear, descriptive commit messages:

```
feat: Add group chat support
fix: Resolve WebSocket reconnection issue
docs: Update README with Docker instructions
test: Add tests for message store
refactor: Simplify conversation service
```

Prefixes:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `test:` - Tests
- `refactor:` - Code refactoring
- `style:` - Formatting, no code change
- `chore:` - Maintenance tasks

## Pull Request Process

1. **Ensure all tests pass** locally
2. **Update documentation** if needed
3. **Create a Pull Request** with:
   - Clear title describing the change
   - Description of what and why
   - Screenshots for UI changes
   - Link to related issue (if any)

4. **Address review feedback** promptly

### PR Checklist

- [ ] Tests pass locally
- [ ] Linting passes
- [ ] Documentation updated (if needed)
- [ ] Screenshots included (for UI changes)
- [ ] No breaking changes (or documented)

## Project Structure

```
ios-agent-messenger/
├── src/                      # React frontend
│   ├── components/           # UI components
│   │   ├── chat/             # Chat components
│   │   ├── layout/           # Layout components
│   │   ├── modals/           # Modal dialogs
│   │   └── common/           # Shared components
│   ├── stores/               # Zustand state
│   ├── hooks/                # Custom hooks
│   ├── api/                  # API client
│   ├── types/                # TypeScript types
│   └── utils/                # Utilities
├── python-backend/           # FastAPI backend
│   ├── app/
│   │   ├── routes/           # API endpoints
│   │   ├── services/         # Business logic
│   │   ├── models/           # Pydantic models
│   │   └── sdk/              # SDK integration
│   └── tests/                # Backend tests
└── electron/                 # Electron process
```

## Adding Features

### Adding a New Component

1. Create component file in appropriate directory
2. Export from `index.ts`
3. Add tests
4. Update documentation if needed

### Adding a New API Endpoint

1. Create route in `python-backend/app/routes/`
2. Add models in `models/`
3. Implement service in `services/`
4. Add tests
5. Update API client in `src/api/`

### Adding a New Store

1. Create store in `src/stores/`
2. Add types in `src/types/`
3. Export from `index.ts`
4. Add tests

## Reporting Issues

When reporting issues, please include:

1. **Description** of the problem
2. **Steps to reproduce**
3. **Expected behavior**
4. **Actual behavior**
5. **Screenshots** (if applicable)
6. **Environment** (OS, Node version, Python version)

## Feature Requests

For feature requests, please:

1. Check if it already exists in issues
2. Describe the use case
3. Explain why it's valuable
4. Consider implementation approach

## Questions?

Feel free to open an issue for questions or join discussions.

---

Thank you for contributing! 🎉
