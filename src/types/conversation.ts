/**
 * Conversation data types.
 */

import type { Message, MessageFromAPI } from './message';

/** Type of conversation */
export type ConversationType = 'single' | 'delegator' | 'group';

/** A conversation with one or more agents */
export interface Conversation {
  id: string;
  title: string | null;
  type: ConversationType;
  agentIds: string[];
  skillIds: string[];
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  typingAgents: Record<string, boolean>;
  isArchived: boolean;
}

/** Request to create a new conversation */
export interface ConversationCreate {
  type: ConversationType;
  title?: string;
  agentIds: string[];
  skillIds?: string[];
}

/** Summary of a conversation for list views */
export interface ConversationSummary {
  id: string;
  title: string | null;
  type: ConversationType;
  agentIds: string[];
  skillIds: string[];
  lastMessage: string | null;
  lastMessageTime: Date | null;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Conversation from API (snake_case) */
export interface ConversationFromAPI {
  id: string;
  title: string | null;
  type: ConversationType;
  agent_ids: string[];
  skill_ids: string[];
  messages: MessageFromAPI[];
  created_at: string;
  updated_at: string;
  typing_agents: Record<string, boolean>;
  is_archived: boolean;
}

/** Conversation summary from API */
export interface ConversationSummaryFromAPI {
  id: string;
  title: string | null;
  type: ConversationType;
  agent_ids: string[];
  skill_ids: string[];
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

/** Convert API conversation to frontend conversation */
export function parseConversation(api: ConversationFromAPI): Conversation {
  const { parseMessage } = require('./message');
  return {
    id: api.id,
    title: api.title,
    type: api.type,
    agentIds: api.agent_ids,
    skillIds: api.skill_ids,
    messages: api.messages.map(parseMessage),
    createdAt: new Date(api.created_at),
    updatedAt: new Date(api.updated_at),
    typingAgents: api.typing_agents,
    isArchived: api.is_archived,
  };
}

/** Convert API conversation summary to frontend */
export function parseConversationSummary(api: ConversationSummaryFromAPI): ConversationSummary {
  return {
    id: api.id,
    title: api.title,
    type: api.type,
    agentIds: api.agent_ids,
    skillIds: api.skill_ids,
    lastMessage: api.last_message,
    lastMessageTime: api.last_message_time ? new Date(api.last_message_time) : null,
    unreadCount: api.unread_count,
    createdAt: new Date(api.created_at),
    updatedAt: new Date(api.updated_at),
  };
}
