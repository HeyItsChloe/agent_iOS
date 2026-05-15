import { useEffect, useRef, useState, useCallback } from 'react';
import { useConversationStore } from '../stores/conversationStore';
import { useAgentStore } from '../stores/agentStore';
import type { Message } from '../types/message';
import type { EventType } from '../types/events';

interface UseConversationWebSocketReturn {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  typingAgents: string[];
  sendMessage: (content: string, mentionAgentId?: string) => void;
  disconnect: () => void;
}

export function useConversationWebSocket(
  conversationId: string | null
): UseConversationWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingAgents, setTypingAgents] = useState<string[]>([]);
  
  const { addMessage, updateMessage, conversations } = useConversationStore();
  const { agents } = useAgentStore();
  const agentsArray = Array.from(agents.values());

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

  const handleEvent = useCallback((data: { type: EventType; agent_id?: string; error_message?: string; tool_name?: string; state?: string }) => {
    const eventType = data.type;

    switch (eventType) {
      case 'connected':
        console.log('[WS] Received connected event');
        break;

      case 'message_received':
        handleMessageReceived(data);
        break;

      case 'typing_started':
        if (data.agent_id) {
          setTypingAgents(prev => 
            prev.includes(data.agent_id!) ? prev : [...prev, data.agent_id!]
          );
        }
        break;

      case 'typing_stopped':
        if (data.agent_id) {
          setTypingAgents(prev => prev.filter(id => id !== data.agent_id));
        }
        break;

      case 'error':
        console.error('[WS] Server error:', data.error_message);
        setError(data.error_message || 'Server error');
        break;

      case 'action':
        // Agent is executing an action - could show tool usage indicator
        console.log('[WS] Action:', data.tool_name);
        break;

      case 'observation':
        // Agent received observation from tool
        console.log('[WS] Observation:', data.tool_name);
        break;

      case 'agent_state':
        console.log('[WS] Agent state:', data.state);
        break;

      default:
        console.log('[WS] Unknown event type:', eventType, data);
    }
  }, [conversationId, addMessage, agentsArray]);

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
    if (!conversationId) return;

    // For user messages, update status AND timestamp from server
    // Using server timestamp ensures all messages use the same clock for correct sorting
    if (data.sender === 'user') {
      const conversation = conversations.get(conversationId);
      if (conversation) {
        const pendingMessage = conversation.messages.find(
          m => m.sender === 'user' && m.status === 'sending'
        );
        if (pendingMessage) {
          updateMessage(conversationId, pendingMessage.id, { 
            status: 'sent',
            timestamp: new Date(data.timestamp || Date.now()),
          });
        }
      }
      return;
    }

    const agent = data.agent_id ? agentsArray.find(a => a.id === data.agent_id) : null;

    const message: Message = {
      id: data.message_id || `msg-${Date.now()}`,
      conversationId: data.conversation_id || conversationId,
      content: data.content || '',
      sender: 'agent',
      agentId: data.agent_id,
      agentName: data.agent_name || agent?.name,
      agentColor: data.agent_color || agent?.color,
      status: 'sent',
      timestamp: new Date(data.timestamp || Date.now()),
      subAgentResults: data.sub_agent_results || [],
    };

    addMessage(conversationId, message);

    // Remove agent from typing list
    if (data.agent_id) {
      setTypingAgents(prev => prev.filter(id => id !== data.agent_id));
    }
  }, [conversationId, addMessage, updateMessage, conversations, agentsArray]);

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
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    setConnected(false);
    setTypingAgents([]);
  }, []);

  // Connect when conversation changes
  useEffect(() => {
    if (!conversationId) {
      // No conversation, ensure disconnected
      if (wsRef.current) {
        wsRef.current.close(1000, 'No conversation');
        wsRef.current = null;
      }
      setConnected(false);
      setTypingAgents([]);
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
          // Trigger reconnect by calling connect
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
    typingAgents,
    sendMessage,
    disconnect,
  };
}
