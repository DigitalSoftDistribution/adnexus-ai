import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { BillingContent } from './BillingContent';
import messages from '@/messages/en.json';

const billingInfo = {
  workspaceId: 'ws-1',
  name: 'Acme',
  plan: 'free',
  status: 'active',
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  credits: {
    creativesUsed: 1,
    creativesTotal: 5,
    impressionsUsed: 100,
    impressionsTotal: 1000,
    aiCreditsUsed: 10,
    aiCreditsTotal: 50,
  },
};

const billingPlans = {
  billingEnabled: true,
  stripeConfigured: true,
  plans: [
    {
      plan: 'growth',
      priceId: 'price_growth_test',
      credits: { creatives: 200, impressions: 500000, aiCredits: 5000 },
    },
  ],
  message: null,
};

const billingUsage = {
  workspaceId: 'ws-1',
  plan: 'free',
  period: { start: null, end: null },
  credits: billingInfo.credits,
  detailedBreakdownAvailable: false,
};

function mockBillingFetch(overrides?: {
  usageOk?: boolean;
  usageData?: typeof billingUsage;
}) {
  const usageOk = overrides?.usageOk ?? true;
  const usageData = overrides?.usageData ?? billingUsage;

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === '/api/v2/billing') {
      return { ok: true, json: async () => ({ data: billingInfo }) } as Response;
    }
    if (url === '/api/v2/billing/usage') {
      if (!usageOk) {
        return { ok: false, json: async () => ({}) } as Response;
      }
      return { ok: true, json: async () => ({ data: usageData }) } as Response;
    }
    if (url === '/api/v2/billing/invoices') {
      return { ok: true, json: async () => ({ data: { invoices: [], hasMore: false } }) } as Response;
    }
    if (url === '/api/v2/billing/plans') {
      return { ok: true, json: async () => ({ data: billingPlans }) } as Response;
    }
    if (url === '/api/v2/billing/upgrade' && init?.method === 'POST') {
      return {
        ok: true,
        json: async () => ({
          data: {
            previousPlan: 'free',
            plan: 'growth',
            priceId: 'price_growth_test',
            subscriptionId: null,
            checkoutUrl: 'https://checkout.stripe.com/cs_test',
            effective: 'immediate',
          },
        }),
      } as Response;
    }
    if (url === '/api/v2/billing/downgrade' && init?.method === 'POST') {
      return {
        ok: true,
        json: async () => ({
          data: {
            previousPlan: 'growth',
            plan: 'starter',
            priceId: 'price_starter_test',
            subscriptionId: 'sub_test',
            checkoutUrl: null,
            effective: 'immediate',
          },
        }),
      } as Response;
    }
    return { ok: false, json: async () => ({}) } as Response;
  });
}

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

function renderBilling() {
  return renderWithProviders(<BillingContent />);
}

describe('BillingContent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'location', {
      value: { pathname: '/en/dashboard/billing', search: '', origin: 'https://app.test', href: '' },
      writable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('explains why the billing portal is unavailable for free workspaces', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/v2/billing') {
        return { ok: true, json: async () => ({ data: billingInfo }) } as Response;
      }
      if (url === '/api/v2/billing/usage') {
        return { ok: true, json: async () => ({ data: billingUsage }) } as Response;
      }
      if (url === '/api/v2/billing/plans') {
        return { ok: true, json: async () => ({ data: { ...billingPlans, billingEnabled: false, plans: [] } }) } as Response;
      }
      return { ok: true, json: async () => ({ data: { invoices: [], hasMore: false } }) } as Response;
    }));

    renderBilling();

    expect(await screen.findByText('free Plan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage Subscription' })).toBeDisabled();
    expect(screen.getByText('Billing portal is unavailable until a Stripe customer is connected for this workspace.')).toBeInTheDocument();
  });

  it('shows a retryable invoice error without hiding billing details', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/v2/billing') {
        return { ok: true, json: async () => ({ data: { ...billingInfo, stripeCustomerId: 'cus_123' } }) } as Response;
      }
      if (url === '/api/v2/billing/usage') {
        return { ok: true, json: async () => ({ data: billingUsage }) } as Response;
      }
      if (url === '/api/v2/billing/plans') {
        return { ok: true, json: async () => ({ data: { ...billingPlans, billingEnabled: false, plans: [] } }) } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    }));

    renderBilling();

    expect(await screen.findByText('free Plan')).toBeInTheDocument();
    expect(await screen.findByText('Failed to fetch invoices')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('renders an upgrade CTA and calls the upgrade endpoint for the next plan', async () => {
    vi.stubGlobal('fetch', mockBillingFetch());

    renderBilling();

    const upgradeButton = await screen.findByRole('button', { name: /upgrade to growth/i });
    fireEvent.click(upgradeButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/v2/billing/upgrade',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"plan":"growth"'),
        }),
      );
    });
  });

  it('renders a downgrade action for subscribed paid workspaces', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/v2/billing') {
        return {
          ok: true,
          json: async () => ({
            data: {
              ...billingInfo,
              plan: 'growth',
              stripeCustomerId: 'cus_123',
              stripeSubscriptionId: 'sub_123',
            },
          }),
        } as Response;
      }
      if (url === '/api/v2/billing/usage') {
        return { ok: true, json: async () => ({ data: { ...billingUsage, plan: 'growth' } }) } as Response;
      }
      if (url === '/api/v2/billing/invoices') {
        return { ok: true, json: async () => ({ data: { invoices: [], hasMore: false } }) } as Response;
      }
      if (url === '/api/v2/billing/plans') {
        return {
          ok: true,
          json: async () => ({
            data: {
              ...billingPlans,
              plans: [
                { plan: 'starter', priceId: 'price_starter_test', credits: billingPlans.plans[0].credits },
                billingPlans.plans[0],
              ],
            },
          }),
        } as Response;
      }
      if (url === '/api/v2/billing/downgrade' && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            data: {
              previousPlan: 'growth',
              plan: 'starter',
              priceId: 'price_starter_test',
              subscriptionId: 'sub_123',
              checkoutUrl: null,
              effective: 'immediate',
            },
          }),
        } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    }));

    renderBilling();

    const downgradeButton = await screen.findByRole('button', { name: /downgrade to starter/i });
    fireEvent.click(downgradeButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/v2/billing/downgrade',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"plan":"starter"'),
        }),
      );
    });
  });

  it('does not crash while plans are still loading', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/v2/billing') {
        return { ok: true, json: async () => ({ data: billingInfo }) } as Response;
      }
      if (url === '/api/v2/billing/usage') {
        return { ok: true, json: async () => ({ data: billingUsage }) } as Response;
      }
      if (url === '/api/v2/billing/invoices') {
        return { ok: true, json: async () => ({ data: { invoices: [], hasMore: false } }) } as Response;
      }
      if (url === '/api/v2/billing/plans') {
        return new Promise(() => undefined) as Promise<Response>;
      }
      return { ok: false, json: async () => ({}) } as Response;
    }));

    renderBilling();

    expect(await screen.findByRole('heading', { name: /billing/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /upgrade to/i })).not.toBeInTheDocument();
  });

  it('does not render fake upgrade controls when checkout is disabled', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/v2/billing') {
        return { ok: true, json: async () => ({ data: billingInfo }) } as Response;
      }
      if (url === '/api/v2/billing/usage') {
        return { ok: true, json: async () => ({ data: billingUsage }) } as Response;
      }
      if (url === '/api/v2/billing/invoices') {
        return { ok: true, json: async () => ({ data: { invoices: [], hasMore: false } }) } as Response;
      }
      if (url === '/api/v2/billing/plans') {
        return {
          ok: true,
          json: async () => ({ data: { ...billingPlans, billingEnabled: false, plans: [] } }),
        } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    }));

    renderBilling();

    expect(await screen.findByText('Plan changes are unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /upgrade to/i })).not.toBeInTheDocument();
  });

  it('shows explicit deferral copy when the usage endpoint is unavailable', async () => {
    vi.stubGlobal('fetch', mockBillingFetch({ usageOk: false }));

    renderBilling();

    expect(await screen.findByText(/dedicated usage endpoint is not available yet/i)).toBeInTheDocument();
    expect(screen.getByText('1 / 5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows breakdown deferral when detailed usage is not available yet', async () => {
    vi.stubGlobal('fetch', mockBillingFetch());

    renderBilling();

    expect(await screen.findByText(/per-feature usage breakdown is coming soon/i)).toBeInTheDocument();
  });
});
