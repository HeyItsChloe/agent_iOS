/**
 * Type definitions for Electron IPC bridge.
 */

export interface ElectronAPI {
  /** Get the backend API URL */
  getBackendUrl: () => Promise<string>;
  
  /** Get the WebSocket URL */
  getWebSocketUrl: () => Promise<string>;
  
  /** Current platform */
  platform: NodeJS.Platform;
  
  /** Minimize the window */
  minimizeWindow: () => void;
  
  /** Maximize the window */
  maximizeWindow: () => void;
  
  /** Close the window */
  closeWindow: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
