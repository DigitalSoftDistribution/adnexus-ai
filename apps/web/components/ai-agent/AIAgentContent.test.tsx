import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { AIAgentContent } from './AIAgentContent';
import messages from '@/messages/en.json';

const status = {
  isRunning: true,
  rulesActive: 2,
  optimizationsToday: 0,
  creditsUsed: 10,
  creditsTotal: 100,
  lastRunAt: null,
  nextRunAt: null,
};

function renderWithQuery(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

describe('AIAgentContent', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it('shows a draft-first empty state with real setup CTAs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/api/v2/agent/status') return { ok: true, json: async () => ({ data: status }) };
        if (url === '/api/v2/agent/recommendations') return { ok: true, json: async () => ({ data: [] }) };
        return { ok: true, json: async () => ({ data: [] }) };
      }),
    );

    renderWithQuery(<AIAgentContent />);

    expect(await screen.findByText('Draft-first guardrail is on')).toBeInTheDocument();
    expect(screen.getByText('No recommendations available')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /connect platform/i })).toHaveAttribute(
      'href',
      '/en/dashboard/integrations',
    );
    expect(screen.getByRole('link', { name: /define goals/i })).toHaveAttribute(
      'href',
      '/en/dashboard/goals',
    );
  });

  it('drafts recommendations instead of implying direct publish', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/v2/agent/status') return { ok: true, json: async () => ({ data: status }) };
      if (url === '/api/v2/agent/recommendations') {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'rec-1',
                type: 'budget_shift',
                title: 'Shift budget to Meta prospecting',
                description: 'Move budget toward the campaign with stronger ROAS.',
                campaignId: 'camp-1',
                platform: 'meta',
                estimatedImpact: '+12% ROAS',
                confidence: 'high',
                priority: 1,
                status: 'pending',
                reasoning: 'Recent conversion efficiency is higher than baseline.',
                createdAt: '2026-06-07T00:00:00.000Z',
                expiresAt: null,
                appliedDraftId: null,
              },
            ],
          }),
        };
      }
      if (url === '/api/v2/agent/recommendations/rec-1/apply' && init?.method === 'POST') {
        return { ok: true, json: async () => ({ data: { draftId: 'draft-1' } }) };
      }
      return { ok: true, json: async () => ({ data: [] }) };
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithQuery(<AIAgentContent />);

    const draftButton = await screen.findByRole('button', { name: /draft for approval/i });
    await userEvent.click(draftButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/v2/agent/recommendations/rec-1/apply', {
        method: 'POST',
      });
    });
  });

  it('sends chat messages via conversation API', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/v2/agent/status') return { ok: true, json: async () => ({ data: status }) };
      if (url === '/api/v2/agent/recommendations') return { ok: true, json: async () => ({ data: [] }) };
      if (url === '/api/v2/agent/conversations' && !init?.method) {
        return { ok: true, json: async () => ({ data: [] }) };
      }
      if (url === '/api/v2/agent/conversations' && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            data: {
              id: 'conv-1',
              title: 'New conversation',
              createdAt: '2026-06-13T00:00:00.000Z',
              updatedAt: '2026-06-13T00:00:00.000Z',
            },
          }),
        };
      }
      if (url === '/api/v2/agent/conversations/conv-1' && !init?.method) {
        return { ok: true, json: async () => ({ data: { conversation: { id: 'conv-1' }, messages: [] } }) };
      }
      if (url === '/api/v2/agent/conversations/conv-1/messages' && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            data: [
              { id: 'msg-1', role: 'user', content: 'What should I optimize?', createdAt: '2026-06-13T00:00:00.000Z' },
              {
                id: 'msg-2',
                role: 'assistant',
                content: 'Open the Recommendations tab to apply any of these as a draft.',
                createdAt: '2026-06-13T00:00:01.000Z',
              },
            ],
          }),
        };
      }
      return { ok: true, json: async () => ({ data: [] }) };
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithQuery(<AIAgentContent />);

    await userEvent.click(await screen.findByRole('tab', { name: /chat/i }));

    const input = await screen.findByPlaceholderText(/ask the operator/i);
    await userEvent.type(input, 'What should I optimize?');
    await userEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v2/agent/conversations/conv-1/messages',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: 'What should I optimize?' }),
        }),
      );
    });

    expect(await screen.findByText(/open the recommendations tab/i)).toBeInTheDocument();
    expect(screen.getByText(/chat is advisory only/i)).toBeInTheDocument();
  });
});
