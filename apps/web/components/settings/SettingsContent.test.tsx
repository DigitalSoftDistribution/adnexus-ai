import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { SettingsContent } from './SettingsContent';
import messages from '@/messages/en.json';

const workspace = {
  id: 'ws-1',
  name: 'Acme',
  slug: 'acme',
  plan: 'free',
  branding: null,
  settings: null,
};

const notifications = {
  email: { campaignAlerts: true, budgetAlerts: true, dailyDigest: false, weeklyReport: true, teamActivity: true, productUpdates: true },
  inApp: { campaignAlerts: true, budgetAlerts: true, aiRecommendations: true, teamActivity: true },
  slack: { enabled: false, webhookUrl: null, channel: null },
};

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

function mockSettingsFetch(overrides: Record<string, unknown> = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === '/api/v2/settings/workspace') return { ok: true, json: async () => ({ data: workspace }) } as Response;
    if (url === '/api/v2/settings/team' && !init) return { ok: true, json: async () => ({ data: [] }) } as Response;
    if (url === '/api/v2/settings/team' && init?.method === 'POST') {
      return { ok: true, json: async () => ({ data: { id: 'invite-1', email: 'teammate@example.com', role: 'viewer' } }) } as Response;
    }
    if (url === '/api/v2/settings/integrations') return { ok: true, json: async () => ({ data: [] }) } as Response;
    if (url === '/api/v2/settings/notifications') return { ok: true, json: async () => ({ data: notifications }) } as Response;
    if (url === '/api/v2/settings/api-keys' && !init) return { ok: true, json: async () => ({ data: [] }) } as Response;
    if (url === '/api/v2/settings/api-keys' && init?.method === 'POST') {
      return { ok: true, json: async () => ({ data: { fullKey: 'adnx_live_secret' } }) } as Response;
    }

    return { ok: true, json: async () => ({ data: overrides[url] ?? [] }) } as Response;
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('SettingsContent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens the team invite modal and submits to the invite API', async () => {
    const fetchMock = mockSettingsFetch();
    const user = userEvent.setup();
    renderWithProviders(<SettingsContent />);

    await user.click(await screen.findByRole('tab', { name: 'Team' }));
    await user.click(screen.getByRole('button', { name: 'Invite Member' }));
    await user.type(screen.getByLabelText('Email address'), 'teammate@example.com');
    await user.click(screen.getByRole('button', { name: 'Invite' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v2/settings/team',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'teammate@example.com', role: 'viewer' }),
        }),
      );
    });
    expect(await screen.findByText('Invitation created and the team list has been refreshed.')).toBeInTheDocument();
  });

  it('shows the one-time API key with a clear copy warning after generation', async () => {
    mockSettingsFetch();

    const user = userEvent.setup();
    renderWithProviders(<SettingsContent />);

    await user.click(await screen.findByRole('tab', { name: 'API Keys' }));
    await user.type(screen.getByPlaceholderText('Key name'), 'Reporting');
    await user.click(screen.getByRole('button', { name: 'Generate' }));

    expect(await screen.findByText('adnx_live_secret')).toBeInTheDocument();
    expect(screen.getByText('This is the only time the full key will be shown.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy key' })).toBeInTheDocument();
  });

  it('loads workspace name and plan on the default workspace tab', async () => {
    mockSettingsFetch();
    renderWithProviders(<SettingsContent />);

    expect(await screen.findByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Slug: acme')).toBeInTheDocument();
    expect(screen.getAllByText('free').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('tab', { name: 'Workspace' })).toHaveAttribute('data-state', 'active');
  });

  it('shows a retryable team error without breaking other tabs', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/v2/settings/workspace') return { ok: true, json: async () => ({ data: workspace }) } as Response;
      if (url === '/api/v2/settings/team' && !init) {
        return { ok: false, json: async () => ({ error: { message: 'Forbidden' } }) } as Response;
      }
      if (url === '/api/v2/settings/integrations') return { ok: true, json: async () => ({ data: [] }) } as Response;
      if (url === '/api/v2/settings/notifications') return { ok: true, json: async () => ({ data: notifications }) } as Response;
      if (url === '/api/v2/settings/api-keys' && !init) return { ok: true, json: async () => ({ data: [] }) } as Response;
      return { ok: true, json: async () => ({ data: [] }) } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    renderWithProviders(<SettingsContent />);

    await user.click(await screen.findByRole('tab', { name: 'Team' }));

    expect(await screen.findByText('Failed to fetch team')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('renders notification preference toggles on the notifications tab', async () => {
    mockSettingsFetch();
    const user = userEvent.setup();
    renderWithProviders(<SettingsContent />);

    await user.click(await screen.findByRole('tab', { name: 'Notifications' }));

    expect(await screen.findByText('Campaign Alerts')).toBeInTheDocument();
    expect(screen.getByText('AI Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Weekly Summary')).toBeInTheDocument();
  });

  it('renders connected integrations on the integrations tab', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/v2/settings/workspace') return { ok: true, json: async () => ({ data: workspace }) } as Response;
      if (url === '/api/v2/settings/team' && !init) return { ok: true, json: async () => ({ data: [] }) } as Response;
      if (url === '/api/v2/settings/integrations') return {
        ok: true,
        json: async () => ({
          data: [
            { id: 'int-1', platform: 'meta', name: 'Meta Ads', status: 'connected', accountId: 'act_123', accountName: 'Test Ads Account', connectedAt: '2026-01-01T00:00:00Z', lastSyncedAt: '2026-06-01T12:00:00Z' },
            { id: 'int-2', platform: 'google', name: 'Google Ads', status: 'disconnected', accountId: null, accountName: null, connectedAt: null, lastSyncedAt: null },
          ],
        }),
      } as Response;
      if (url === '/api/v2/settings/notifications') return { ok: true, json: async () => ({ data: notifications }) } as Response;
      if (url === '/api/v2/settings/api-keys' && !init) return { ok: true, json: async () => ({ data: [] }) } as Response;
      return { ok: true, json: async () => ({ data: [] }) } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    renderWithProviders(<SettingsContent />);

    await user.click(await screen.findByRole('tab', { name: 'Integrations' }));

    expect(await screen.findByText('Meta Ads')).toBeInTheDocument();
    expect(screen.getByText('Account: Test Ads Account')).toBeInTheDocument();
    expect(screen.getByText('connected')).toBeInTheDocument();
    expect(screen.getByText('Google Ads')).toBeInTheDocument();
    expect(screen.getByText('disconnected')).toBeInTheDocument();
  });

  it('saves workspace name after inline edit', async () => {
    const fetchMock = mockSettingsFetch();
    const user = userEvent.setup();
    renderWithProviders(<SettingsContent />);

    // Default workspace tab — find the Edit button
    expect(await screen.findByText('Acme')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    // Clear and retype
    const input = screen.getByDisplayValue('Acme');
    await user.clear(input);
    await user.type(input, 'Acme Corp');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v2/settings/workspace',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Acme Corp' }),
        }),
      );
    });
  });
});
