import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { ResetPasswordForm } from './ResetPasswordForm';
import messages from '@/messages/en.json';

let searchParams = new URLSearchParams('token=reset-token-123');

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function renderWithI18n(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    searchParams = new URLSearchParams('token=reset-token-123');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders new password and confirm password fields', () => {
    renderWithI18n(<ResetPasswordForm />);

    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
  });

  it('shows the invalid-link state when the token is missing', () => {
    searchParams = new URLSearchParams('');
    renderWithI18n(<ResetPasswordForm />);

    expect(screen.getByText(/invalid or expired link/i)).toBeInTheDocument();
    const requestLink = screen.getByText(/request a new link/i);
    expect(requestLink.closest('a')).toHaveAttribute('href', '/auth/forgot-password');
    expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument();
  });

  describe('client-side validation', () => {
    it('shows validation error for a short password after blur', async () => {
      const user = userEvent.setup();
      renderWithI18n(<ResetPasswordForm />);

      await user.type(screen.getByLabelText(/new password/i), '12345');
      await user.tab();

      expect(await screen.findByText(/at least 8/i)).toBeInTheDocument();
    });

    it('shows validation error when passwords do not match', async () => {
      const user = userEvent.setup();
      renderWithI18n(<ResetPasswordForm />);

      await user.type(screen.getByLabelText(/new password/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password456');
      await user.tab();

      expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
    });

    it('does not submit when validation fails', async () => {
      const user = userEvent.setup();
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      renderWithI18n(<ResetPasswordForm />);

      await user.click(screen.getByRole('button', { name: /reset password/i }));

      const alerts = await screen.findAllByRole('alert');
      expect(alerts.length).toBeGreaterThanOrEqual(2);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  it('posts the token and new password and shows the success state', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { message: 'ok' } }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    renderWithI18n(<ResetPasswordForm />);

    await user.type(screen.getByLabelText(/new password/i), 'newpassword123');
    await user.type(screen.getByLabelText(/confirm password/i), 'newpassword123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText(/password reset successful/i)).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith('/api/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'reset-token-123', password: 'newpassword123' }),
    });

    const signInLink = screen.getByRole('link', { name: /sign in/i });
    expect(signInLink).toHaveAttribute('href', '/auth/signin');
  });

  it('shows the API error message on failure', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: { message: 'Reset token is invalid' } }),
      }),
    );

    renderWithI18n(<ResetPasswordForm />);

    await user.type(screen.getByLabelText(/new password/i), 'newpassword123');
    await user.type(screen.getByLabelText(/confirm password/i), 'newpassword123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText('Reset token is invalid')).toBeInTheDocument();
  });

  it('shows an error banner on network failure', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    renderWithI18n(<ResetPasswordForm />);

    await user.type(screen.getByLabelText(/new password/i), 'newpassword123');
    await user.type(screen.getByLabelText(/confirm password/i), 'newpassword123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText(/unexpected error/i)).toBeInTheDocument();
  });
});
