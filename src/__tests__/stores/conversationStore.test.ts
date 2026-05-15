import { describe, it, expect, beforeEach } from 'vitest';
import { useConversationStore } from '../../stores/conversationStore';
import type { Conversation, Message } from '../../types';

// Helper to create a test conversation
function createTestConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'test-conv-1',
    title: 'Test Conversation',
    type: 'single',
    agentIds: ['agent-1'],
    skillIds: [],
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    typingAgents: {},
    isArchived: false,
    isMuted: false,
    isStopped: false,
    ...overrides,
  };
}

// Helper to create a test message
function createTestMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    conversationId: 'test-conv-1',
    content: 'Test message',
    sender: 'user',
    timestamp: new Date(),
    status: 'sent',
    subAgentResults: [],
    ...overrides,
  };
}

describe('conversationStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useConversationStore.getState().reset();
  });

  describe('setConversations', () => {
    it('sets conversations from array to map', () => {
      const { setConversations } = useConversationStore.getState();
      const conv1 = createTestConversation({ id: 'conv-1' });
      const conv2 = createTestConversation({ id: 'conv-2' });

      setConversations([conv1, conv2]);

      const { conversations } = useConversationStore.getState();
      expect(conversations.size).toBe(2);
      expect(conversations.get('conv-1')).toBeDefined();
      expect(conversations.get('conv-2')).toBeDefined();
    });
  });

  describe('setActiveConversation', () => {
    it('sets the active conversation id', () => {
      const { setActiveConversation, setConversations } = useConversationStore.getState();
      const conv = createTestConversation({ id: 'conv-1' });
      
      setConversations([conv]);
      setActiveConversation('conv-1');

      expect(useConversationStore.getState().activeConversationId).toBe('conv-1');
    });

    it('clears active conversation when set to null', () => {
      const { setActiveConversation } = useConversationStore.getState();
      
      setActiveConversation('conv-1');
      setActiveConversation(null);

      expect(useConversationStore.getState().activeConversationId).toBeNull();
    });
  });

  describe('addConversation', () => {
    it('adds a conversation to the map', () => {
      const { addConversation } = useConversationStore.getState();
      const conv = createTestConversation({ id: 'new-conv' });

      addConversation(conv);

      const { conversations } = useConversationStore.getState();
      expect(conversations.has('new-conv')).toBe(true);
      expect(conversations.get('new-conv')?.title).toBe('Test Conversation');
    });
  });

  describe('updateConversation', () => {
    it('updates an existing conversation', () => {
      const { setConversations, updateConversation } = useConversationStore.getState();
      const conv = createTestConversation({ id: 'conv-1', title: 'Original Title' });
      
      setConversations([conv]);
      updateConversation('conv-1', { title: 'Updated Title' });

      const { conversations } = useConversationStore.getState();
      expect(conversations.get('conv-1')?.title).toBe('Updated Title');
    });

    it('does nothing for non-existent conversation', () => {
      const { updateConversation } = useConversationStore.getState();
      
      // Should not throw
      updateConversation('non-existent', { title: 'New Title' });

      const { conversations } = useConversationStore.getState();
      expect(conversations.size).toBe(0);
    });
  });

  describe('deleteConversation', () => {
    it('removes a conversation from the map', () => {
      const { setConversations, deleteConversation } = useConversationStore.getState();
      const conv = createTestConversation({ id: 'conv-1' });
      
      setConversations([conv]);
      deleteConversation('conv-1');

      const { conversations } = useConversationStore.getState();
      expect(conversations.has('conv-1')).toBe(false);
    });

    it('clears activeConversationId if deleted conversation was active', () => {
      const { setConversations, setActiveConversation, deleteConversation } = useConversationStore.getState();
      const conv = createTestConversation({ id: 'conv-1' });
      
      setConversations([conv]);
      setActiveConversation('conv-1');
      deleteConversation('conv-1');

      expect(useConversationStore.getState().activeConversationId).toBeNull();
    });
  });

  describe('addMessage', () => {
    it('adds a message to a conversation', () => {
      const { setConversations, addMessage } = useConversationStore.getState();
      const conv = createTestConversation({ id: 'conv-1' });
      
      setConversations([conv]);
      
      const message = createTestMessage({ 
        id: 'msg-1', 
        conversationId: 'conv-1',
        content: 'Hello!' 
      });
      addMessage('conv-1', message);

      const { conversations } = useConversationStore.getState();
      const updatedConv = conversations.get('conv-1');
      expect(updatedConv?.messages).toHaveLength(1);
      expect(updatedConv?.messages[0].content).toBe('Hello!');
    });

    it('does not add message to non-existent conversation', () => {
      const { addMessage } = useConversationStore.getState();
      const message = createTestMessage({ conversationId: 'non-existent' });

      addMessage('non-existent', message);

      const { conversations } = useConversationStore.getState();
      expect(conversations.size).toBe(0);
    });
  });

  describe('updateMessage', () => {
    it('updates an existing message', () => {
      const { setConversations, addMessage, updateMessage } = useConversationStore.getState();
      const conv = createTestConversation({ id: 'conv-1' });
      
      setConversations([conv]);
      
      const message = createTestMessage({ 
        id: 'msg-1', 
        conversationId: 'conv-1',
        status: 'sending' 
      });
      addMessage('conv-1', message);
      updateMessage('conv-1', 'msg-1', { status: 'sent' });

      const { conversations } = useConversationStore.getState();
      const updatedConv = conversations.get('conv-1');
      expect(updatedConv?.messages[0].status).toBe('sent');
    });
  });

  describe('setTypingAgent', () => {
    it('sets typing status for an agent', () => {
      const { setConversations, setTypingAgent } = useConversationStore.getState();
      const conv = createTestConversation({ id: 'conv-1' });
      
      setConversations([conv]);
      setTypingAgent('conv-1', 'agent-1', true);

      const { conversations } = useConversationStore.getState();
      expect(conversations.get('conv-1')?.typingAgents['agent-1']).toBe(true);
    });

    it('can clear typing status', () => {
      const { setConversations, setTypingAgent } = useConversationStore.getState();
      const conv = createTestConversation({ id: 'conv-1' });
      
      setConversations([conv]);
      setTypingAgent('conv-1', 'agent-1', true);
      setTypingAgent('conv-1', 'agent-1', false);

      const { conversations } = useConversationStore.getState();
      expect(conversations.get('conv-1')?.typingAgents['agent-1']).toBe(false);
    });
  });

  describe('loading states', () => {
    it('sets loading state', () => {
      const { setLoading } = useConversationStore.getState();
      
      setLoading(true);
      expect(useConversationStore.getState().isLoading).toBe(true);
      
      setLoading(false);
      expect(useConversationStore.getState().isLoading).toBe(false);
    });

    it('sets creating state', () => {
      const { setCreating } = useConversationStore.getState();
      
      setCreating(true);
      expect(useConversationStore.getState().isCreating).toBe(true);
    });

    it('sets sending state', () => {
      const { setSending } = useConversationStore.getState();
      
      setSending(true);
      expect(useConversationStore.getState().isSending).toBe(true);
    });
  });

  describe('error state', () => {
    it('sets and clears error', () => {
      const { setError } = useConversationStore.getState();
      
      setError('Something went wrong');
      expect(useConversationStore.getState().error).toBe('Something went wrong');
      
      setError(null);
      expect(useConversationStore.getState().error).toBeNull();
    });
  });

  describe('reset', () => {
    it('resets to initial state', () => {
      const { setConversations, setActiveConversation, setError, reset } = useConversationStore.getState();
      const conv = createTestConversation();
      
      setConversations([conv]);
      setActiveConversation('test-conv-1');
      setError('Error');
      
      reset();
      
      const state = useConversationStore.getState();
      expect(state.conversations.size).toBe(0);
      expect(state.activeConversationId).toBeNull();
      expect(state.error).toBeNull();
    });
  });
});
