import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { DashboardContent } from './DashboardContent';

// useSSE pulls in EventSource/WebSocket plumbing we don't want in jsdom.
vi.mock('@/hooks/useSSE', () => ({
  useSSE: () => ({ isConnected: true }),
}));

const summary = {
  totalCampaigns: 12,
  activeCount: 8,
  pausedCount: 4,
  totalSpend: 12345.67,
  totalImpressions: 1000000,
  totalClicks: 25000,
  totalConversions: 1200,
  avgCtr: 0.025,
  avgCpa: 10.29,
  avgRoas: 3.4,
  platformBreakdown: { meta: 7, google: 5 },
  statusBreakdown: { active: 8, paused: 4 },
};

function renderWithQuery(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('DashboardContent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders KPI cards once the summary loads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: summary }),
      }),
    );

    renderWithQuery(<DashboardContent />);

    expect(await screen.findByText('Total Spend')).toBeInTheDocument();
    expect(screen.getByText('Impressions')).toBeInTheDocument();
    expect(screen.getByText('Conversions')).toBeInTheDocument();
    // Platform breakdown is rendered from the response.
    expect(screen.getByText('meta')).toBeInTheDocument();
    expect(screen.getByText('google')).toBeInTheDocument();
    // ROAS is formatted with an 'x' suffix.
    expect(screen.getByText('3.40x')).toBeInTheDocument();
  });

  it('hits the v2 summary endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: summary }),
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithQuery(<DashboardContent />);
    await screen.findByText('Total Spend');

    expect(fetchMock).toHaveBeenCalledWith('/api/v2/campaigns/summary');
  });

  it('shows an error state when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    );

    renderWithQuery(<DashboardContent />);

    expect(await screen.findByText('Failed to load dashboard')).toBeInTheDocument();
  });
});
