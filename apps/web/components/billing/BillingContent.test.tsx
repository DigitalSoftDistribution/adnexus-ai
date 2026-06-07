import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { BillingContent } from './BillingContent';
import messages from '@/messages/en.json';

function renderBilling() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <QueryClientProvider client={queryClient}>
        <BillingContent />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

const billingInfo = {
  workspaceId: 'ws-1',
  name: 'Acme',
  plan: 'free',
  status: 'inactive',
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  credits: {
    creativesUsed: 0,
    creativesTotal: 5,
    impressionsUsed: 0,
    impressionsTotal: 1000,
    aiCreditsUsed: 0,
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

describe('BillingContent checkout readiness', () => {
  beforeEach(() => {
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
  });

  afterEach(() => vi.unstubAllGlobals());

  it('renders an upgrade CTA and starts checkout with the configured price id', async () => {
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

    expect(await screen.findByText('Current Plan')).toBeInTheDocument();
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
});
