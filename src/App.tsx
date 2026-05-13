import { useEffect } from 'react';
import { useSettingsStore } from '@/stores';

/**
 * Main application component.
 * 
 * This is a placeholder that will be replaced with the full UI in Phase 4+.
 * For now, it just sets up the theme and shows a loading state.
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
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  return (
    <div className="h-screen flex flex-col bg-ios-gray-100 dark:bg-ios-gray-950">
      {/* Titlebar area for macOS */}
      <div className="h-8 titlebar-drag bg-ios-gray-50 dark:bg-ios-gray-900 border-b border-ios-gray-200 dark:border-ios-gray-800" />
      
      {/* Main content */}
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Agent iOS
          </h1>
          <p className="text-ios-gray-600 dark:text-ios-gray-400 mb-6">
            iOS-style messaging GUI for OpenHands SDK agents
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-ios-gray-500">
            <div className="w-2 h-2 bg-ios-green rounded-full animate-pulse" />
            <span>Phase 1-2 Complete • UI Components Coming in Phase 4+</span>
          </div>
          
          {/* Quick info cards */}
          <div className="mt-8 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="card-ios p-4">
              <div className="text-2xl mb-2">🤖</div>
              <div className="font-medium">8 Agents</div>
              <div className="text-xs text-ios-gray-500">Built-in</div>
            </div>
            <div className="card-ios p-4">
              <div className="text-2xl mb-2">⚡</div>
              <div className="font-medium">7 Skills</div>
              <div className="text-xs text-ios-gray-500">Built-in</div>
            </div>
            <div className="card-ios p-4">
              <div className="text-2xl mb-2">🔧</div>
              <div className="font-medium">6 Tools</div>
              <div className="text-xs text-ios-gray-500">Available</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
