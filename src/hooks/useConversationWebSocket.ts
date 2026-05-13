import { useEffect, useRef, useState, useCallback } from 'react';
import { useConversationStore } from '../stores/conversationStore';
import { useAgentStore } from '../stores/agentStore';
import { Message, MessageSender, MessageStatus } from '../types/message';
import { EventType } from '../types/events';

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
  
  const { addMessage, updateMessage } = useConversationStore();
  const { agents } = useAgentStore();

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

  const handleEvent = useCallback((data: any) => {
    const eventType = data.type as EventType;

    switch (eventType) {
      case EventType.CONNECTED:
        console.log('[WS] Received connected event');
        break;

      case EventType.MESSAGE_RECEIVED:
        handleMessageReceived(data);
        break;

      case EventType.TYPING_STARTED:
        if (data.agent_id) {
          setTypingAgents(prev => 
            prev.includes(data.agent_id) ? prev : [...prev, data.agent_id]
          );
        }
        break;

      case EventType.TYPING_STOPPED:
        if (data.agent_id) {
          setTypingAgents(prev => prev.filter(id => id !== data.agent_id));
        }
        break;

      case EventType.ERROR:
        console.error('[WS] Server error:', data.error_message);
        setError(data.error_message || 'Server error');
        break;

      case EventType.ACTION:
        // Agent is executing an action - could show tool usage indicator
        console.log('[WS] Action:', data.tool_name);
        break;

      case EventType.OBSERVATION:
        // Agent received observation from tool
        console.log('[WS] Observation:', data.tool_name);
        break;

      case EventType.AGENT_STATE:
        console.log('[WS] Agent state:', data.state);
        break;

      default:
        console.log('[WS] Unknown event type:', eventType, data);
    }
  }, [conversationId, addMessage, agents]);

  const handleMessageReceived = useCallback((data: any) => {
    if (!conversationId) return;

    const agent = data.agent_id ? agents.find(a => a.id === data.agent_id) : null;

    const message: Message = {
      id: data.message_id || `msg-${Date.now()}`,
      conversationId: data.conversation_id || conversationId,
      content: data.content || '',
      sender: data.sender === 'user' ? MessageSender.USER : MessageSender.AGENT,
      agentId: data.agent_id,
      agentName: data.agent_name || agent?.name,
      agentColor: data.agent_color || agent?.color,
      status: MessageStatus.SENT,
      timestamp: new Date(data.timestamp || Date.now()),
      toolCalls: data.tool_calls,
      subAgentResults: data.sub_agent_results,
    };

    addMessage(conversationId, message);

    // Remove agent from typing list
    if (data.agent_id) {
      setTypingAgents(prev => prev.filter(id => id !== data.agent_id));
    }
  }, [conversationId, addMessage, agents]);

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
    if (conversationId) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [conversationId, connect, disconnect]);

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
