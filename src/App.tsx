import { useEffect } from 'react';
import { useSettingsStore } from './stores/settingsStore';
import { MainLayout } from './components/layout';
import { useInitialData } from './hooks';
import { LoadingSpinner } from './components/common/LoadingSpinner';

/**
 * Main application component.
 * 
 * Sets up theme handling, loads initial data, and renders the main layout.
 */
function App() {
  const theme = useSettingsStore((state) => state.theme);
  const setBackendUrl = useSettingsStore((state) => state.setBackendUrl);
  const setWebSocketUrl = useSettingsStore((state) => state.setWebSocketUrl);

  // Load initial data (agents, skills, etc.)
  const { isLoading, error } = useInitialData();

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

  // Show loading state while fetching initial data
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-ios-background">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-ios-text-secondary">Loading agents...</p>
        </div>
      </div>
    );
  }

  // Show error state if loading failed
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-ios-background">
        <div className="flex flex-col items-center gap-4 text-center p-8">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-3xl">
            ⚠️
          </div>
          <h2 className="text-xl font-semibold text-ios-text">Connection Error</h2>
          <p className="text-ios-text-secondary max-w-md">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-ios-blue text-white rounded-full font-medium hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <MainLayout />;
}

export default App;
