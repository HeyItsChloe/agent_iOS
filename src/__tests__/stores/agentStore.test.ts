import { describe, it, expect, beforeEach } from 'vitest';
import { useAgentStore } from '../../stores/agentStore';
import type { Agent, Tool } from '../../types';

// Helper to create a test agent
function createTestAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'agent-1',
    name: 'Test Agent',
    description: 'A test agent',
    avatar: '🤖',
    color: '#007AFF',
    type: 'custom',
    systemPrompt: 'You are a test agent.',
    toolIds: [],
    skillIds: [],
    isBuiltin: false,
    ...overrides,
  };
}

// Helper to create a test tool
function createTestTool(overrides: Partial<Tool> = {}): Tool {
  return {
    id: 'tool-1',
    name: 'Test Tool',
    description: 'A test tool',
    icon: '🔧',
    annotations: {
      readOnly: false,
      destructive: false,
      idempotent: true,
      openWorld: false,
    },
    ...overrides,
  };
}

describe('agentStore', () => {
  beforeEach(() => {
    useAgentStore.getState().reset();
  });

  describe('setAgents', () => {
    it('sets agents from array to map', () => {
      const { setAgents } = useAgentStore.getState();
      const agents = [
        createTestAgent({ id: 'agent-1', name: 'Agent 1' }),
        createTestAgent({ id: 'agent-2', name: 'Agent 2' }),
      ];

      setAgents(agents);

      const { agents: agentMap } = useAgentStore.getState();
      expect(agentMap.size).toBe(2);
      expect(agentMap.get('agent-1')?.name).toBe('Agent 1');
      expect(agentMap.get('agent-2')?.name).toBe('Agent 2');
    });
  });

  describe('setTools', () => {
    it('sets tools from array to map', () => {
      const { setTools } = useAgentStore.getState();
      const tools = [
        createTestTool({ id: 'tool-1', name: 'Tool 1' }),
        createTestTool({ id: 'tool-2', name: 'Tool 2' }),
      ];

      setTools(tools);

      const { tools: toolMap } = useAgentStore.getState();
      expect(toolMap.size).toBe(2);
      expect(toolMap.get('tool-1')?.name).toBe('Tool 1');
    });
  });

  describe('addAgent', () => {
    it('adds an agent to the map', () => {
      const { addAgent } = useAgentStore.getState();
      const agent = createTestAgent({ id: 'new-agent' });

      addAgent(agent);

      const { agents } = useAgentStore.getState();
      expect(agents.has('new-agent')).toBe(true);
    });
  });

  describe('updateAgent', () => {
    it('updates a custom agent', () => {
      const { setAgents, updateAgent } = useAgentStore.getState();
      const agent = createTestAgent({ id: 'agent-1', name: 'Original', isBuiltin: false });
      
      setAgents([agent]);
      updateAgent('agent-1', { name: 'Updated' });

      const { agents } = useAgentStore.getState();
      expect(agents.get('agent-1')?.name).toBe('Updated');
    });

    it('does not update builtin agents', () => {
      const { setAgents, updateAgent } = useAgentStore.getState();
      const agent = createTestAgent({ id: 'agent-1', name: 'Builtin', isBuiltin: true });
      
      setAgents([agent]);
      updateAgent('agent-1', { name: 'Attempted Update' });

      const { agents } = useAgentStore.getState();
      expect(agents.get('agent-1')?.name).toBe('Builtin');
    });
  });

  describe('deleteAgent', () => {
    it('deletes a custom agent', () => {
      const { setAgents, deleteAgent } = useAgentStore.getState();
      const agent = createTestAgent({ id: 'agent-1', isBuiltin: false });
      
      setAgents([agent]);
      deleteAgent('agent-1');

      const { agents } = useAgentStore.getState();
      expect(agents.has('agent-1')).toBe(false);
    });

    it('does not delete builtin agents', () => {
      const { setAgents, deleteAgent } = useAgentStore.getState();
      const agent = createTestAgent({ id: 'agent-1', isBuiltin: true });
      
      setAgents([agent]);
      deleteAgent('agent-1');

      const { agents } = useAgentStore.getState();
      expect(agents.has('agent-1')).toBe(true);
    });
  });

  describe('getAgent', () => {
    it('returns agent by id', () => {
      const { setAgents, getAgent } = useAgentStore.getState();
      const agent = createTestAgent({ id: 'agent-1', name: 'Test' });
      
      setAgents([agent]);
      const result = getAgent('agent-1');

      expect(result?.name).toBe('Test');
    });

    it('returns undefined for non-existent agent', () => {
      const { getAgent } = useAgentStore.getState();
      const result = getAgent('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('getBuiltinAgents', () => {
    it('returns only builtin agents', () => {
      const { setAgents, getBuiltinAgents } = useAgentStore.getState();
      const agents = [
        createTestAgent({ id: 'builtin-1', isBuiltin: true }),
        createTestAgent({ id: 'custom-1', isBuiltin: false }),
        createTestAgent({ id: 'builtin-2', isBuiltin: true }),
      ];
      
      setAgents(agents);
      const builtinAgents = getBuiltinAgents();

      expect(builtinAgents).toHaveLength(2);
      expect(builtinAgents.every(a => a.isBuiltin)).toBe(true);
    });
  });

  describe('getCustomAgents', () => {
    it('returns only custom agents', () => {
      const { setAgents, getCustomAgents } = useAgentStore.getState();
      const agents = [
        createTestAgent({ id: 'builtin-1', isBuiltin: true }),
        createTestAgent({ id: 'custom-1', isBuiltin: false }),
      ];
      
      setAgents(agents);
      const customAgents = getCustomAgents();

      expect(customAgents).toHaveLength(1);
      expect(customAgents[0].isBuiltin).toBe(false);
    });
  });

  describe('getAllAgents', () => {
    it('returns all agents as array', () => {
      const { setAgents, getAllAgents } = useAgentStore.getState();
      const agents = [
        createTestAgent({ id: 'agent-1' }),
        createTestAgent({ id: 'agent-2' }),
      ];
      
      setAgents(agents);
      const allAgents = getAllAgents();

      expect(allAgents).toHaveLength(2);
    });
  });

  describe('loading states', () => {
    it('sets loading state', () => {
      const { setLoading } = useAgentStore.getState();
      
      setLoading(true);
      expect(useAgentStore.getState().isLoading).toBe(true);
      
      setLoading(false);
      expect(useAgentStore.getState().isLoading).toBe(false);
    });

    it('sets creating state', () => {
      const { setCreating } = useAgentStore.getState();
      
      setCreating(true);
      expect(useAgentStore.getState().isCreating).toBe(true);
    });
  });

  describe('error state', () => {
    it('sets and clears error', () => {
      const { setError } = useAgentStore.getState();
      
      setError('Error occurred');
      expect(useAgentStore.getState().error).toBe('Error occurred');
      
      setError(null);
      expect(useAgentStore.getState().error).toBeNull();
    });
  });

  describe('reset', () => {
    it('resets to initial state', () => {
      const { setAgents, setError, reset } = useAgentStore.getState();
      
      setAgents([createTestAgent()]);
      setError('Error');
      
      reset();
      
      const state = useAgentStore.getState();
      expect(state.agents.size).toBe(0);
      expect(state.error).toBeNull();
    });
  });
});
