import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { IntegrationsContent } from './IntegrationsContent';
import messages from '@/messages/en.json';

const { searchParamsRef } = vi.hoisted(() => ({
  searchParamsRef: { current: new URLSearchParams() },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParamsRef.current,
}));

function renderWithQuery(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

const mockIntegrations = [
  {
    platform: 'meta',
    label: 'Meta Ads',
    connected: true,
    status: 'ACTIVE',
    id: 'acc-1',
    accountId: 'act_123',
    accountName: 'Test Account',
    lastSyncedAt: '2026-06-01T12:00:00Z',
    connectUrl: '/api/v2/auth/meta',
  },
  {
    platform: 'google',
    label: 'Google Ads',
    connected: false,
    status: 'DISCONNECTED',
    id: null,
    accountId: null,
    accountName: null,
    lastSyncedAt: null,
    connectUrl: '/api/v2/auth/google',
  },
  {
    platform: 'tiktok',
    label: 'TikTok Ads',
    connected: false,
    status: 'disconnected',
    id: null,
    accountId: null,
    accountName: null,
    lastSyncedAt: null,
    connectUrl: '/api/v1/auth/tiktok/connect',
    capability: {
      status: 'mock_ready',
      canConnectOAuth: false,
      canSyncCampaigns: false,
      dashboardReady: false,
      mcpReady: false,
      mockSyncReady: true,
      reason: 'TikTok route/client stubs exist, but live sync is not complete.',
      remainingWork: ['confirm OAuth scopes', 'wire live sync mappings'],
    },
  },
];

describe('IntegrationsContent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    searchParamsRef.current = new URLSearchParams();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renders connected and disconnected integrations', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockIntegrations }),
      }),
    );

    renderWithQuery(<IntegrationsContent />);

    expect(await screen.findByText('Meta Ads')).toBeInTheDocument();
    expect(screen.getByText('Google Ads')).toBeInTheDocument();
    expect(screen.getByText('Test Account')).toBeInTheDocument();
    expect(screen.getAllByText('Mock-ready only')).toHaveLength(2);
    expect(screen.getByText('TikTok route/client stubs exist, but live sync is not complete.')).toBeInTheDocument();
    // The badge uses tc('active') which maps to "Active" in en.json
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows error state when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    );

    renderWithQuery(<IntegrationsContent />);

    // The error state shows tc('error') = "Something went wrong" + error message
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Failed to load integrations')).toBeInTheDocument();
  });

  it('calls the integrations v2 endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockIntegrations }),
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithQuery(<IntegrationsContent />);
    await screen.findByText('Meta Ads');

    expect(fetchMock).toHaveBeenCalledWith('/api/v2/integrations');
  });

  it('surfaces OAuth callback errors from query params', async () => {
    searchParamsRef.current = new URLSearchParams('status=error&platform=meta&reason=access_denied');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: mockIntegrations.filter((integration) => !integration.connected),
        }),
      }),
    );

    renderWithQuery(<IntegrationsContent />);

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      expect(alerts.some((alert) => alert.textContent?.includes('meta:error (access_denied)'))).toBe(true);
    });
    expect(screen.getAllByText(/Connection needs attention/).length).toBeGreaterThanOrEqual(1);
  });

  it('starts OAuth connect for a disconnected platform', async () => {
    const disconnectedMeta = [
      {
        platform: 'meta',
        label: 'Meta Ads',
        connected: false,
        status: 'DISCONNECTED',
        id: null,
        accountId: null,
        accountName: null,
        lastSyncedAt: null,
        connectUrl: '/api/v2/auth/meta',
      },
    ];

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/v2/integrations') {
        return { ok: true, json: async () => ({ data: disconnectedMeta }) } as Response;
      }
      if (url === '/api/v2/auth/meta' && init?.headers) {
        return {
          ok: true,
          json: async () => ({ data: { redirectUrl: 'https://facebook.com/oauth' } }),
        } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });

    renderWithQuery(<IntegrationsContent />);

    fireEvent.click(await screen.findByRole('button', { name: 'Connect' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v2/auth/meta',
        expect.objectContaining({ headers: { Accept: 'application/json' } }),
      );
    });
    expect(window.location.href).toBe('https://facebook.com/oauth');
  });

  it('renders a Disconnect button and sync controls for connected platforms', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === '/api/v2/integrations') {
          return {
            ok: true,
            json: async () => ({ data: mockIntegrations }),
          } as Response;
        }
        if (url.includes('/api/v2/integrations/accounts/acc-1/sync-jobs')) {
          return { ok: true, json: async () => ({ data: [] }) } as Response;
        }
        return { ok: false, json: async () => ({}) } as Response;
      }),
    );

    renderWithQuery(<IntegrationsContent />);

    // Connected Meta Ads card shows Disconnect + Sync controls
    expect(await screen.findByText('Meta Ads')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sync now' })).toBeInTheDocument();
    // Last synced text is visible
    expect(screen.getByText(/Last synced:/)).toBeInTheDocument();
  });
});
