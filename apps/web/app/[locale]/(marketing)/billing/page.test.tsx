import { describe, it, expect, vi, beforeEach } from 'vitest';

const redirect = vi.fn();

vi.mock('next/navigation', () => ({
  redirect,
}));

describe('MarketingBillingPage auth gate', () => {
  beforeEach(() => {
    redirect.mockReset();
    redirect.mockImplementation((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    });
  });

  it('redirects unauthenticated visitors to locale-aware sign-in', async () => {
    const { default: MarketingBillingPage } = await import('./page');

    await expect(
      MarketingBillingPage({ params: Promise.resolve({ locale: 'en' }) }),
    ).rejects.toThrow('NEXT_REDIRECT:/en/auth/signin');

    expect(redirect).toHaveBeenCalledWith('/en/auth/signin');
  });

  it('preserves non-default locale in the redirect target', async () => {
    const { default: MarketingBillingPage } = await import('./page');

    await expect(
      MarketingBillingPage({ params: Promise.resolve({ locale: 'de' }) }),
    ).rejects.toThrow('NEXT_REDIRECT:/de/auth/signin');

    expect(redirect).toHaveBeenCalledWith('/de/auth/signin');
  });
});
