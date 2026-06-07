import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/v2/settings/workspace') return { ok: true, json: async () => ({ data: workspace }) };
    if (url === '/api/v2/settings/team') return { ok: true, json: async () => ({ data: [] }) };
    if (url === '/api/v2/settings/integrations') return { ok: true, json: async () => ({ data: [] }) };
    if (url === '/api/v2/settings/notifications') return { ok: true, json: async () => ({ data: notifications }) };
    if (url === '/api/v2/settings/api-keys' && !init) return { ok: true, json: async () => ({ data: [] }) };
    if (url === '/api/v2/settings/api-keys' && init?.method === 'POST') {
      return { ok: true, json: async () => ({ data: { fullKey: 'adnx_live_secret' } }) };
    }

    return { ok: true, json: async () => ({ data: overrides[url] ?? [] }) };
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

  it('marks invite as temporarily unavailable instead of leaving an inert action', async () => {
    mockSettingsFetch();
    const user = userEvent.setup();
    renderWithProviders(<SettingsContent />);

    await user.click(await screen.findByRole('tab', { name: 'Team' }));

    expect(screen.getByRole('button', { name: 'Invite Member' })).toBeDisabled();
    expect(screen.getByText('Team invites are temporarily disabled while the invite flow is being finalized.')).toBeInTheDocument();
  });

  it('shows the one-time API key with a clear copy warning after generation', async () => {
    mockSettingsFetch();

    const user = userEvent.setup();
    renderWithProviders(<SettingsContent />);

    await user.click(await screen.findByRole('tab', { name: 'API Keys' }));
    await user.type(screen.getByLabelText('Key name'), 'Reporting');
    await user.click(screen.getByRole('button', { name: 'Generate' }));

    expect(await screen.findByText('adnx_live_secret')).toBeInTheDocument();
    expect(screen.getByText('This is the only time the full key will be shown.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy key' })).toBeInTheDocument();
  });
});
