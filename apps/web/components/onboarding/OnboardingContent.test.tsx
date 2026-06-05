import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
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

describe('OnboardingContent', () => {
  beforeEach(() => {
    replace.mockReset();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('redirects completed onboarding users to dashboard', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          completed: true,
          completedAt: '2026-06-01T12:00:00Z',
          currentStep: null,
          steps: { connectPlatform: true, inviteTeam: true, firstCampaign: true },
        },
      }),
    }));

    renderOnboarding();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
  });
});
