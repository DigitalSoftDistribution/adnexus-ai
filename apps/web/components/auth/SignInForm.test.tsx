import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { SignInForm } from './SignInForm';
import messages from '@/messages/en.json';

const push = vi.fn();
const refresh = vi.fn();

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
  useRouter: () => ({ push, refresh }),
}));

function renderForm() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SignInForm />
    </NextIntlClientProvider>,
  );
}

describe('SignInForm', () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('routes users without completed onboarding to onboarding', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { token: 'token-123', user: { onboardingCompleted: false } } }),
    }));

    renderForm();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'pilot@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/onboarding'));
    expect(push).not.toHaveBeenCalledWith('/dashboard');
    expect(localStorage.getItem('adnexus_token')).toBe('token-123');
  });

  it('routes returning users with completed onboarding to dashboard', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { token: 'token-456', user: { onboardingCompleted: true } } }),
    }));

    renderForm();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'returning@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
    expect(push).not.toHaveBeenCalledWith('/onboarding');
    expect(localStorage.getItem('adnexus_token')).toBe('token-456');
  });
});
