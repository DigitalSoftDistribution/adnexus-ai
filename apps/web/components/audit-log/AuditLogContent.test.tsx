import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { AuditLogContent } from './AuditLogContent';
import messages from '@/messages/en.json';

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

describe('AuditLogContent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the audit log and renders normalized v2 entries', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            entries: [
              {
                id: 'log-1',
                actorName: 'Ada Lovelace',
                action: 'api_key.created',
                actionCategory: 'api_key',
                entityType: 'api_key',
                createdAt: '2026-06-01T00:00:00Z',
              },
            ],
          },
        }),
      }),
    );

    renderWithProviders(<AuditLogContent />);

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('api_key.created')).toBeInTheDocument();
    expect(screen.getAllByText('api_key').length).toBeGreaterThan(0);
  });

  it('applies audit filters to the v2 list endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { entries: [] } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    renderWithProviders(<AuditLogContent />);

    await screen.findByText('No activity yet');
    await user.type(screen.getByLabelText('Category'), 'api_key');
    await user.type(screen.getByLabelText('Entity'), 'api_key');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(await screen.findByText('No matching activity')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/v2/audit-log?actionCategory=api_key&entityType=api_key');
  });
});
