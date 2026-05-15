/**
 * Hook for executing tool actions from the dropdown menu.
 * Handles both Electron-native actions and agent-prompt-based actions.
 */

import { useCallback } from 'react';
import { ToolActionId, TOOL_ACTIONS } from '../types/tool-actions';

interface UseToolActionsOptions {
  /** Callback to send a message to the agent */
  onSendMessage?: (content: string) => void;
}

interface ToolActionResult {
  success: boolean;
  error?: string;
}

export function useToolActions(options: UseToolActionsOptions = {}) {
  const { onSendMessage } = options;

  /**
   * Check if running in Electron environment.
   */
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
  
  // DEBUG LOG
  console.log('[useToolActions] window.electronAPI:', typeof window !== 'undefined' ? window.electronAPI : 'undefined');
  console.log('[useToolActions] isElectron:', isElectron);

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
          case 'open-terminal':
            if (isElectron && window.electronAPI?.openTerminal) {
              await window.electronAPI.openTerminal();
              return { success: true };
            }
            return { success: false, error: 'Terminal action requires Electron' };

          case 'open-terminal-vscode':
            if (isElectron && window.electronAPI?.openTerminalVSCode) {
              await window.electronAPI.openTerminalVSCode();
              return { success: true };
            }
            return { success: false, error: 'VS Code action requires Electron' };

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
    [isElectron, onSendMessage]
  );

  return {
    executeToolAction,
    isElectron,
  };
}
