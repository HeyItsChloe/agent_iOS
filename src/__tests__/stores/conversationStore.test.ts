import { describe, it, expect, beforeEach } from 'vitest';
import { useConversationStore } from '../../stores/conversationStore';
import { ConversationType } from '../../types/conversation';
import { MessageSender, MessageStatus } from '../../types/message';

describe('conversationStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useConversationStore.setState({
      conversations: [],
      activeConversationId: null,
    });
  });

  describe('createConversation', () => {
    it('creates a new conversation', () => {
      const { createConversation, conversations } = useConversationStore.getState();
      
      const conv = createConversation({
        type: ConversationType.SINGLE,
        agentIds: ['agent-1'],
        skillIds: [],
      });

      expect(conv.id).toBeDefined();
      expect(conv.type).toBe(ConversationType.SINGLE);
      expect(conv.agentIds).toEqual(['agent-1']);
      expect(useConversationStore.getState().conversations).toHaveLength(1);
    });

    it('creates a conversation with custom title', () => {
      const { createConversation } = useConversationStore.getState();
      
      const conv = createConversation({
        type: ConversationType.SINGLE,
        agentIds: ['agent-1'],
        skillIds: [],
        title: 'My Custom Chat',
      });

      expect(conv.title).toBe('My Custom Chat');
    });

    it('creates a group conversation', () => {
      const { createConversation } = useConversationStore.getState();
      
      const conv = createConversation({
        type: ConversationType.GROUP,
        agentIds: ['agent-1', 'agent-2', 'agent-3'],
        skillIds: ['skill-1'],
      });

      expect(conv.type).toBe(ConversationType.GROUP);
      expect(conv.agentIds).toHaveLength(3);
      expect(conv.skillIds).toHaveLength(1);
    });
  });

  describe('setActiveConversation', () => {
    it('sets the active conversation', () => {
      const { createConversation, setActiveConversation } = useConversationStore.getState();
      
      const conv = createConversation({
        type: ConversationType.SINGLE,
        agentIds: ['agent-1'],
        skillIds: [],
      });

      setActiveConversation(conv.id);
      
      expect(useConversationStore.getState().activeConversationId).toBe(conv.id);
    });

    it('clears active conversation when set to null', () => {
      const { createConversation, setActiveConversation } = useConversationStore.getState();
      
      const conv = createConversation({
        type: ConversationType.SINGLE,
        agentIds: ['agent-1'],
        skillIds: [],
      });

      setActiveConversation(conv.id);
      setActiveConversation(null);
      
      expect(useConversationStore.getState().activeConversationId).toBeNull();
    });
  });

  describe('addMessage', () => {
    it('adds a message to a conversation', () => {
      const { createConversation, addMessage } = useConversationStore.getState();
      
      const conv = createConversation({
        type: ConversationType.SINGLE,
        agentIds: ['agent-1'],
        skillIds: [],
      });

      addMessage(conv.id, {
        id: 'msg-1',
        conversationId: conv.id,
        content: 'Hello!',
        sender: MessageSender.USER,
        status: MessageStatus.SENT,
        timestamp: new Date(),
      });

      const updatedConv = useConversationStore.getState().conversations.find(c => c.id === conv.id);
      expect(updatedConv?.messages).toHaveLength(1);
      expect(updatedConv?.messages[0].content).toBe('Hello!');
    });

    it('does not add message to non-existent conversation', () => {
      const { addMessage, conversations } = useConversationStore.getState();
      
      addMessage('non-existent', {
        id: 'msg-1',
        conversationId: 'non-existent',
        content: 'Hello!',
        sender: MessageSender.USER,
        status: MessageStatus.SENT,
        timestamp: new Date(),
      });

      expect(useConversationStore.getState().conversations).toHaveLength(0);
    });
  });

  describe('updateMessage', () => {
    it('updates an existing message', () => {
      const { createConversation, addMessage, updateMessage } = useConversationStore.getState();
      
      const conv = createConversation({
        type: ConversationType.SINGLE,
        agentIds: ['agent-1'],
        skillIds: [],
      });

      addMessage(conv.id, {
        id: 'msg-1',
        conversationId: conv.id,
        content: 'Hello!',
        sender: MessageSender.USER,
        status: MessageStatus.SENDING,
        timestamp: new Date(),
      });

      updateMessage(conv.id, 'msg-1', { status: MessageStatus.SENT });

      const updatedConv = useConversationStore.getState().conversations.find(c => c.id === conv.id);
      expect(updatedConv?.messages[0].status).toBe(MessageStatus.SENT);
    });
  });

  describe('deleteConversation', () => {
    it('deletes a conversation', () => {
      const { createConversation, deleteConversation } = useConversationStore.getState();
      
      const conv = createConversation({
        type: ConversationType.SINGLE,
        agentIds: ['agent-1'],
        skillIds: [],
      });

      deleteConversation(conv.id);
      
      expect(useConversationStore.getState().conversations).toHaveLength(0);
    });

    it('clears activeConversationId if deleted conversation was active', () => {
      const { createConversation, setActiveConversation, deleteConversation } = useConversationStore.getState();
      
      const conv = createConversation({
        type: ConversationType.SINGLE,
        agentIds: ['agent-1'],
        skillIds: [],
      });

      setActiveConversation(conv.id);
      deleteConversation(conv.id);
      
      expect(useConversationStore.getState().activeConversationId).toBeNull();
    });
  });

  describe('activeConversation getter', () => {
    it('returns null when no active conversation', () => {
      expect(useConversationStore.getState().activeConversation).toBeNull();
    });

    it('returns the active conversation when set', () => {
      const { createConversation, setActiveConversation } = useConversationStore.getState();
      
      const conv = createConversation({
        type: ConversationType.SINGLE,
        agentIds: ['agent-1'],
        skillIds: [],
      });

      setActiveConversation(conv.id);
      
      expect(useConversationStore.getState().activeConversation?.id).toBe(conv.id);
    });
  });

  describe('updateConversationAgents', () => {
    it('updates agents in a conversation', () => {
      const { createConversation, updateConversationAgents } = useConversationStore.getState();
      
      const conv = createConversation({
        type: ConversationType.GROUP,
        agentIds: ['agent-1'],
        skillIds: [],
      });

      updateConversationAgents(conv.id, ['agent-1', 'agent-2', 'agent-3']);
      
      const updatedConv = useConversationStore.getState().conversations.find(c => c.id === conv.id);
      expect(updatedConv?.agentIds).toEqual(['agent-1', 'agent-2', 'agent-3']);
    });
  });

  describe('updateConversationSkills', () => {
    it('updates skills in a conversation', () => {
      const { createConversation, updateConversationSkills } = useConversationStore.getState();
      
      const conv = createConversation({
        type: ConversationType.SINGLE,
        agentIds: ['agent-1'],
        skillIds: [],
      });

      updateConversationSkills(conv.id, ['skill-1', 'skill-2']);
      
      const updatedConv = useConversationStore.getState().conversations.find(c => c.id === conv.id);
      expect(updatedConv?.skillIds).toEqual(['skill-1', 'skill-2']);
    });
  });
});
