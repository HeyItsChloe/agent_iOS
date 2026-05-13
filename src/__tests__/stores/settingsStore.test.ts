import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../../stores/settingsStore';

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.getState().reset();
  });

  describe('theme', () => {
    it('has default theme of "system"', () => {
      const { theme } = useSettingsStore.getState();
      expect(theme).toBe('system');
    });

    it('can set theme to "light"', () => {
      const { setTheme } = useSettingsStore.getState();
      setTheme('light');
      expect(useSettingsStore.getState().theme).toBe('light');
    });

    it('can set theme to "dark"', () => {
      const { setTheme } = useSettingsStore.getState();
      setTheme('dark');
      expect(useSettingsStore.getState().theme).toBe('dark');
    });

    it('can set theme to "system"', () => {
      const { setTheme } = useSettingsStore.getState();
      setTheme('dark');
      setTheme('system');
      expect(useSettingsStore.getState().theme).toBe('system');
    });
  });

  describe('backend URLs', () => {
    it('has default backend URL', () => {
      const { backendUrl } = useSettingsStore.getState();
      expect(backendUrl).toBe('http://127.0.0.1:8765');
    });

    it('has default WebSocket URL', () => {
      const { websocketUrl } = useSettingsStore.getState();
      expect(websocketUrl).toBe('ws://127.0.0.1:8765');
    });

    it('can update backend URL', () => {
      const { setBackendUrl } = useSettingsStore.getState();
      setBackendUrl('http://example.com:8000');
      expect(useSettingsStore.getState().backendUrl).toBe('http://example.com:8000');
    });

    it('can update WebSocket URL', () => {
      const { setWebSocketUrl } = useSettingsStore.getState();
      setWebSocketUrl('wss://example.com:8000');
      expect(useSettingsStore.getState().websocketUrl).toBe('wss://example.com:8000');
    });
  });

  describe('connection state', () => {
    it('starts disconnected', () => {
      const { isConnected } = useSettingsStore.getState();
      expect(isConnected).toBe(false);
    });

    it('can set connected state', () => {
      const { setConnected } = useSettingsStore.getState();
      setConnected(true);
      expect(useSettingsStore.getState().isConnected).toBe(true);
    });
  });

  describe('notification settings', () => {
    it('has sound enabled by default', () => {
      const { soundEnabled } = useSettingsStore.getState();
      expect(soundEnabled).toBe(true);
    });

    it('can toggle sound', () => {
      const { setSoundEnabled } = useSettingsStore.getState();
      setSoundEnabled(false);
      expect(useSettingsStore.getState().soundEnabled).toBe(false);
    });

    it('has notifications enabled by default', () => {
      const { notificationsEnabled } = useSettingsStore.getState();
      expect(notificationsEnabled).toBe(true);
    });

    it('can toggle notifications', () => {
      const { setNotificationsEnabled } = useSettingsStore.getState();
      setNotificationsEnabled(false);
      expect(useSettingsStore.getState().notificationsEnabled).toBe(false);
    });
  });

  describe('display settings', () => {
    it('shows timestamps by default', () => {
      const { showTimestamps } = useSettingsStore.getState();
      expect(showTimestamps).toBe(true);
    });

    it('can toggle timestamps', () => {
      const { setShowTimestamps } = useSettingsStore.getState();
      setShowTimestamps(false);
      expect(useSettingsStore.getState().showTimestamps).toBe(false);
    });

    it('has compact mode disabled by default', () => {
      const { compactMode } = useSettingsStore.getState();
      expect(compactMode).toBe(false);
    });

    it('can toggle compact mode', () => {
      const { setCompactMode } = useSettingsStore.getState();
      setCompactMode(true);
      expect(useSettingsStore.getState().compactMode).toBe(true);
    });
  });

  describe('LLM settings', () => {
    it('has default LLM model', () => {
      const { llmModel } = useSettingsStore.getState();
      expect(llmModel).toBeTruthy();
    });

    it('can set LLM model', () => {
      const { setLLMModel } = useSettingsStore.getState();
      setLLMModel('gpt-4');
      expect(useSettingsStore.getState().llmModel).toBe('gpt-4');
    });

    it('has empty API key by default', () => {
      const { llmApiKey } = useSettingsStore.getState();
      expect(llmApiKey).toBe('');
    });

    it('can set API key', () => {
      const { setLLMApiKey } = useSettingsStore.getState();
      setLLMApiKey('test-key');
      expect(useSettingsStore.getState().llmApiKey).toBe('test-key');
    });
  });

  describe('reset', () => {
    it('resets to default values', () => {
      const { setTheme, setBackendUrl, setConnected, reset } = useSettingsStore.getState();
      
      setTheme('dark');
      setBackendUrl('http://custom.com');
      setConnected(true);
      
      reset();
      
      const state = useSettingsStore.getState();
      expect(state.theme).toBe('system');
      expect(state.backendUrl).toBe('http://127.0.0.1:8765');
      expect(state.isConnected).toBe(false);
    });
  });
});
