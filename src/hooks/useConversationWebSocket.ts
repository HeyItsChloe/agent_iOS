import { useEffect, useRef, useState, useCallback } from 'react';
import { useConversationStore } from '../stores/conversationStore';
import type { Message } from '../types/message';
import type { EventType } from '../types/events';

const TYPING_TIMEOUT_MS = 30000; // Auto-clear typing after 30 seconds

interface UseConversationWebSocketReturn {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  sendMessage: (content: string, mentionAgentId?: string) => void;
  disconnect: () => void;
}

export function useConversationWebSocket(
  conversationId: string | null
): UseConversationWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const conversationIdRef = useRef<string | null>(conversationId);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { addMessage, updateMessage, conversations, setTypingAgent, clearTypingAgents } = useConversationStore();
  
  // Keep conversationIdRef in sync
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  const connect = useCallback(() => {
    if (!conversationId) return;
    
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    setConnecting(true);
    setError(null);

    // Determine WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/conversations/${conversationId}/stream`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`[WS] Connected to conversation ${conversationId}`);
        setConnected(true);
        setConnecting(false);
        setError(null);
      };

      ws.onclose = (event) => {
        console.log(`[WS] Disconnected: ${event.code} ${event.reason}`);
        setConnected(false);
        setConnecting(false);
        
        // Attempt reconnect after delay (unless intentionally closed)
        if (event.code !== 1000 && conversationId) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[WS] Attempting reconnect...');
            connect();
          }, 3000);
        }
      };

      ws.onerror = (event) => {
        console.error('[WS] Error:', event);
        setError('WebSocket connection error');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleEvent(data);
        } catch (e) {
          console.error('[WS] Failed to parse message:', e);
        }
      };
    } catch (e) {
      console.error('[WS] Failed to create WebSocket:', e);
      setConnecting(false);
      setError('Failed to connect');
    }
  }, [conversationId]);

  // Clear typing timeout for an agent
  const clearTypingTimeout = useCallback((agentId: string) => {
    const timeout = typingTimeoutRef.current.get(agentId);
    if (timeout) {
      clearTimeout(timeout);
      typingTimeoutRef.current.delete(agentId);
    }
  }, []);

  // Set typing with auto-clear timeout
  const setTypingWithTimeout = useCallback((convId: string, agentId: string, isTyping: boolean) => {
    // Clear existing timeout for this agent
    clearTypingTimeout(agentId);
    
    // Update store
    setTypingAgent(convId, agentId, isTyping);
    
    // Set auto-clear timeout if starting to type
    if (isTyping) {
      const timeout = setTimeout(() => {
        // Only clear if this is still the active conversation
        if (conversationIdRef.current === convId) {
          console.log(`[WS] Auto-clearing stale typing indicator for agent: ${agentId}`);
          setTypingAgent(convId, agentId, false);
        }
        typingTimeoutRef.current.delete(agentId);
      }, TYPING_TIMEOUT_MS);
      typingTimeoutRef.current.set(agentId, timeout);
    }
  }, [setTypingAgent, clearTypingTimeout]);

  const handleEvent = useCallback((data: { type: EventType; conversation_id?: string; agent_id?: string; error_message?: string; tool_name?: string; state?: string }) => {
    const eventType = data.type;
    const eventConversationId = data.conversation_id;
    const currentConversationId = conversationIdRef.current;

    // DEBUG: Log all incoming events with conversation context
    console.log(`[WS DEBUG] ====== RECEIVED EVENT ======`);
    console.log(`[WS DEBUG] Hook's conversationId: ${currentConversationId}`);
    console.log(`[WS DEBUG] Event's conversation_id: ${eventConversationId}`);
    console.log(`[WS DEBUG] Event type: ${eventType}`);
    
    // STRICT VALIDATION: Reject events for wrong conversations
    if (eventConversationId && eventConversationId !== currentConversationId) {
      console.warn(`[WS DEBUG] REJECTING event - conversation_id mismatch: event=${eventConversationId}, hook=${currentConversationId}`);
      return;
    }

    switch (eventType) {
      case 'connected':
        console.log('[WS] Received connected event');
        break;

      case 'message_received':
        if (!currentConversationId) return;
        console.log(`[WS DEBUG] Processing message_received for conversation: ${currentConversationId}`);
        handleMessageReceived(data);
        break;

      case 'typing_started':
        if (!currentConversationId || !data.agent_id) return;
        console.log(`[WS DEBUG] Typing started - agent: ${data.agent_id}, conversation: ${currentConversationId}`);
        setTypingWithTimeout(currentConversationId, data.agent_id, true);
        break;

      case 'typing_stopped':
        if (!currentConversationId || !data.agent_id) return;
        console.log(`[WS DEBUG] Typing stopped - agent: ${data.agent_id}, conversation: ${currentConversationId}`);
        clearTypingTimeout(data.agent_id);
        setTypingAgent(currentConversationId, data.agent_id, false);
        break;

      case 'error':
        console.error('[WS] Server error:', data.error_message);
        setError(data.error_message || 'Server error');
        break;

      case 'action':
        console.log('[WS] Action:', data.tool_name);
        break;

      case 'observation':
        console.log('[WS] Observation:', data.tool_name);
        break;

      case 'agent_state':
        console.log('[WS] Agent state:', data.state);
        break;

      default:
        console.log('[WS] Unknown event type:', eventType, data);
    }
  }, [setTypingAgent, setTypingWithTimeout, clearTypingTimeout]);

  const handleMessageReceived = useCallback((data: { 
    message_id?: string; 
    conversation_id?: string; 
    content?: string; 
    sender?: string; 
    agent_id?: string; 
    agent_name?: string; 
    agent_color?: string; 
    timestamp?: string;
    sub_agent_results?: Array<{ agentId: string; agentName: string; icon: string; content: string }>;
  }) => {
    const currentConversationId = conversationIdRef.current;
    
    console.log(`[WS DEBUG] handleMessageReceived called`);
    console.log(`[WS DEBUG] Hook's conversationId: ${currentConversationId}`);
    console.log(`[WS DEBUG] Event's conversation_id: ${data.conversation_id}`);
    console.log(`[WS DEBUG] Sender: ${data.sender}`);
    
    if (!currentConversationId) {
      console.log(`[WS DEBUG] No conversationId, returning early`);
      return;
    }

    // For user messages, update status AND timestamp from server
    if (data.sender === 'user') {
      console.log(`[WS DEBUG] Processing user message confirmation`);
      const conversation = conversations.get(currentConversationId);
      if (conversation) {
        const pendingMessage = conversation.messages.find(
          m => m.sender === 'user' && m.status === 'sending'
        );
        if (pendingMessage) {
          console.log(`[WS DEBUG] Found pending message to update: ${pendingMessage.id}`);
          updateMessage(currentConversationId, pendingMessage.id, { 
            status: 'sent',
            timestamp: new Date(data.timestamp || Date.now()),
          });
        }
      }
      return;
    }

    console.log(`[WS DEBUG] Processing agent message`);
    const message: Message = {
      id: data.message_id || `msg-${Date.now()}`,
      conversationId: data.conversation_id || currentConversationId,
      content: data.content || '',
      sender: 'agent',
      agentId: data.agent_id,
      agentName: data.agent_name,
      agentColor: data.agent_color,
      status: 'sent',
      timestamp: new Date(data.timestamp || Date.now()),
      subAgentResults: data.sub_agent_results || [],
    };

    console.log(`[WS DEBUG] Adding message to conversation: ${currentConversationId}`);
    addMessage(currentConversationId, message);

    // Clear typing indicator and timeout for this agent
    if (data.agent_id) {
      clearTypingTimeout(data.agent_id);
      setTypingAgent(currentConversationId, data.agent_id, false);
    }
  }, [addMessage, updateMessage, conversations, setTypingAgent, clearTypingTimeout]);

  const sendMessage = useCallback((content: string, mentionAgentId?: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('[WS] Cannot send message: not connected');
      return;
    }

    wsRef.current.send(JSON.stringify({
      type: 'message',
      content,
      mention_agent_id: mentionAgentId,
    }));
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Clear all typing timeouts
    typingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
    typingTimeoutRef.current.clear();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  // Connect when conversation changes
  useEffect(() => {
    // Store previous conversation ID for cleanup
    const previousConversationId = conversationIdRef.current;
    
    // Clear all typing timeouts from previous conversation
    typingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
    typingTimeoutRef.current.clear();
    
    if (!conversationId) {
      // No conversation, ensure disconnected
      if (wsRef.current) {
        wsRef.current.close(1000, 'No conversation');
        wsRef.current = null;
      }
      setConnected(false);
      return;
    }

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close existing connection if different conversation
    if (wsRef.current) {
      wsRef.current.close(1000, 'Switching conversation');
      wsRef.current = null;
    }

    setConnecting(true);
    setError(null);

    // Determine WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/conversations/${conversationId}/stream`;

    console.log(`[WS] Creating new WebSocket for conversation: ${conversationId}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`[WS] Connected to conversation ${conversationId}`);
      setConnected(true);
      setConnecting(false);
      setError(null);
    };

    ws.onclose = (event) => {
      console.log(`[WS] Disconnected: ${event.code} ${event.reason}`);
      setConnected(false);
      setConnecting(false);
      
      // Only reconnect if this is still our active WebSocket and it wasn't intentional
      if (wsRef.current === ws && event.code !== 1000) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[WS] Attempting reconnect...');
          connect();
        }, 3000);
      }
    };

    ws.onerror = (event) => {
      console.error('[WS] Error:', event);
      setError('WebSocket connection error');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleEvent(data);
      } catch (e) {
        console.error('[WS] Failed to parse message:', e);
      }
    };

    return () => {
      // Cleanup on unmount or conversation change
      console.log(`[WS] Cleanup for conversation: ${conversationId}`);
      
      // Clear all typing timeouts
      typingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeoutRef.current.clear();
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000, 'Component cleanup');
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Ping to keep connection alive
  useEffect(() => {
    if (!connected) return;

    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [connected]);

  return {
    connected,
    connecting,
    error,
    sendMessage,
    disconnect,
  };
}
