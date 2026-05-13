import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../../stores/settingsStore';

describe('settingsStore', () => {
  beforeEach(() => {
    // Reset store to default state
    useSettingsStore.setState({
      theme: 'system',
      sidebarCollapsed: false,
      messageGrouping: true,
      backendUrl: 'http://localhost:8765',
      webSocketUrl: 'ws://localhost:8765',
    });
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

  describe('sidebarCollapsed', () => {
    it('starts with sidebar not collapsed', () => {
      const { sidebarCollapsed } = useSettingsStore.getState();
      expect(sidebarCollapsed).toBe(false);
    });

    it('can collapse sidebar', () => {
      const { setSidebarCollapsed } = useSettingsStore.getState();
      setSidebarCollapsed(true);
      
      expect(useSettingsStore.getState().sidebarCollapsed).toBe(true);
    });

    it('can expand sidebar', () => {
      const { setSidebarCollapsed } = useSettingsStore.getState();
      setSidebarCollapsed(true);
      setSidebarCollapsed(false);
      
      expect(useSettingsStore.getState().sidebarCollapsed).toBe(false);
    });
  });

  describe('messageGrouping', () => {
    it('starts with message grouping enabled', () => {
      const { messageGrouping } = useSettingsStore.getState();
      expect(messageGrouping).toBe(true);
    });

    it('can disable message grouping', () => {
      const { setMessageGrouping } = useSettingsStore.getState();
      setMessageGrouping(false);
      
      expect(useSettingsStore.getState().messageGrouping).toBe(false);
    });

    it('can enable message grouping', () => {
      const { setMessageGrouping } = useSettingsStore.getState();
      setMessageGrouping(false);
      setMessageGrouping(true);
      
      expect(useSettingsStore.getState().messageGrouping).toBe(true);
    });
  });

  describe('backend URLs', () => {
    it('has default backend URL', () => {
      const { backendUrl } = useSettingsStore.getState();
      expect(backendUrl).toBe('http://localhost:8765');
    });

    it('has default WebSocket URL', () => {
      const { webSocketUrl } = useSettingsStore.getState();
      expect(webSocketUrl).toBe('ws://localhost:8765');
    });

    it('can update backend URL', () => {
      const { setBackendUrl } = useSettingsStore.getState();
      setBackendUrl('http://example.com:8000');
      
      expect(useSettingsStore.getState().backendUrl).toBe('http://example.com:8000');
    });

    it('can update WebSocket URL', () => {
      const { setWebSocketUrl } = useSettingsStore.getState();
      setWebSocketUrl('wss://example.com:8000');
      
      expect(useSettingsStore.getState().webSocketUrl).toBe('wss://example.com:8000');
    });
  });
});
