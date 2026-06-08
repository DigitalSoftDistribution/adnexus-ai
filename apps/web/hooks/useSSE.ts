'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
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
  const [isConnected, setIsConnected] = useState(false);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const sseEvent: SSEEvent = JSON.parse(event.data);

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

    const token = localStorage.getItem('adnexus_token');
    if (!token) return;

    // Use short-lived SSE token instead of main auth token in URL (C7 fix)
    let cancelled = false;
    let es: EventSource | null = null;

    fetch('/api/v2/events/connect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const sseToken = data?.sseToken ?? data?.token;
        if (!sseToken || cancelled) return;

        const url = new URL('/api/v2/events', window.location.origin);
        url.searchParams.set('token', sseToken);
        es = new EventSource(url.toString());
        eventSourceRef.current = es;

        es.onopen = () => setIsConnected(true);
        es.onmessage = handleMessage;
        es.onerror = () => setIsConnected(false);
      })
      .catch(() => {
        // SSE connect failed
      });

    return () => {
      cancelled = true;
      es?.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [enabled, handleMessage]);

  return { isConnected };
}
