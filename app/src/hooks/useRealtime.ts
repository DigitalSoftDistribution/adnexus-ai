import { useEffect, useRef, useState, useCallback } from 'react';
import { createSSEConnection } from '../lib/api';
import type { ApiSSEEvent } from '../lib/api';
import { useDraftStore } from '../stores/draftStore';
import { useNotificationStore } from '../stores/notificationStore';

/** Event types that the real-time system can handle */
export type RealtimeEventType =
  | 'draft.created'
  | 'draft.approved'
  | 'draft.rejected'
  | 'campaign.updated'
  | 'metrics.updated'
  | 'alert.triggered'
  | 'ai.recommendation'
  | 'notification.created'
  | 'notification.read'
  | 'notification.read-all'
  | 'notification.deleted';

/** A normalized real-time event */
export interface RealtimeEvent {
  type: RealtimeEventType | string;
  payload: unknown;
  timestamp: string;
}

/** Return type for the useRealtime hook */
export interface UseRealtimeReturn {
  /** Latest event received */
  lastEvent: RealtimeEvent | null;
  /** Whether the SSE connection is active */
  connected: boolean;
  /** Connection error if any */
  error: string | null;
  /** Manually reconnect */
  reconnect: () => void;
  /** Manually disconnect */
  disconnect: () => void;
  /** Connection state */
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  /** Events received (for debugging) */
  events: RealtimeEvent[];
}

/**
 * Custom hook for SSE (Server-Sent Events) connection.
 *
 * Features:
 * - Auto-connects on mount
 * - Auto-reconnect with exponential backoff
 * - Subscribes to workspace-level events
 * - Integrates with draftStore and notificationStore for automatic cache invalidation
 * - Returns latest event, connection status, and error state
 *
 * @param options - Configuration options
 * @returns {UseRealtimeReturn} Real-time connection state and controls
 */
export function useRealtime(options: { enabled?: boolean } = {}): UseRealtimeReturn {
  const { enabled = true } = options;

  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [events, setEvents] = useState<RealtimeEvent[]>([]);

  const esRef = useRef<EventSource | null>(null);
  const draftHandleRealtimeEvent = useDraftStore((s) => s.handleRealtimeEvent);
  const notificationHandleRealtimeEvent = useNotificationStore((s) => s.handleRealtimeEvent);

  const cleanup = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    cleanup();
    if (!enabled) return;

    setConnectionState('connecting');
    setError(null);

    const es = createSSEConnection('/events/workspace', {
      onConnect: () => {
        setConnected(true);
        setConnectionState('connected');
        setError(null);
      },
      onDisconnect: () => {
        setConnected(false);
        setConnectionState('disconnected');
      },
      onMessage: (sseEvent: ApiSSEEvent) => {
        const event: RealtimeEvent = {
          type: sseEvent.type,
          payload: sseEvent.payload,
          timestamp: sseEvent.timestamp,
        };

        setLastEvent(event);
        setEvents((prev) => [event, ...prev].slice(0, 100)); // Keep last 100 events

        // Route events to appropriate stores for cache invalidation
        switch (sseEvent.type) {
          case 'draft.created':
          case 'draft.approved':
          case 'draft.rejected': {
            draftHandleRealtimeEvent(sseEvent);
            break;
          }
          case 'notification.created':
          case 'notification.read':
          case 'notification.read-all':
          case 'notification.deleted': {
            notificationHandleRealtimeEvent(sseEvent);
            break;
          }
          case 'campaign.updated': {
            // Invalidate campaign queries
            window.dispatchEvent(new CustomEvent('invalidate:campaigns', { detail: sseEvent.payload }));
            draftHandleRealtimeEvent(sseEvent);
            break;
          }
          case 'metrics.updated': {
            // Invalidate dashboard queries
            window.dispatchEvent(new CustomEvent('invalidate:dashboard', { detail: sseEvent.payload }));
            draftHandleRealtimeEvent(sseEvent);
            break;
          }
          case 'alert.triggered': {
            draftHandleRealtimeEvent(sseEvent);
            break;
          }
          case 'ai.recommendation': {
            draftHandleRealtimeEvent(sseEvent);
            break;
          }
          default:
            break;
        }
      },
      onError: (err: Event) => {
        setConnected(false);
        setConnectionState('error');
        setError('SSE connection failed. Retrying...');
      },
      autoReconnect: true,
      reconnectDelayMs: 1000,
      maxReconnectDelayMs: 30000,
    });

    esRef.current = es;
  }, [enabled, cleanup, draftHandleRealtimeEvent, notificationHandleRealtimeEvent]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (enabled) {
      connect();
    }
    return () => {
      cleanup();
    };
  }, [enabled, connect, cleanup]);

  const reconnect = useCallback(() => {
    connect();
  }, [connect]);

  const disconnect = useCallback(() => {
    cleanup();
    setConnected(false);
    setConnectionState('disconnected');
  }, [cleanup]);

  return {
    lastEvent,
    connected,
    error,
    reconnect,
    disconnect,
    connectionState,
    events,
  };
}

export default useRealtime;
