/**
 * Zustand store for conversation state management.
 */

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Conversation, ConversationSummary, ConversationType, Message } from '@/types';

interface ConversationState {
  // Data
  conversations: Map<string, Conversation>;
  summaries: ConversationSummary[];
  activeConversationId: string | null;
  
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isSending: boolean;
  
  // Error state
  error: string | null;
  
  // Computed
  activeConversation: Conversation | null;
  
  // Actions
  setConversations: (conversations: Conversation[]) => void;
  setSummaries: (summaries: ConversationSummary[]) => void;
  setActiveConversation: (id: string | null) => void;
  
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;
  
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  
  setTypingAgent: (conversationId: string, agentId: string, isTyping: boolean) => void;
  
  setLoading: (isLoading: boolean) => void;
  setCreating: (isCreating: boolean) => void;
  setSending: (isSending: boolean) => void;
  setError: (error: string | null) => void;
  
  // Reset
  reset: () => void;
}

const initialState = {
  conversations: new Map<string, Conversation>(),
  summaries: [],
  activeConversationId: null,
  isLoading: false,
  isCreating: false,
  isSending: false,
  error: null,
  activeConversation: null,
};

export const useConversationStore = create<ConversationState>((set, get) => ({
  ...initialState,
  
  // Computed getter
  get activeConversation() {
    const { conversations, activeConversationId } = get();
    return activeConversationId ? conversations.get(activeConversationId) || null : null;
  },
  
  setConversations: (conversations) => {
    const map = new Map<string, Conversation>();
    conversations.forEach(conv => map.set(conv.id, conv));
    set({ conversations: map });
  },
  
  setSummaries: (summaries) => set({ summaries }),
  
  setActiveConversation: (id) => set({ activeConversationId: id }),
  
  addConversation: (conversation) => {
    const conversations = new Map(get().conversations);
    conversations.set(conversation.id, conversation);
    set({ conversations });
  },
  
  updateConversation: (id, updates) => {
    const conversations = new Map(get().conversations);
    const existing = conversations.get(id);
    if (existing) {
      conversations.set(id, { ...existing, ...updates });
      set({ conversations });
    }
  },
  
  deleteConversation: (id) => {
    const conversations = new Map(get().conversations);
    conversations.delete(id);
    const { activeConversationId } = get();
    set({ 
      conversations,
      activeConversationId: activeConversationId === id ? null : activeConversationId,
    });
  },
  
  addMessage: (conversationId, message) => {
    const conversations = new Map(get().conversations);
    const conversation = conversations.get(conversationId);
    if (conversation) {
      conversations.set(conversationId, {
        ...conversation,
        messages: [...conversation.messages, message],
        updatedAt: new Date(),
      });
      set({ conversations });
    }
  },
  
  updateMessage: (conversationId, messageId, updates) => {
    const conversations = new Map(get().conversations);
    const conversation = conversations.get(conversationId);
    if (conversation) {
      const messages = conversation.messages.map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      );
      conversations.set(conversationId, { ...conversation, messages });
      set({ conversations });
    }
  },
  
  setTypingAgent: (conversationId, agentId, isTyping) => {
    const conversations = new Map(get().conversations);
    const conversation = conversations.get(conversationId);
    if (conversation) {
      conversations.set(conversationId, {
        ...conversation,
        typingAgents: {
          ...conversation.typingAgents,
          [agentId]: isTyping,
        },
      });
      set({ conversations });
    }
  },
  
  setLoading: (isLoading) => set({ isLoading }),
  setCreating: (isCreating) => set({ isCreating }),
  setSending: (isSending) => set({ isSending }),
  setError: (error) => set({ error }),
  
  reset: () => set(initialState),
}));

// Selector hooks for common patterns
export const useActiveConversation = () => {
  const conversations = useConversationStore(state => state.conversations);
  const activeId = useConversationStore(state => state.activeConversationId);
  return activeId ? conversations.get(activeId) || null : null;
};

export const useConversationMessages = (conversationId: string) => {
  const conversations = useConversationStore(state => state.conversations);
  return conversations.get(conversationId)?.messages || [];
};

export const useTypingAgents = (conversationId: string) => {
  const conversations = useConversationStore(state => state.conversations);
  const typingAgents = conversations.get(conversationId)?.typingAgents || {};
  return Object.entries(typingAgents)
    .filter(([_, isTyping]) => isTyping)
    .map(([agentId]) => agentId);
};
