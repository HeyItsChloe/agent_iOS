/**
 * Message data types for chat conversations.
 */

/** Message delivery status */
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'error';

/** Message sender type */
export type MessageSender = 'user' | 'agent' | 'system';

/** Result from a sub-agent in a delegator conversation */
export interface SubAgentResult {
  agentId: string;
  agentName: string;
  icon: string;
  content: string;
}

/** A chat message */
export interface Message {
  id: string;
  conversationId: string;
  content: string;
  sender: MessageSender;
  agentId?: string;
  agentName?: string;
  agentColor?: string;
  timestamp: Date;
  status: MessageStatus;
  subAgentResults: SubAgentResult[];
  
  // Tool-related fields
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: string;
}

/** Request to create a new message */
export interface MessageCreate {
  content: string;
  mentionAgentId?: string;
}

/** Message with parsed date (from API) */
export interface MessageFromAPI {
  id: string;
  conversation_id: string;
  content: string;
  sender: MessageSender;
  agent_id?: string;
  agent_name?: string;
  agent_color?: string;
  timestamp: string;
  status: MessageStatus;
  sub_agent_results: SubAgentResult[];
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_output?: string;
}

/** Convert API message to frontend message */
export function parseMessage(apiMessage: MessageFromAPI): Message {
  return {
    id: apiMessage.id,
    conversationId: apiMessage.conversation_id,
    content: apiMessage.content,
    sender: apiMessage.sender,
    agentId: apiMessage.agent_id,
    agentName: apiMessage.agent_name,
    agentColor: apiMessage.agent_color,
    timestamp: new Date(apiMessage.timestamp),
    status: apiMessage.status,
    subAgentResults: apiMessage.sub_agent_results,
    toolName: apiMessage.tool_name,
    toolInput: apiMessage.tool_input,
    toolOutput: apiMessage.tool_output,
  };
}
