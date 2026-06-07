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
});
