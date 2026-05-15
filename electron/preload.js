const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose Electron APIs to the renderer process securely.
 * All methods use contextBridge for security (context isolation).
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Backend URLs
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
  getWebSocketUrl: () => ipcRenderer.invoke('get-websocket-url'),
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // Platform info (sync)
  platform: process.platform,
  isElectron: true,
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux',
  
  // Dialogs
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  
  // Window controls (for custom titlebar if needed)
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  
  // Event listeners (return cleanup function)
  onThemeChanged: (callback) => {
    const listener = (event, theme) => callback(theme);
    ipcRenderer.on('theme-changed', listener);
    return () => ipcRenderer.removeListener('theme-changed', listener);
  },
  
  onMenuNewConversation: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('menu-new-conversation', listener);
    return () => ipcRenderer.removeListener('menu-new-conversation', listener);
  },

  // Settings/Preferences menu trigger
  onMenuOpenSettings: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('menu-open-settings', listener);
    return () => ipcRenderer.removeListener('menu-open-settings', listener);
  },

  // Contacts menu triggers
  onMenuShowContacts: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('menu-show-contacts', listener);
    return () => ipcRenderer.removeListener('menu-show-contacts', listener);
  },

  onMenuNewAgent: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('menu-new-agent', listener);
    return () => ipcRenderer.removeListener('menu-new-agent', listener);
  },
});

// Type definitions for TypeScript are in src/types/electron.d.ts
