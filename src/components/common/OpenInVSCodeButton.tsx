/**
 * Open in VS Code Button Component
 * 
 * Provides a button that opens the agent workspace in the user's VS Code.
 * Supports multiple connection methods:
 * - vscode:// URI (direct local VS Code)
 * - Tunnel URL (Remote - Tunnels)
 * - Browser URL (code-server)
 */

import React, { useState, useEffect } from 'react';

interface VSCodeStatus {
  running: boolean;
  port: number;
  url: string | null;
  workspace: string;
  gitlive_installed: boolean;
  tunnel_url: string | null;
  vscode_uri: string | null;
}

interface ConnectionInfo {
  method: 'browser' | 'tunnel' | 'vscode-uri';
  url: string;
  instructions: string;
}

interface OpenInVSCodeButtonProps {
  className?: string;
  variant?: 'default' | 'compact' | 'icon-only';
}

export const OpenInVSCodeButton: React.FC<OpenInVSCodeButtonProps> = ({
  className = '',
  variant = 'default',
}) => {
  const [status, setStatus] = useState<VSCodeStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // Fetch VS Code server status on mount
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/vscode/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch VS Code status:', err);
    }
  };

  const handleClick = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get connection info
      const response = await fetch('/api/vscode/connect');
      if (!response.ok) {
        throw new Error('Failed to get connection info');
      }

      const connectionInfo: ConnectionInfo = await response.json();

      // Handle different connection methods
      switch (connectionInfo.method) {
        case 'vscode-uri':
          // Open directly in local VS Code
          window.location.href = connectionInfo.url;
          break;

        case 'tunnel':
        case 'browser':
          // Open in new tab
          window.open(connectionInfo.url, '_blank');
          break;
      }

      // Refresh status after connection
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  // VS Code icon SVG
  const VSCodeIcon = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="inline-block"
    >
      <path d="M17.583 2.292L9.625 9.417 4.292 5.25l-.875.542v12.417l.875.541 5.333-4.166 7.958 7.125.834.041V2.25l-.834.042zM9.208 12.001l-3.791 2.958V8.042l3.791 3.959z" />
    </svg>
  );

  // Render based on variant
  if (variant === 'icon-only') {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className={`p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 
          disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        title="Open in VS Code"
      >
        {loading ? (
          <span className="animate-spin">⟳</span>
        ) : (
          <VSCodeIcon />
        )}
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className={`flex items-center gap-1 px-2 py-1 text-sm rounded-md 
          bg-blue-600 text-white hover:bg-blue-700 
          disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <VSCodeIcon />
        {loading ? 'Connecting...' : 'VS Code'}
      </button>
    );
  }

  // Default variant
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleClick}
        disabled={loading}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium
          bg-[#007ACC] text-white hover:bg-[#005A9E] 
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors shadow-sm`}
      >
        <VSCodeIcon />
        {loading ? 'Connecting...' : 'Open in VS Code'}
        {status?.gitlive_installed && (
          <span className="ml-1 px-1.5 py-0.5 text-xs bg-green-500 rounded">
            GitLive
          </span>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && status && (
        <div className="absolute bottom-full left-0 mb-2 p-3 bg-gray-900 text-white 
          text-sm rounded-lg shadow-lg min-w-[250px] z-50">
          <div className="font-medium mb-2">VS Code Integration</div>
          <div className="space-y-1 text-gray-300">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${status.running ? 'bg-green-400' : 'bg-red-400'}`} />
              Server: {status.running ? 'Running' : 'Stopped'}
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${status.gitlive_installed ? 'bg-green-400' : 'bg-yellow-400'}`} />
              GitLive: {status.gitlive_installed ? 'Installed' : 'Not installed'}
            </div>
            <div className="text-xs text-gray-400 mt-2">
              {status.gitlive_installed 
                ? '✓ Changes sync to your local VS Code automatically'
                : 'Install GitLive for real-time sync'}
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute -bottom-1 left-4 w-2 h-2 bg-gray-900 rotate-45" />
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute top-full left-0 mt-2 p-2 bg-red-100 text-red-700 
          text-sm rounded shadow-md">
          {error}
        </div>
      )}
    </div>
  );
};

export default OpenInVSCodeButton;
