const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Get backend URLs
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
  getWebSocketUrl: () => ipcRenderer.invoke('get-websocket-url'),
  
  // Platform info
  platform: process.platform,
  
  // Window controls (for custom titlebar if needed)
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
});

// Type definitions for TypeScript
// These are just for documentation, the actual types are in src/types/electron.d.ts
