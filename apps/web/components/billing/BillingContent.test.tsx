import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { BillingContent } from './BillingContent';
import messages from '@/messages/en.json';

const billing = {
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

describe('BillingContent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('explains why the billing portal is unavailable for free workspaces', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/api/v2/billing') {
          return { ok: true, json: async () => ({ data: billing }) };
        }

        return { ok: true, json: async () => ({ data: { invoices: [], hasMore: false } }) };
      }),
    );

    renderWithProviders(<BillingContent />);

    expect(await screen.findByText('free Plan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage Subscription' })).toBeDisabled();
    expect(screen.getByText('Billing portal is unavailable until a Stripe customer is connected for this workspace.')).toBeInTheDocument();
  });

  it('shows a retryable invoice error without hiding billing details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/api/v2/billing') {
          return { ok: true, json: async () => ({ data: { ...billing, stripeCustomerId: 'cus_123' } }) };
        }

        return { ok: false, json: async () => ({}) };
      }),
    );

    renderWithProviders(<BillingContent />);

    expect(await screen.findByText('free Plan')).toBeInTheDocument();
    expect(await screen.findByText('Failed to fetch invoices')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
