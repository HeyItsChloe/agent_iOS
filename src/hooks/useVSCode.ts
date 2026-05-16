/**
 * VS Code Integration Hook
 * 
 * Provides state and actions for VS Code server integration.
 * Handles automatic server startup and connection management.
 */

import { useState, useEffect, useCallback } from 'react';

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

interface GitLiveSetup {
  agent_side: {
    gitlive_installed: boolean;
    steps: string[];
  };
  user_side: {
    steps: string[];
  };
  benefits: string[];
}

interface UseVSCodeReturn {
  status: VSCodeStatus | null;
  loading: boolean;
  error: string | null;
  startServer: () => Promise<void>;
  stopServer: () => Promise<void>;
  connect: () => Promise<ConnectionInfo | null>;
  getGitLiveSetup: () => Promise<GitLiveSetup | null>;
  refresh: () => Promise<void>;
}

const API_BASE = '/api/vscode';

export function useVSCode(): UseVSCodeReturn {
  const [status, setStatus] = useState<VSCodeStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch status on mount
  useEffect(() => {
    refresh();
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/status`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to fetch VS Code status:', err);
    }
  }, []);

  const startServer = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/start`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to start VS Code server');
      }

      const data = await response.json();
      setStatus(data.status);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const stopServer = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/stop`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to stop VS Code server');
      }

      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const connect = useCallback(async (): Promise<ConnectionInfo | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/connect`);

      if (!response.ok) {
        throw new Error('Failed to get connection info');
      }

      const connectionInfo: ConnectionInfo = await response.json();
      return connectionInfo;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getGitLiveSetup = useCallback(async (): Promise<GitLiveSetup | null> => {
    try {
      const response = await fetch(`${API_BASE}/gitlive/setup`);

      if (!response.ok) {
        throw new Error('Failed to get GitLive setup instructions');
      }

      return await response.json();
    } catch (err) {
      console.error('Failed to get GitLive setup:', err);
      return null;
    }
  }, []);

  return {
    status,
    loading,
    error,
    startServer,
    stopServer,
    connect,
    getGitLiveSetup,
    refresh,
  };
}

export default useVSCode;
