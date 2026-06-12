import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import messages from '@/messages/en.json';

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

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the email field and submit button', () => {
    renderWithI18n(<ForgotPasswordForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('renders a link back to sign in', () => {
    renderWithI18n(<ForgotPasswordForm />);

    const backLink = screen.getByText(/back to sign in/i);
    expect(backLink.closest('a')).toHaveAttribute('href', '/auth/signin');
  });

  describe('client-side validation', () => {
    it('shows validation error for empty email after blur', async () => {
      const user = userEvent.setup();
      renderWithI18n(<ForgotPasswordForm />);

      await user.click(screen.getByLabelText(/email/i));
      await user.tab();

      expect(await screen.findByRole('alert')).toHaveTextContent(/enter your email/i);
    });

    it('shows validation error for invalid email format after blur', async () => {
      const user = userEvent.setup();
      renderWithI18n(<ForgotPasswordForm />);

      await user.type(screen.getByLabelText(/email/i), 'notanemail');
      await user.tab();

      expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    });

    it('does not submit when validation fails', async () => {
      const user = userEvent.setup();
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      renderWithI18n(<ForgotPasswordForm />);

      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  it('posts to the forgot-password endpoint and shows the success state', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: { message: 'If an account exists, a password reset email has been sent' },
        }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    renderWithI18n(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText(/email/i), 'pilot@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
    expect(screen.getByText(/if an account exists/i)).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith('/api/v1/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pilot@example.com' }),
    });
  });

  it('shows the same success state even for unknown emails', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { message: 'If an account exists, a password reset email has been sent' },
          }),
      }),
    );

    renderWithI18n(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText(/email/i), 'unknown@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
  });

  it('shows an error banner on a 5xx response', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: 'Server error' } }),
      }),
    );

    renderWithI18n(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText(/email/i), 'pilot@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByText('Server error')).toBeInTheDocument();
    expect(screen.queryByText(/check your email/i)).not.toBeInTheDocument();
  });

  it('shows an error banner on network failure', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    renderWithI18n(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText(/email/i), 'pilot@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByText(/unexpected error/i)).toBeInTheDocument();
  });
});
