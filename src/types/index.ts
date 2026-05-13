/**
 * Type exports for the Agent iOS application.
 */

// Message types
export type { Message, MessageCreate, MessageStatus, MessageSender, SubAgentResult } from './message';
export { parseMessage } from './message';

// Conversation types
export type { Conversation, ConversationCreate, ConversationType, ConversationSummary } from './conversation';
export { parseConversation, parseConversationSummary } from './conversation';

// Agent types
export type { Agent, AgentCreate, AgentUpdate, AgentType, Tool, ToolAnnotations } from './agent';
export { parseAgent, parseTool, BUILTIN_TOOLS } from './agent';

// Skill types
export type { Skill, SkillCreate, SkillUpdate, SkillCategory, SkillCategoryInfo } from './skill';
export { parseSkill, SKILL_CATEGORIES, getCategoryInfo } from './skill';

// Event types
export type {
  EventType,
  WebSocketEvent,
  MessageEvent,
  TypingEvent,
  ErrorEvent,
  ActionEvent,
  ObservationEvent,
  AgentState,
  AgentStateEvent,
  ConversationUpdatedEvent,
  AnyWebSocketEvent,
} from './events';
export { parseWebSocketEvent } from './events';

// Electron types
export type { ElectronAPI } from './electron';
