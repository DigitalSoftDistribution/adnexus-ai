'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface SSEEvent {
  type: string;
  workspaceId: string;
  data: unknown;
  timestamp: string;
}

export function useSSE(enabled: boolean = true) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const sseEvent: SSEEvent = JSON.parse(event.data);

      // Invalidate relevant queries based on event type
      switch (sseEvent.type) {
        case 'campaign.created':
        case 'campaign.updated':
        case 'campaign.deleted':
        case 'campaign.status_changed':
          queryClient.invalidateQueries({ queryKey: ['campaigns', 'list'] });
          queryClient.invalidateQueries({ queryKey: ['campaigns', 'summary'] });
          if (sseEvent.data && typeof sseEvent.data === 'object' && 'campaignId' in sseEvent.data) {
            queryClient.invalidateQueries({ queryKey: ['campaign', (sseEvent.data as Record<string, string>).campaignId] });
          }
          break;

        case 'draft.created':
        case 'draft.approved':
        case 'draft.rejected':
        case 'draft.executed':
          queryClient.invalidateQueries({ queryKey: ['drafts', 'list'] });
          break;

        case 'ad.created':
        case 'ad.updated':
          queryClient.invalidateQueries({ queryKey: ['ads'] });
          break;

        case 'billing.updated':
          queryClient.invalidateQueries({ queryKey: ['billing'] });
          break;

        case 'agent.recommendation':
          queryClient.invalidateQueries({ queryKey: ['agent', 'recommendations'] });
          queryClient.invalidateQueries({ queryKey: ['agent', 'status'] });
          break;

        default:
          // Unknown event type — invalidate all dashboard data
          queryClient.invalidateQueries({ queryKey: ['campaigns'] });
          queryClient.invalidateQueries({ queryKey: ['drafts'] });
          break;
      }
    } catch {
      // Ignore malformed events
    }
  }, [queryClient]);

  useEffect(() => {
    if (!enabled) return;

    // Get auth token for SSE connection
    const token = localStorage.getItem('adnexus_token');
    const url = new URL('/api/v2/events', window.location.origin);
    if (token) {
      url.searchParams.set('token', token);
    }

    const es = new EventSource(url.toString());
    eventSourceRef.current = es;

    es.onmessage = handleMessage;

    es.onerror = () => {
      // Auto-reconnect is handled by EventSource
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [enabled, handleMessage]);

  return { isConnected: !!eventSourceRef.current };
}
