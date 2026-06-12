import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { CampaignsContent } from './CampaignsContent';
import messages from '@/messages/en.json';

const campaigns = [
  {
    id: 'camp-1',
    name: 'Summer Sale',
    platform: 'meta',
    status: 'active',
    objective: 'CONVERSIONS',
    spend: 1000,
    impressions: 50000,
    clicks: 1200,
    ctr: 2.4,
    conversions: 80,
    startDate: '2026-06-01',
    endDate: null,
  },
  {
    id: 'camp-2',
    name: 'Brand Awareness',
    platform: 'google',
    status: 'paused',
    objective: 'AWARENESS',
    spend: 500,
    impressions: 30000,
    clicks: 400,
    ctr: 1.33,
    conversions: 10,
    startDate: '2026-05-01',
    endDate: '2026-05-31',
  },
];

function renderWithQuery(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

describe('CampaignsContent', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it('renders campaign rows from the v2 {data:{campaigns}} envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { campaigns, total: campaigns.length } }),
      }),
    );

    renderWithQuery(<CampaignsContent />);

    expect(await screen.findByText('Summer Sale')).toBeInTheDocument();
    expect(screen.getByText('Brand Awareness')).toBeInTheDocument();
    expect(screen.getByText('2.40%')).toBeInTheDocument();
    expect(screen.getByText('1.33%')).toBeInTheDocument();
    // The "New Campaign" CTA links to the create page.
    const newLink = screen.getByRole('link', { name: /new campaign/i });
    // The locale-aware Link prepends the active locale prefix.
    expect(newLink).toHaveAttribute('href', '/en/dashboard/campaigns/new');
  });

  it('shows an error state with retry when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    );

    renderWithQuery(<CampaignsContent />);

    // common.error title + campaigns.failedToFetch description
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch campaigns')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('requests the v2 campaigns endpoint with pagination params', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { campaigns: [], total: 0 } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithQuery(<CampaignsContent />);
    // Wait for the heading so the query has settled.
    await screen.findByText('Campaigns');

    const calledUrl = (fetchMock.mock.calls[0]?.[0] ?? '') as string;
    expect(calledUrl).toContain('/api/v2/campaigns?');
    expect(calledUrl).toContain('page=1');
    expect(calledUrl).toContain('limit=20');
  });
});
