const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow = null;
let pythonProcess = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const PYTHON_BACKEND_PORT = 8765;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#F2F2F7',
    show: false,
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startPythonBackend() {
  const pythonPath = isDev
    ? path.join(__dirname, '../python-backend')
    : path.join(process.resourcesPath, 'python-backend');

  const pythonExecutable = process.platform === 'win32' ? 'python' : 'python3';

  pythonProcess = spawn(pythonExecutable, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', String(PYTHON_BACKEND_PORT)], {
    cwd: pythonPath,
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1',
    },
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Python Backend] ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Python Backend Error] ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`[Python Backend] Process exited with code ${code}`);
  });

  pythonProcess.on('error', (err) => {
    console.error('[Python Backend] Failed to start:', err);
  });
}

function stopPythonBackend() {
  if (pythonProcess) {
    pythonProcess.kill();
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

// App lifecycle
app.whenReady().then(() => {
  startPythonBackend();
  
  // Wait a bit for Python backend to start
  setTimeout(createWindow, 2000);

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
