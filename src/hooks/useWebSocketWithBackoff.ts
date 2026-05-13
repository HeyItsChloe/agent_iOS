import { useRef, useState, useCallback, useEffect } from 'react';

interface WebSocketOptions {
  url: string;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onMessage?: (event: MessageEvent) => void;
  onError?: (event: Event) => void;
  reconnect?: boolean;
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  retryCount: number;
  error: string | null;
}

/**
 * WebSocket hook with exponential backoff reconnection.
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Connection health monitoring with ping/pong
 * - Graceful error handling
 * - Manual connect/disconnect control
 */
export function useWebSocketWithBackoff({
  url,
  onOpen,
  onClose,
  onMessage,
  onError,
  reconnect = true,
  maxRetries = 10,
  baseDelay = 1000,
  maxDelay = 30000,
}: WebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    retryCount: 0,
    error: null,
  });

  /**
   * Calculate delay with exponential backoff and jitter.
   */
  const calculateDelay = useCallback((retryCount: number) => {
    // Exponential backoff: baseDelay * 2^retryCount
    const exponentialDelay = baseDelay * Math.pow(2, retryCount);
    // Cap at maxDelay
    const cappedDelay = Math.min(exponentialDelay, maxDelay);
    // Add jitter (±25%)
    const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
    return Math.floor(cappedDelay + jitter);
  }, [baseDelay, maxDelay]);

  /**
   * Clear all timers.
   */
  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  /**
   * Start ping interval for connection health.
   */
  const startPingInterval = useCallback(() => {
    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
        } catch (e) {
          console.warn('Failed to send ping:', e);
        }
      }
    }, 30000);
  }, []);

  /**
   * Connect to WebSocket.
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = (event) => {
        console.log('[WS] Connected');
        retryCountRef.current = 0;
        setState({
          isConnected: true,
          isConnecting: false,
          retryCount: 0,
          error: null,
        });
        startPingInterval();
        onOpen?.(event);
      };

      ws.onclose = (event) => {
        console.log(`[WS] Disconnected: ${event.code} ${event.reason}`);
        clearTimers();
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
        }));
        onClose?.(event);

        // Attempt reconnection if enabled and not intentionally closed
        if (reconnect && event.code !== 1000 && retryCountRef.current < maxRetries) {
          const delay = calculateDelay(retryCountRef.current);
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${retryCountRef.current + 1}/${maxRetries})`);
          
          retryCountRef.current++;
          setState(prev => ({ ...prev, retryCount: retryCountRef.current }));
          
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else if (retryCountRef.current >= maxRetries) {
          setState(prev => ({
            ...prev,
            error: 'Max reconnection attempts reached',
          }));
        }
      };

      ws.onmessage = (event) => {
        // Handle pong (ignore it)
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') return;
        } catch {
          // Not JSON, pass through
        }
        onMessage?.(event);
      };

      ws.onerror = (event) => {
        console.error('[WS] Error:', event);
        setState(prev => ({ ...prev, error: 'WebSocket error' }));
        onError?.(event);
      };
    } catch (error) {
      console.error('[WS] Failed to create WebSocket:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: 'Failed to connect',
      }));
    }
  }, [url, onOpen, onClose, onMessage, onError, reconnect, maxRetries, calculateDelay, clearTimers, startPingInterval]);

  /**
   * Disconnect from WebSocket.
   */
  const disconnect = useCallback(() => {
    clearTimers();
    retryCountRef.current = 0;
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    setState({
      isConnected: false,
      isConnecting: false,
      retryCount: 0,
      error: null,
    });
  }, [clearTimers]);

  /**
   * Send a message through WebSocket.
   */
  const send = useCallback((data: string | object) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.warn('[WS] Cannot send: not connected');
      return false;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      wsRef.current.send(message);
      return true;
    } catch (error) {
      console.error('[WS] Send error:', error);
      return false;
    }
  }, []);

  /**
   * Reset retry count and reconnect.
   */
  const reconnectNow = useCallback(() => {
    disconnect();
    retryCountRef.current = 0;
    connect();
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
      }
    };
  }, [clearTimers]);

  return {
    ...state,
    connect,
    disconnect,
    send,
    reconnectNow,
    ws: wsRef.current,
  };
}
