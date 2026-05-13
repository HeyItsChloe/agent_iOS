import { useEffect } from 'react';
import { useSettingsStore } from './stores/settingsStore';
import { MainLayout } from './components/layout';

/**
 * Main application component.
 * 
 * Sets up theme handling and renders the main layout.
 */
function App() {
  const theme = useSettingsStore((state) => state.theme);
  const setBackendUrl = useSettingsStore((state) => state.setBackendUrl);
  const setWebSocketUrl = useSettingsStore((state) => state.setWebSocketUrl);

  // Initialize Electron API URLs
  useEffect(() => {
    const initializeUrls = async () => {
      if (window.electronAPI) {
        try {
          const backendUrl = await window.electronAPI.getBackendUrl();
          const websocketUrl = await window.electronAPI.getWebSocketUrl();
          setBackendUrl(backendUrl);
          setWebSocketUrl(websocketUrl);
        } catch (error) {
          console.error('Failed to get backend URLs:', error);
        }
      }
    };

    initializeUrls();
  }, [setBackendUrl, setWebSocketUrl]);

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', isDark);
      
      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        root.classList.toggle('dark', e.matches);
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  return <MainLayout />;
}

export default App;
