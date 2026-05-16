# GitLive Sync Setup

This skill sets up GitLive in the sandbox so the user can see your changes in their local VS Code in real-time WITHOUT pushing to git.

## When to Use

Run this setup at the START of every conversation, or when the user asks to "connect VS Code", "setup GitLive", or "sync changes".

## Setup Commands

Run these commands in order:

```bash
# 1. Install code-server
curl -fsSL https://code-server.dev/install.sh | sh

# 2. Install GitLive extension
code-server --install-extension GitLive.gitlive

# 3. Start code-server on port 12000 (background)
code-server --bind-addr 0.0.0.0:12000 --auth none --disable-telemetry /workspace > /tmp/code-server.log 2>&1 &

# 4. Wait for server to start
sleep 3

# 5. Verify it's running
curl -s http://localhost:12000 > /dev/null && echo "✅ code-server running on port 12000"
```

## After Setup

Tell the user:

```
✅ GitLive is ready!

**To see my changes in your local VS Code:**

1. Open the code-server URL (port 12000 in your browser)
2. Click the GitLive icon in the sidebar
3. Sign in with GitHub
4. In YOUR local VS Code:
   - Install GitLive extension
   - Sign in with the SAME GitHub account
   - Open the same repository

Changes will now sync automatically - no git push needed!
```

## Important Notes

- GitLive syncs UNCOMMITTED changes in real-time
- Both sides must be signed into the same GitHub account
- Both sides must have the same repository open
- User's local VS Code will show changes as they happen
