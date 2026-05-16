/**
 * Hook for executing tool actions from the dropdown menu.
 * Handles both Electron-native actions and agent-prompt-based actions.
 */

import { useCallback } from 'react';
import { ToolActionId, TOOL_ACTIONS } from '../types/tool-actions';
import { settingsApi } from '../api/client';

interface UseToolActionsOptions {
  /** Callback to send a message to the agent */
  onSendMessage?: (content: string) => void;
  /** Current conversation ID */
  conversationId?: string;
}

interface ToolActionResult {
  success: boolean;
  error?: string;
}

export function useToolActions(options: UseToolActionsOptions = {}) {
  const { onSendMessage, conversationId } = options;

  /**
   * Check if running in Electron environment.
   */
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

  /**
   * Execute a tool action by ID.
   */
  const executeToolAction = useCallback(
    async (actionId: ToolActionId): Promise<ToolActionResult> => {
      const action = TOOL_ACTIONS.find((a) => a.id === actionId);
      if (!action) {
        return { success: false, error: `Unknown action: ${actionId}` };
      }

      try {
        switch (actionId) {
          case 'open-vscode':
            // Connect to VS Code workspace via GitLive (no new window needed)
            try {
              const response = await fetch('/api/vscode/status');
              if (!response.ok) {
                throw new Error('Failed to get VS Code status');
              }
              
              const status = await response.json();
              
              // Local mode: GitLive syncs automatically, just confirm connection
              if (status.is_local_mode) {
                // GitLive handles sync - nothing to open
                // Could show a toast/notification here
                console.log('[VS Code] GitLive sync active for:', status.workspace);
                return { success: true };
              }
              
              // Container mode: may need to open code-server for GitLive auth
              if (status.url) {
                window.open(status.url, '_blank');
              }
              
              return { success: true };
            } catch (error) {
              return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to connect VS Code' 
              };
            }

          case 'open-terminal':
            if (isElectron && window.electronAPI?.openTerminal) {
              await window.electronAPI.openTerminal();
              return { success: true };
            }
            return { success: false, error: 'Terminal action requires Electron' };

          case 'show-github-diff':
            if (isElectron && window.electronAPI?.openGitHubDesktop) {
              await window.electronAPI.openGitHubDesktop();
              return { success: true };
            }
            return { success: false, error: 'GitHub Desktop action requires Electron' };

          case 'show-task-list':
            // This action works via agent prompt
            if (action.agentPrompt && onSendMessage) {
              onSendMessage(action.agentPrompt);
              return { success: true };
            }
            return { success: false, error: 'No message handler available' };

          case 'run-app-browser':
            if (isElectron && window.electronAPI?.runAppInBrowser) {
              await window.electronAPI.runAppInBrowser();
              return { success: true };
            }
            return { success: false, error: 'Browser action requires Electron' };

          default:
            return { success: false, error: `Unhandled action: ${actionId}` };
        }
      } catch (error) {
        console.error(`Tool action "${actionId}" failed:`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [isElectron, onSendMessage, conversationId]
  );

  return {
    executeToolAction,
    isElectron,
  };
}
