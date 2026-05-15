/**
 * Tool action definitions for the iOS-style "+" dropdown menu.
 * These actions map to agent tools and can be triggered via button or prompt.
 */

export type ToolActionId =
  | 'open-terminal'
  | 'open-vscode'
  | 'show-github-diff'
  | 'show-task-list'
  | 'run-app-browser';

export interface ToolAction {
  /** Unique identifier for the action */
  id: ToolActionId;
  /** Maps to agent tool_ids (e.g., 'terminal', 'file_editor') */
  toolId: string;
  /** Display label in the dropdown */
  label: string;
  /** Emoji icon */
  icon: string;
  /** Short description shown below label */
  description: string;
  /** If true, action only works in Electron (not web browser) */
  electronOnly?: boolean;
  /** Optional prompt to send if action is handled via agent */
  agentPrompt?: string;
}

/**
 * All available tool actions.
 * Actions are shown in the dropdown if their toolId is enabled for the conversation's agent.
 */
export const TOOL_ACTIONS: ToolAction[] = [
  {
    id: 'open-vscode',
    toolId: '_always', // Special: always available
    label: 'Open in VS Code',
    icon: '💻',
    description: 'Open workspace in new VS Code window',
    electronOnly: false,
  },
  {
    id: 'open-terminal',
    toolId: 'terminal',
    label: 'Open Terminal',
    icon: '🖥️',
    description: 'Open OpenHands CLI in Terminal.app',
    electronOnly: true,
  },
  {
    id: 'show-github-diff',
    toolId: 'file_editor',
    label: 'Show Diff in GitHub Desktop',
    icon: '📄',
    description: 'View changes vs main branch',
    electronOnly: true,
  },
  {
    id: 'show-task-list',
    toolId: 'task_tracker',
    label: 'Show Task List',
    icon: '📋',
    description: 'Display current tasks',
    electronOnly: false,
    agentPrompt: 'Show me the current task list',
  },
  {
    id: 'run-app-browser',
    toolId: 'browser',
    label: 'Run App in Browser',
    icon: '▶️',
    description: 'Start dev server and open Chrome',
    electronOnly: true,
  },
];

/**
 * Get tool actions filtered by enabled tools and platform.
 */
export function getAvailableToolActions(
  enabledToolIds: string[],
  isElectron: boolean
): ToolAction[] {
  return TOOL_ACTIONS.filter((action) => {
    // Special '_always' toolId means always show this action
    const toolEnabled = action.toolId === '_always' || enabledToolIds.includes(action.toolId);
    const platformSupported = !action.electronOnly || isElectron;
    return toolEnabled && platformSupported;
  });
}
