/**
 * Agent data types.
 */

/** Tool behavioral annotations (MCP spec) */
export interface ToolAnnotations {
  readOnly: boolean;
  destructive: boolean;
  idempotent: boolean;
  openWorld: boolean;
}

/** Definition of an available tool */
export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  annotations: ToolAnnotations;
}

/** Type of agent */
export type AgentType = 'builtin' | 'custom';

/** An AI agent definition */
export interface Agent {
  id: string;
  name: string;
  description: string;
  avatar: string | null;
  color: string;
  type: AgentType;
  systemPrompt: string;
  toolIds: string[];
  skillIds: string[];
  isBuiltin: boolean;
}

/** Request to create a new agent */
export interface AgentCreate {
  name: string;
  description: string;
  avatar?: string;
  color?: string;
  systemPrompt?: string;
  toolIds?: string[];
  skillIds?: string[];
}

/** Request to update an agent */
export interface AgentUpdate {
  name?: string;
  description?: string;
  avatar?: string;
  color?: string;
  systemPrompt?: string;
  toolIds?: string[];
  skillIds?: string[];
}

/** Agent from API (snake_case) */
export interface AgentFromAPI {
  id: string;
  name: string;
  description: string;
  avatar: string | null;
  color: string;
  type: AgentType;
  system_prompt: string;
  tool_ids: string[];
  skill_ids: string[];
  is_builtin: boolean;
}

/** Tool from API */
export interface ToolFromAPI {
  id: string;
  name: string;
  description: string;
  icon: string;
  annotations: {
    read_only: boolean;
    destructive: boolean;
    idempotent: boolean;
    open_world: boolean;
  };
}

/** Convert API agent to frontend agent */
export function parseAgent(api: AgentFromAPI): Agent {
  return {
    id: api.id,
    name: api.name,
    description: api.description,
    avatar: api.avatar,
    color: api.color,
    type: api.type,
    systemPrompt: api.system_prompt,
    toolIds: api.tool_ids,
    skillIds: api.skill_ids,
    isBuiltin: api.is_builtin,
  };
}

/** Convert API tool to frontend tool */
export function parseTool(api: ToolFromAPI): Tool {
  return {
    id: api.id,
    name: api.name,
    description: api.description,
    icon: api.icon,
    annotations: {
      readOnly: api.annotations.read_only,
      destructive: api.annotations.destructive,
      idempotent: api.annotations.idempotent,
      openWorld: api.annotations.open_world,
    },
  };
}

/** Built-in tool definitions for reference */
export const BUILTIN_TOOLS: Tool[] = [
  {
    id: 'terminal',
    name: 'Terminal',
    description: 'Execute shell commands (bash, npm, git, python, etc.)',
    icon: '🖥️',
    annotations: { readOnly: false, destructive: true, idempotent: false, openWorld: true },
  },
  {
    id: 'file_editor',
    name: 'File Editor',
    description: 'View, create, edit files with str_replace, insert, undo',
    icon: '📄',
    annotations: { readOnly: false, destructive: true, idempotent: false, openWorld: false },
  },
  {
    id: 'task_tracker',
    name: 'Task Tracker',
    description: 'Plan and track tasks with todo/in_progress/done states',
    icon: '📋',
    annotations: { readOnly: false, destructive: false, idempotent: true, openWorld: false },
  },
  {
    id: 'browser',
    name: 'Web Browser',
    description: 'Navigate, click, type, scroll on web pages',
    icon: '🌐',
    annotations: { readOnly: false, destructive: false, idempotent: false, openWorld: true },
  },
  {
    id: 'delegate',
    name: 'Delegate (Sub-Agents)',
    description: 'Spawn and delegate tasks to sub-agents',
    icon: '🎭',
    annotations: { readOnly: false, destructive: false, idempotent: true, openWorld: false },
  },
  {
    id: 'task',
    name: 'Task (Sync Agents)',
    description: 'Synchronous sub-agent task delegation',
    icon: '⚙️',
    annotations: { readOnly: false, destructive: false, idempotent: true, openWorld: false },
  },
];
