import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { OnboardingContent } from './OnboardingContent';
import messages from '@/messages/en.json';

const replace = vi.fn();

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
  useRouter: () => ({ push: vi.fn(), replace }),
}));

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { name: 'Returning User' } }),
}));

function renderOnboarding() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <QueryClientProvider client={queryClient}>
        <OnboardingContent />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

const onboardingStatus = (overrides = {}) => ({
  completed: false,
  completedAt: null,
  currentStep: null,
  steps: { connectPlatform: false, inviteTeam: false, firstCampaign: false },
  ...overrides,
});

describe('OnboardingContent', () => {
  beforeEach(() => {
    replace.mockReset();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('redirects completed onboarding users to dashboard', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: onboardingStatus({
          completed: true,
          completedAt: '2026-06-01T12:00:00Z',
          steps: { connectPlatform: true, inviteTeam: true, firstCampaign: true },
        }),
      }),
    }));

    renderOnboarding();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
  });

  it('keeps finish locked until an account is connected and campaigns are synced', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: onboardingStatus() }),
    }));

    renderOnboarding();

    const finish = await screen.findByRole('button', { name: /complete after first sync/i });
    expect(finish).toBeDisabled();
    expect(screen.getByText(/connect an account and sync at least one campaign/i)).toBeInTheDocument();
  });

  it('lets users skip to dashboard without marking onboarding complete', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: onboardingStatus() }),
    });
    vi.stubGlobal('fetch', fetchMock);

    renderOnboarding();

    const skip = await screen.findByRole('link', { name: /skip for now/i });
    expect(skip).toHaveAttribute('href', '/dashboard/campaigns');
    expect(fetchMock).toHaveBeenCalledWith('/api/v2/onboarding');
    expect(fetchMock).not.toHaveBeenCalledWith('/api/v2/onboarding/complete', { method: 'POST' });
  });

  it('persists completion only after first-value prerequisites are met', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/v2/onboarding/complete') {
        return Promise.resolve({ ok: true, json: async () => ({ data: { completed: true } }) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: onboardingStatus({
            steps: { connectPlatform: true, inviteTeam: false, firstCampaign: true },
          }),
        }),
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderOnboarding();

    fireEvent.click(await screen.findByRole('button', { name: /go to dashboard/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v2/onboarding/complete', { method: 'POST' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
  });
});
