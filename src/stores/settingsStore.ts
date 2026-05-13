/**
 * Zustand store for application settings.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  // Backend connection
  backendUrl: string;
  websocketUrl: string;
  isConnected: boolean;
  
  // Theme
  theme: 'light' | 'dark' | 'system';
  
  // Notifications
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  
  // Display
  showTimestamps: boolean;
  compactMode: boolean;
  
  // LLM Settings (for SDK)
  llmModel: string;
  llmApiKey: string;
  
  // Actions
  setBackendUrl: (url: string) => void;
  setWebSocketUrl: (url: string) => void;
  setConnected: (connected: boolean) => void;
  
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  
  setSoundEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  
  setShowTimestamps: (show: boolean) => void;
  setCompactMode: (compact: boolean) => void;
  
  setLLMModel: (model: string) => void;
  setLLMApiKey: (key: string) => void;
  
  // Reset
  reset: () => void;
}

const DEFAULT_BACKEND_URL = 'http://127.0.0.1:8765';
const DEFAULT_WEBSOCKET_URL = 'ws://127.0.0.1:8765';

const initialState = {
  backendUrl: DEFAULT_BACKEND_URL,
  websocketUrl: DEFAULT_WEBSOCKET_URL,
  isConnected: false,
  theme: 'system' as const,
  soundEnabled: true,
  notificationsEnabled: true,
  showTimestamps: true,
  compactMode: false,
  llmModel: 'anthropic/claude-sonnet-4-5-20250929',
  llmApiKey: '',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialState,
      
      setBackendUrl: (url) => set({ backendUrl: url }),
      setWebSocketUrl: (url) => set({ websocketUrl: url }),
      setConnected: (connected) => set({ isConnected: connected }),
      
      setTheme: (theme) => set({ theme }),
      
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      
      setShowTimestamps: (show) => set({ showTimestamps: show }),
      setCompactMode: (compact) => set({ compactMode: compact }),
      
      setLLMModel: (model) => set({ llmModel: model }),
      setLLMApiKey: (key) => set({ llmApiKey: key }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'agent-ios-settings',
      // Don't persist sensitive data
      partialize: (state) => ({
        theme: state.theme,
        soundEnabled: state.soundEnabled,
        notificationsEnabled: state.notificationsEnabled,
        showTimestamps: state.showTimestamps,
        compactMode: state.compactMode,
        llmModel: state.llmModel,
        // Note: llmApiKey is intentionally not persisted for security
      }),
    }
  )
);

// Selector hooks
export const useTheme = () => useSettingsStore(state => state.theme);
export const useIsConnected = () => useSettingsStore(state => state.isConnected);
export const useSoundEnabled = () => useSettingsStore(state => state.soundEnabled);
