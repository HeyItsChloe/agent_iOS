/**
 * Zustand store for agent state management.
 */

import { create } from 'zustand';
import type { Agent, Tool } from '@/types';

interface AgentState {
  // Data
  agents: Map<string, Agent>;
  tools: Map<string, Tool>;
  
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  setAgents: (agents: Agent[]) => void;
  setTools: (tools: Tool[]) => void;
  
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  deleteAgent: (id: string) => void;
  
  getAgent: (id: string) => Agent | undefined;
  getTool: (id: string) => Tool | undefined;
  
  // Computed getters
  getBuiltinAgents: () => Agent[];
  getCustomAgents: () => Agent[];
  getAllAgents: () => Agent[];
  getAllTools: () => Tool[];
  
  setLoading: (isLoading: boolean) => void;
  setCreating: (isCreating: boolean) => void;
  setError: (error: string | null) => void;
  
  // Reset
  reset: () => void;
}

const initialState = {
  agents: new Map<string, Agent>(),
  tools: new Map<string, Tool>(),
  isLoading: false,
  isCreating: false,
  error: null,
};

export const useAgentStore = create<AgentState>((set, get) => ({
  ...initialState,
  
  setAgents: (agents) => {
    const map = new Map<string, Agent>();
    agents.forEach(agent => map.set(agent.id, agent));
    set({ agents: map });
  },
  
  setTools: (tools) => {
    const map = new Map<string, Tool>();
    tools.forEach(tool => map.set(tool.id, tool));
    set({ tools: map });
  },
  
  addAgent: (agent) => {
    const agents = new Map(get().agents);
    agents.set(agent.id, agent);
    set({ agents });
  },
  
  updateAgent: (id, updates) => {
    const agents = new Map(get().agents);
    const existing = agents.get(id);
    if (existing && !existing.isBuiltin) {
      agents.set(id, { ...existing, ...updates });
      set({ agents });
    }
  },
  
  deleteAgent: (id) => {
    const agents = new Map(get().agents);
    const agent = agents.get(id);
    if (agent && !agent.isBuiltin) {
      agents.delete(id);
      set({ agents });
    }
  },
  
  getAgent: (id) => get().agents.get(id),
  
  getTool: (id) => get().tools.get(id),
  
  getBuiltinAgents: () => {
    return Array.from(get().agents.values()).filter(a => a.isBuiltin);
  },
  
  getCustomAgents: () => {
    return Array.from(get().agents.values()).filter(a => !a.isBuiltin);
  },
  
  getAllAgents: () => Array.from(get().agents.values()),
  
  getAllTools: () => Array.from(get().tools.values()),
  
  setLoading: (isLoading) => set({ isLoading }),
  setCreating: (isCreating) => set({ isCreating }),
  setError: (error) => set({ error }),
  
  reset: () => set(initialState),
}));

// Selector hooks
export const useAgent = (id: string) => {
  return useAgentStore(state => state.agents.get(id));
};

export const useTool = (id: string) => {
  return useAgentStore(state => state.tools.get(id));
};

export const useBuiltinAgents = () => {
  const agents = useAgentStore(state => state.agents);
  return Array.from(agents.values()).filter(a => a.isBuiltin);
};

export const useCustomAgents = () => {
  const agents = useAgentStore(state => state.agents);
  return Array.from(agents.values()).filter(a => !a.isBuiltin);
};

export const useAllTools = () => {
  const tools = useAgentStore(state => state.tools);
  return Array.from(tools.values());
};
