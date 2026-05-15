const { app, BrowserWindow, ipcMain, Menu, shell, dialog, nativeTheme } = require('electron');
const path = require('path');
const { spawn, execSync, spawnSync } = require('child_process');
const http = require('http');

// App configuration
const APP_NAME = 'iOS Agent Messenger';
const PYTHON_BACKEND_PORT = process.env.BACKEND_PORT || 8765;
const BACKEND_STARTUP_TIMEOUT = 30000; // 30 seconds
const HEALTH_CHECK_INTERVAL = 1000; // 1 second

let mainWindow = null;
let pythonProcess = null;
let splashWindow = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

/**
 * Create the splash/loading window.
 */
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.center();
}

/**
 * Create the main application window.
 */
function createWindow() {
  const windowState = {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
  };

  mainWindow = new BrowserWindow({
    ...windowState,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1C1C1E' : '#F2F2F7',
    show: false,
    icon: path.join(__dirname, '../assets/icon.png'),
  });

  // Create application menu
  createAppMenu();

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.destroy();
      splashWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Update theme on system change
  nativeTheme.on('updated', () => {
    mainWindow?.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
  });
}

/**
 * Create the application menu.
 */
function createAppMenu() {
  const template = [
    ...(process.platform === 'darwin' ? [{
      label: APP_NAME,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow?.webContents.send('menu-open-settings'),
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Conversation',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu-new-conversation'),
        },
        { type: 'separator' },
        ...(process.platform !== 'darwin' ? [
          {
            label: 'Preferences...',
            accelerator: 'CmdOrCtrl+,',
            click: () => mainWindow?.webContents.send('menu-open-settings'),
          },
          { type: 'separator' },
        ] : []),
        { role: process.platform === 'darwin' ? 'close' : 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'Contacts',
      submenu: [
        {
          label: 'View All Agents',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => mainWindow?.webContents.send('menu-show-contacts'),
        },
        { type: 'separator' },
        {
          label: 'New Agent...',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => mainWindow?.webContents.send('menu-new-agent'),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin' ? [
          { type: 'separator' },
          { role: 'front' },
        ] : [
          { role: 'close' },
        ]),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://github.com/HeyItsChloe/agent_iOS#readme'),
        },
        {
          label: 'Report Issue',
          click: () => shell.openExternal('https://github.com/HeyItsChloe/agent_iOS/issues'),
        },
        { type: 'separator' },
        {
          label: 'About OpenHands SDK',
          click: () => shell.openExternal('https://docs.openhands.dev/sdk'),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Check if Python is available.
 */
function checkPythonAvailable() {
  const pythonCommands = process.platform === 'win32' 
    ? ['python', 'python3', 'py'] 
    : ['python3', 'python'];

  for (const cmd of pythonCommands) {
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore' });
      return cmd;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Wait for the backend to be healthy.
 */
function waitForBackend(timeout = BACKEND_STARTUP_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkHealth = () => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: PYTHON_BACKEND_PORT,
        path: '/health',
        method: 'GET',
        timeout: 1000,
      }, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          scheduleNextCheck();
        }
      });

      req.on('error', () => scheduleNextCheck());
      req.on('timeout', () => {
        req.destroy();
        scheduleNextCheck();
      });
      req.end();
    };

    const scheduleNextCheck = () => {
      if (Date.now() - startTime > timeout) {
        reject(new Error('Backend startup timeout'));
      } else {
        setTimeout(checkHealth, HEALTH_CHECK_INTERVAL);
      }
    };

    checkHealth();
  });
}

/**
 * Start the Python backend server.
 */
async function startPythonBackend() {
  const pythonExecutable = checkPythonAvailable();
  
  if (!pythonExecutable) {
    dialog.showErrorBox(
      'Python Not Found',
      'Python 3 is required to run the backend server.\n\nPlease install Python 3.10+ and try again.'
    );
    app.quit();
    return false;
  }

  const pythonPath = isDev
    ? path.join(__dirname, '../python-backend')
    : path.join(process.resourcesPath, 'python-backend');

  console.log(`[Backend] Starting Python backend from: ${pythonPath}`);
  console.log(`[Backend] Using Python: ${pythonExecutable}`);

  pythonProcess = spawn(
    pythonExecutable,
    ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', String(PYTHON_BACKEND_PORT)],
    {
      cwd: pythonPath,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        PYTHONDONTWRITEBYTECODE: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Backend] ${data.toString().trim()}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Backend] ${data.toString().trim()}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`[Backend] Process exited with code ${code}`);
    pythonProcess = null;
  });

  pythonProcess.on('error', (err) => {
    console.error('[Backend] Failed to start:', err);
    pythonProcess = null;
  });

  // Wait for backend to be healthy
  try {
    await waitForBackend();
    console.log('[Backend] Server is ready');
    return true;
  } catch (error) {
    console.error('[Backend] Failed to start:', error.message);
    stopPythonBackend();
    return false;
  }
}

/**
 * Stop the Python backend server.
 */
function stopPythonBackend() {
  if (pythonProcess) {
    console.log('[Backend] Stopping server...');
    
    // Graceful shutdown
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', pythonProcess.pid, '/f', '/t']);
    } else {
      pythonProcess.kill('SIGTERM');
      
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (pythonProcess) {
          pythonProcess.kill('SIGKILL');
        }
      }, 5000);
    }
    
    pythonProcess = null;
  }
}

// IPC Handlers
ipcMain.handle('get-backend-url', () => {
  return `http://127.0.0.1:${PYTHON_BACKEND_PORT}`;
});

ipcMain.handle('get-websocket-url', () => {
  return `ws://127.0.0.1:${PYTHON_BACKEND_PORT}`;
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

// ==================== Tool Action IPC Handlers ====================

/**
 * Get the current workspace directory.
 * In development, uses the project root. In production, could be user-configurable.
 */
function getWorkspaceDir() {
  // Use WORKSPACE_DIR env var if set, otherwise use current working directory
  return process.env.WORKSPACE_DIR || process.cwd();
}

/**
 * Tool: Open Terminal in project directory with OpenHands CLI.
 * Opens the native terminal application at the workspace path and runs openhands.
 */
ipcMain.handle('tool:open-terminal', async () => {
  const workspaceDir = getWorkspaceDir();
  console.log(`[Tool] Opening terminal with OpenHands CLI at: ${workspaceDir}`);

  try {
    if (process.platform === 'darwin') {
      // macOS - Use osascript to open Terminal.app, cd to directory, and run openhands
      const script = `
        tell application "Terminal"
          activate
          do script "cd '${workspaceDir.replace(/'/g, "\\'")}' && openhands"
        end tell
      `;
      execSync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`);
    } else if (process.platform === 'win32') {
      // Windows - Open Windows Terminal or cmd and run openhands
      spawn('cmd.exe', ['/c', 'start', 'cmd', '/k', `cd /d "${workspaceDir}" && openhands`], { shell: true });
    } else {
      // Linux - Try common terminal emulators
      const terminals = ['gnome-terminal', 'konsole', 'xterm', 'x-terminal-emulator'];
      for (const term of terminals) {
        try {
          if (term === 'gnome-terminal') {
            spawn(term, ['--working-directory', workspaceDir, '--', 'bash', '-c', 'openhands; exec bash'], { detached: true });
          } else {
            spawn(term, ['--working-directory', workspaceDir, '-e', 'openhands'], { detached: true });
          }
          break;
        } catch {
          continue;
        }
      }
    }
    return { success: true };
  } catch (error) {
    console.error('[Tool] Failed to open terminal:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Tool: Open VS Code terminal in project directory with OpenHands CLI.
 * Opens VS Code at workspace and runs openhands in integrated terminal.
 */
ipcMain.handle('tool:open-terminal-vscode', async () => {
  const workspaceDir = getWorkspaceDir();
  console.log(`[Tool] Opening VS Code terminal with OpenHands CLI at: ${workspaceDir}`);

  try {
    if (process.platform === 'darwin') {
      // macOS - Open VS Code, then use Cmd+Shift+N for new window, then open folder
      // Note: key code 50 is backtick on US keyboard layout
      const escapedDir = workspaceDir.replace(/'/g, "'\\''");
      const script = `
-- First open VS Code
do shell script "open -a 'Visual Studio Code'"

tell application "System Events"
  -- Wait for VS Code to be frontmost
  repeat 50 times
    if (name of first application process whose frontmost is true) is "Code" then exit repeat
    delay 0.1
  end repeat
  
  -- Cmd+Shift+N to create new window
  keystroke "n" using {command down, shift down}
  delay 0.5
  
  -- Open folder with Cmd+O
  keystroke "o" using command down
  delay 0.3
  
  -- Type the path and press Enter
  keystroke "g" using {command down, shift down}
  delay 0.2
  keystroke "${escapedDir}"
  keystroke return
  delay 0.3
  keystroke return
  delay 0.5
  
  -- Open terminal with Ctrl+\`
  key code 50 using control down
  delay 0.3
  keystroke "openhands"
  keystroke return
end tell
`;
      const result = spawnSync('osascript', [], { input: script, encoding: 'utf-8' });
      if (result.error) {
        throw result.error;
      }
      if (result.status !== 0) {
        throw new Error(result.stderr || 'AppleScript failed');
      }
    } else if (process.platform === 'win32') {
      // Windows - Try to find VS Code in common locations
      const vscodePaths = [
        process.env.LOCALAPPDATA + '\\Programs\\Microsoft VS Code\\Code.exe',
        'C:\\Program Files\\Microsoft VS Code\\Code.exe',
      ];
      for (const codePath of vscodePaths) {
        try {
          spawn(codePath, [workspaceDir], { detached: true });
          break;
        } catch {
          continue;
        }
      }
    } else {
      // Linux - Open VS Code
      spawn('code', [workspaceDir], { detached: true, env: { ...process.env, PATH: process.env.PATH + ':/usr/bin:/usr/local/bin' } });
    }
    return { success: true };
  } catch (error) {
    console.error('[Tool] Failed to open VS Code terminal:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Tool: Open GitHub Desktop to show diff.
 * Opens GitHub Desktop application at the repository path.
 */
ipcMain.handle('tool:open-github-desktop', async () => {
  const workspaceDir = getWorkspaceDir();
  console.log(`[Tool] Opening GitHub Desktop at: ${workspaceDir}`);

  try {
    if (process.platform === 'darwin') {
      // macOS - Open GitHub Desktop with the repo path
      // GitHub Desktop CLI: github /path/to/repo
      try {
        execSync(`open -a "GitHub Desktop" "${workspaceDir}"`);
      } catch {
        // Fallback: try the github CLI command
        execSync(`github "${workspaceDir}"`);
      }
    } else if (process.platform === 'win32') {
      // Windows - Open GitHub Desktop via command
      spawn('cmd', ['/c', 'github', workspaceDir], { shell: true });
    } else {
      // Linux - GitHub Desktop is available as a third-party app
      spawn('github-desktop', [workspaceDir], { detached: true });
    }
    return { success: true };
  } catch (error) {
    console.error('[Tool] Failed to open GitHub Desktop:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Tool: Run app and open in browser.
 * Starts the dev server and opens Chrome/default browser to localhost.
 */
ipcMain.handle('tool:run-app-browser', async () => {
  const workspaceDir = getWorkspaceDir();
  const port = process.env.DEV_SERVER_PORT || 5173; // Default Vite port
  const url = `http://localhost:${port}`;

  console.log(`[Tool] Starting dev server at: ${workspaceDir}`);
  console.log(`[Tool] Will open browser to: ${url}`);

  try {
    // Start the dev server
    const devServer = spawn('npm', ['run', 'dev'], {
      cwd: workspaceDir,
      shell: true,
      detached: true,
      stdio: 'ignore', // Don't pipe stdio to avoid blocking
    });

    // Unref so the parent process can exit independently
    devServer.unref();

    // Wait a bit for the server to start
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Open browser
    if (process.platform === 'darwin') {
      // macOS - Try Chrome first, fall back to default
      try {
        spawn('open', ['-a', 'Google Chrome', url]);
      } catch {
        shell.openExternal(url);
      }
    } else if (process.platform === 'win32') {
      // Windows - Try Chrome first
      try {
        spawn('cmd', ['/c', 'start', 'chrome', url], { shell: true });
      } catch {
        shell.openExternal(url);
      }
    } else {
      // Linux
      shell.openExternal(url);
    }

    return { success: true, url, pid: devServer.pid };
  } catch (error) {
    console.error('[Tool] Failed to run app in browser:', error);
    return { success: false, error: error.message };
  }
});

// App lifecycle
app.whenReady().then(async () => {
  // Show splash screen
  createSplashWindow();

  // Start backend
  const backendStarted = await startPythonBackend();
  
  if (!backendStarted) {
    dialog.showErrorBox(
      'Backend Error',
      'Failed to start the backend server.\n\nPlease check that all dependencies are installed.'
    );
    app.quit();
    return;
  }

  // Create main window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopPythonBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopPythonBackend();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  stopPythonBackend();
});
