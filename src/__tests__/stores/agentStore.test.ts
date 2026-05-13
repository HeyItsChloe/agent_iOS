import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAgentStore } from '../../stores/agentStore';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('agentStore', () => {
  beforeEach(() => {
    // Reset store state
    useAgentStore.setState({
      agents: [],
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with empty agents array', () => {
      const { agents } = useAgentStore.getState();
      expect(agents).toEqual([]);
    });

    it('starts with isLoading false', () => {
      const { isLoading } = useAgentStore.getState();
      expect(isLoading).toBe(false);
    });

    it('starts with no error', () => {
      const { error } = useAgentStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('createAgent', () => {
    it('creates a new agent optimistically', async () => {
      const mockAgent = {
        id: 'new-agent',
        name: 'Test Agent',
        description: 'A test agent',
        avatar: '🤖',
        color: '#007AFF',
        type: 'custom',
        isBuiltin: false,
        toolIds: [],
        skillIds: [],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAgent),
      });

      const { createAgent } = useAgentStore.getState();
      
      const result = await createAgent({
        name: 'Test Agent',
        description: 'A test agent',
        avatar: '🤖',
        color: '#007AFF',
        toolIds: [],
        skillIds: [],
      });

      expect(result.name).toBe('Test Agent');
    });
  });

  describe('setAgents', () => {
    it('sets agents array', () => {
      const testAgents = [
        {
          id: 'agent-1',
          name: 'Agent 1',
          description: 'First agent',
          avatar: '🤖',
          color: '#007AFF',
          type: 'builtin',
          isBuiltin: true,
          toolIds: [],
          skillIds: [],
        },
        {
          id: 'agent-2',
          name: 'Agent 2',
          description: 'Second agent',
          avatar: '🧠',
          color: '#34C759',
          type: 'custom',
          isBuiltin: false,
          toolIds: [],
          skillIds: [],
        },
      ];

      useAgentStore.setState({ agents: testAgents });
      
      const { agents } = useAgentStore.getState();
      expect(agents).toHaveLength(2);
      expect(agents[0].name).toBe('Agent 1');
      expect(agents[1].name).toBe('Agent 2');
    });
  });

  describe('getAgentById', () => {
    it('finds agent by id', () => {
      const testAgents = [
        {
          id: 'agent-1',
          name: 'Agent 1',
          description: 'First agent',
          avatar: '🤖',
          color: '#007AFF',
          type: 'builtin',
          isBuiltin: true,
          toolIds: [],
          skillIds: [],
        },
      ];

      useAgentStore.setState({ agents: testAgents });
      
      const { agents } = useAgentStore.getState();
      const agent = agents.find(a => a.id === 'agent-1');
      
      expect(agent).toBeDefined();
      expect(agent?.name).toBe('Agent 1');
    });

    it('returns undefined for non-existent agent', () => {
      const { agents } = useAgentStore.getState();
      const agent = agents.find(a => a.id === 'non-existent');
      
      expect(agent).toBeUndefined();
    });
  });

  describe('filtering', () => {
    beforeEach(() => {
      const testAgents = [
        {
          id: 'builtin-1',
          name: 'Builtin Agent',
          description: 'A builtin agent',
          avatar: '🤖',
          color: '#007AFF',
          type: 'builtin',
          isBuiltin: true,
          toolIds: [],
          skillIds: [],
        },
        {
          id: 'custom-1',
          name: 'Custom Agent',
          description: 'A custom agent',
          avatar: '🧠',
          color: '#34C759',
          type: 'custom',
          isBuiltin: false,
          toolIds: [],
          skillIds: [],
        },
      ];

      useAgentStore.setState({ agents: testAgents });
    });

    it('can filter builtin agents', () => {
      const { agents } = useAgentStore.getState();
      const builtinAgents = agents.filter(a => a.isBuiltin);
      
      expect(builtinAgents).toHaveLength(1);
      expect(builtinAgents[0].name).toBe('Builtin Agent');
    });

    it('can filter custom agents', () => {
      const { agents } = useAgentStore.getState();
      const customAgents = agents.filter(a => !a.isBuiltin);
      
      expect(customAgents).toHaveLength(1);
      expect(customAgents[0].name).toBe('Custom Agent');
    });
  });
});
