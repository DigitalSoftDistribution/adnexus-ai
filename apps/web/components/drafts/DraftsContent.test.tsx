import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { DraftsContent } from './DraftsContent';
import messages from '@/messages/en.json';

function renderWithQuery(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <NextIntlClientProvider locale="de" messages={messages}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

describe('DraftsContent', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('separates reviewed approval from live execution copy', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          drafts: [
            { id: 'draft-pending', changeSummary: 'Raise Meta budget by 10%', draftType: 'budget_change', status: 'pending', actorType: 'ai', actorName: null, campaignName: 'Prospecting', createdAt: '2026-06-01T12:00:00Z' },
            { id: 'draft-approved', changeSummary: 'Pause fatigued ad set', draftType: 'status_change', status: 'approved', actorType: 'ai', actorName: null, campaignName: 'Retargeting', createdAt: '2026-06-02T12:00:00Z' },
          ],
        },
      }),
    }));

    renderWithQuery(<DraftsContent />);

    expect(await screen.findByText('Raise Meta budget by 10%')).toBeInTheDocument();
    expect(screen.getAllByText(/Platform execution is disabled for the v1 pilot/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /mark reviewed/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve & execute/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /execution disabled/i })).toBeDisabled();
    expect(screen.getByText('1. Juni 2026')).toBeInTheDocument();
  });
});
