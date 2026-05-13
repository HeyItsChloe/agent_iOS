/**
 * WebSocket event types for real-time communication.
 */

/** Types of WebSocket events */
export type EventType =
  // Client -> Server
  | 'message'
  | 'ping'
  // Server -> Client
  | 'connected'
  | 'message_received'
  | 'typing_started'
  | 'typing_stopped'
  | 'error'
  | 'pong'
  // Agent events
  | 'action'
  | 'observation'
  | 'agent_state'
  | 'agent_state_change'
  // Conversation events
  | 'conversation_updated';

/** Base WebSocket event */
export interface WebSocketEvent {
  id: string;
  type: EventType;
  timestamp: string;
}

/** Event for a new message */
export interface MessageEvent extends WebSocketEvent {
  type: 'message_received';
  conversationId: string;
  messageId: string;
  content: string;
  sender: 'user' | 'agent';
  agentId?: string;
  agentName?: string;
  agentColor?: string;
}

/** Event for typing indicator */
export interface TypingEvent extends WebSocketEvent {
  type: 'typing_started' | 'typing_stopped';
  conversationId: string;
  agentId: string;
  agentName: string;
  isTyping: boolean;
}

/** Event for errors */
export interface ErrorEvent extends WebSocketEvent {
  type: 'error';
  conversationId?: string;
  errorCode: string;
  errorMessage: string;
  details?: Record<string, unknown>;
}

/** Event for an agent action (tool use) */
export interface ActionEvent extends WebSocketEvent {
  type: 'action';
  conversationId: string;
  agentId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  thought?: string;
}

/** Event for an observation (tool result) */
export interface ObservationEvent extends WebSocketEvent {
  type: 'observation';
  conversationId: string;
  agentId: string;
  toolName: string;
  content: string;
  isError: boolean;
}

/** Agent state */
export type AgentState = 'idle' | 'thinking' | 'acting' | 'waiting' | 'finished' | 'error';

/** Event for agent state changes */
export interface AgentStateEvent extends WebSocketEvent {
  type: 'agent_state_change';
  conversationId: string;
  agentId: string;
  state: AgentState;
}

/** Event when conversation is updated */
export interface ConversationUpdatedEvent extends WebSocketEvent {
  type: 'conversation_updated';
  conversationId: string;
  updateType: 'title' | 'agents' | 'skills' | 'archived';
}

/** Union type of all events */
export type AnyWebSocketEvent =
  | MessageEvent
  | TypingEvent
  | ErrorEvent
  | ActionEvent
  | ObservationEvent
  | AgentStateEvent
  | ConversationUpdatedEvent;

/** Event from API (snake_case) */
export interface WebSocketEventFromAPI {
  id: string;
  type: EventType;
  timestamp: string;
  conversation_id?: string;
  message_id?: string;
  content?: string;
  sender?: string;
  agent_id?: string;
  agent_name?: string;
  agent_color?: string;
  is_typing?: boolean;
  error_code?: string;
  error_message?: string;
  details?: Record<string, unknown>;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  thought?: string;
  is_error?: boolean;
  state?: AgentState;
  update_type?: string;
}

/** Parse WebSocket event from API format */
export function parseWebSocketEvent(api: WebSocketEventFromAPI): AnyWebSocketEvent {
  const base = {
    id: api.id,
    timestamp: api.timestamp,
  };

  switch (api.type) {
    case 'message_received':
      return {
        ...base,
        type: 'message_received',
        conversationId: api.conversation_id!,
        messageId: api.message_id!,
        content: api.content!,
        sender: api.sender as 'user' | 'agent',
        agentId: api.agent_id,
        agentName: api.agent_name,
        agentColor: api.agent_color,
      };

    case 'typing_started':
    case 'typing_stopped':
      return {
        ...base,
        type: api.type,
        conversationId: api.conversation_id!,
        agentId: api.agent_id!,
        agentName: api.agent_name!,
        isTyping: api.is_typing ?? api.type === 'typing_started',
      };

    case 'error':
      return {
        ...base,
        type: 'error',
        conversationId: api.conversation_id,
        errorCode: api.error_code!,
        errorMessage: api.error_message!,
        details: api.details,
      };

    case 'action':
      return {
        ...base,
        type: 'action',
        conversationId: api.conversation_id!,
        agentId: api.agent_id!,
        toolName: api.tool_name!,
        toolInput: api.tool_input!,
        thought: api.thought,
      };

    case 'observation':
      return {
        ...base,
        type: 'observation',
        conversationId: api.conversation_id!,
        agentId: api.agent_id!,
        toolName: api.tool_name!,
        content: api.content!,
        isError: api.is_error ?? false,
      };

    case 'agent_state_change':
      return {
        ...base,
        type: 'agent_state_change',
        conversationId: api.conversation_id!,
        agentId: api.agent_id!,
        state: api.state!,
      };

    case 'conversation_updated':
      return {
        ...base,
        type: 'conversation_updated',
        conversationId: api.conversation_id!,
        updateType: api.update_type as 'title' | 'agents' | 'skills' | 'archived',
      };

    default:
      throw new Error(`Unknown event type: ${api.type}`);
  }
}
