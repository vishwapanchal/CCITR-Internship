"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface UseWebSocketOptions {
  url: string;
  onMessage?: (data: unknown) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
  maxRetries?: number;
}

interface UseWebSocketReturn {
  sendMessage: (message: string | object) => void;
  isConnected: boolean;
  lastMessage: unknown | null;
  reconnectCount: number;
}

export function useWebSocket({
  url,
  onMessage,
  onOpen,
  onClose,
  onError,
  reconnect = true,
  maxRetries = 5,
}: UseWebSocketOptions): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<unknown | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);

  // Store callbacks in refs to avoid re-creating WebSocket on callback changes
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
    onErrorRef.current = onError;
  }, [onMessage, onOpen, onClose, onError]);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
        retryCountRef.current = 0;
        setReconnectCount(0);
        onOpenRef.current?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onMessageRef.current?.(data);
        } catch {
          setLastMessage(event.data);
          onMessageRef.current?.(event.data);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        onCloseRef.current?.();

        // Auto-reconnect with exponential backoff
        if (reconnect && retryCountRef.current < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
          retryCountRef.current += 1;
          setReconnectCount(retryCountRef.current);

          retryTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        onErrorRef.current?.(error);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("WebSocket connection error:", err);
    }
  }, [url, reconnect, maxRetries]);

  useEffect(() => {
    connect();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: string | object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const payload = typeof message === "string" ? message : JSON.stringify(message);
      wsRef.current.send(payload);
    }
  }, []);

  return { sendMessage, isConnected, lastMessage, reconnectCount };
}
