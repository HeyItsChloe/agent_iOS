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
  
  /** Is running in Electron */
  isElectron: boolean;
  
  /** Is running on macOS */
  isMac: boolean;
  
  /** Is running on Windows */
  isWindows: boolean;
  
  /** Is running on Linux */
  isLinux: boolean;
  
  /** Minimize the window */
  minimizeWindow: () => void;
  
  /** Maximize the window */
  maximizeWindow: () => void;
  
  /** Close the window */
  closeWindow: () => void;
  
  /** Listen for theme changes */
  onThemeChanged: (callback: (theme: 'light' | 'dark') => void) => () => void;
  
  /** Listen for new conversation menu trigger */
  onMenuNewConversation: (callback: () => void) => () => void;
  
  /** Listen for settings/preferences menu trigger */
  onMenuOpenSettings: (callback: () => void) => () => void;
  
  /** Listen for show contacts menu trigger */
  onMenuShowContacts: (callback: () => void) => () => void;
  
  /** Listen for new agent menu trigger */
  onMenuNewAgent: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
