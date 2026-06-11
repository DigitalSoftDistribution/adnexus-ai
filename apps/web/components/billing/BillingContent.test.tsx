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
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === '/api/v2/billing') {
          return { ok: true, json: async () => ({ data: billingInfo }) } as Response;
        }
        if (url === '/api/v2/billing/plans') {
          return { ok: true, json: async () => ({ data: { ...billingPlans, billingEnabled: false, plans: [] } }) } as Response;
        }
        return { ok: true, json: async () => ({ data: { invoices: [], hasMore: false } }) } as Response;
      }),
    );

    renderBilling();

    expect(await screen.findByText('free Plan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage Subscription' })).toBeDisabled();
    expect(screen.getByText('Billing portal is unavailable until a Stripe customer is connected for this workspace.')).toBeInTheDocument();
  });

  it('shows a retryable invoice error without hiding billing details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === '/api/v2/billing') {
          return { ok: true, json: async () => ({ data: { ...billingInfo, stripeCustomerId: 'cus_123' } }) } as Response;
        }
        if (url === '/api/v2/billing/plans') {
          return { ok: true, json: async () => ({ data: { ...billingPlans, billingEnabled: false, plans: [] } }) } as Response;
        }
        return { ok: false, json: async () => ({}) } as Response;
      }),
    );

    renderBilling();

    expect(await screen.findByText('free Plan')).toBeInTheDocument();
    expect(await screen.findByText('Failed to fetch invoices')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('renders an upgrade CTA and starts checkout with the configured price id', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/v2/billing') {
        return { ok: true, json: async () => ({ data: billingInfo }) } as Response;
      }
      if (url === '/api/v2/billing/invoices') {
        return { ok: true, json: async () => ({ data: { invoices: [], hasMore: false } }) } as Response;
      }
      if (url === '/api/v2/billing/plans') {
        return { ok: true, json: async () => ({ data: billingPlans }) } as Response;
      }
      if (url === '/api/v2/billing/checkout' && init?.method === 'POST') {
        return { ok: true, json: async () => ({ data: { url: 'https://checkout.stripe.com/cs_test' } }) } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    }));

    renderBilling();

    const upgradeButton = await screen.findByRole('button', { name: /upgrade to growth/i });
    fireEvent.click(upgradeButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/v2/billing/checkout',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('price_growth_test'),
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

  it('shows a retryable billing error when the workspace is unauthorized', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === '/api/v2/billing') {
          return { ok: false, status: 401, json: async () => ({ error: { message: 'Unauthorized' } }) } as Response;
        }
        return { ok: false, json: async () => ({}) } as Response;
      }),
    );

    renderBilling();

    expect(await screen.findByText('Failed to fetch billing info')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByText('free Plan')).not.toBeInTheDocument();
  });
});
