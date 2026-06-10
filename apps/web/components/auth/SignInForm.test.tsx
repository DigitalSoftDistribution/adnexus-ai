import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { SignInForm } from './SignInForm';
import messages from '@/messages/en.json';

const locationAssign = vi.fn();

Object.defineProperty(window, 'location', {
  value: { ...window.location, assign: locationAssign },
  writable: true,
});

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
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/en/auth/signin',
}));

function renderWithI18n(ui: ReactNode, locale = 'en') {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

function renderForm() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SignInForm />
    </NextIntlClientProvider>,
  );
}

describe('SignInForm', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    locationAssign.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders sign-in form with email and password fields', () => {
    renderWithI18n(<SignInForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders a Forgot Password link', () => {
    renderWithI18n(<SignInForm />);

    const forgotLink = screen.getByText(/forgot your password/i);
    expect(forgotLink).toBeInTheDocument();
    expect(forgotLink.closest('a')).toHaveAttribute('href', '/auth/forgot-password');
  });

  it('renders a link to the sign-up page', () => {
    renderWithI18n(<SignInForm />);

    const signUpLink = screen.getAllByText(/sign up/i).find(
      (el) => el.closest('a')?.getAttribute('href') === '/auth/signup',
    );
    expect(signUpLink).toBeTruthy();
  });

  describe('client-side validation', () => {
    it('shows validation error for empty email after blur', async () => {
      const user = userEvent.setup();
      renderWithI18n(<SignInForm />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.click(emailInput);
      await user.tab();

      expect(await screen.findByRole('alert')).toHaveTextContent(/enter your email/i);
    });

    it('shows validation error for invalid email format after blur', async () => {
      const user = userEvent.setup();
      renderWithI18n(<SignInForm />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'notanemail');
      await user.tab();

      expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    });

    it('shows validation error for empty password after blur', async () => {
      const user = userEvent.setup();
      renderWithI18n(<SignInForm />);

      const passwordInput = screen.getByLabelText(/password/i);
      await user.click(passwordInput);
      await user.tab();

      expect(await screen.findByText(/enter your password/i)).toBeInTheDocument();
    });

    it('shows validation error for short password after blur', async () => {
      const user = userEvent.setup();
      renderWithI18n(<SignInForm />);

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, '12345');
      await user.tab();

      expect(await screen.findByText(/at least 8/i)).toBeInTheDocument();
    });

    it('clears validation error when field is corrected', async () => {
      const user = userEvent.setup();
      renderWithI18n(<SignInForm />);

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, '12345');
      await user.tab();

      expect(await screen.findByText(/at least 8/i)).toBeInTheDocument();

      await user.clear(passwordInput);
      await user.type(passwordInput, '12345678');
      await user.tab();

      await waitFor(() => {
        expect(screen.queryByText(/at least 8/i)).not.toBeInTheDocument();
      });
    });

    it('shows validation errors on submit with empty form', async () => {
      const user = userEvent.setup();
      renderWithI18n(<SignInForm />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      const alerts = await screen.findAllByRole('alert');
      expect(alerts.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('server errors', () => {
    it('shows error banner on 401 response', async () => {
      const user = userEvent.setup();

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: { message: 'Unauthorized' } }),
        }),
      );

      renderWithI18n(<SignInForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
    });

    it('shows generic error for non-401 failures', async () => {
      const user = userEvent.setup();

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: { message: 'Server error' } }),
        }),
      );

      renderWithI18n(<SignInForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'correctpassword');
      await user.click(submitButton);

      expect(await screen.findByText('Server error')).toBeInTheDocument();
    });

    it('shows generic error fallback when no message in response', async () => {
      const user = userEvent.setup();

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          json: () => Promise.resolve({}),
        }),
      );

      renderWithI18n(<SignInForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'correctpassword');
      await user.click(submitButton);

      expect(await screen.findByText(/sign in failed/i)).toBeInTheDocument();
    });

    it('shows error banner on network failure', async () => {
      const user = userEvent.setup();

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      renderWithI18n(<SignInForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'somepassword');
      await user.click(submitButton);

      expect(await screen.findByText(/unexpected error/i)).toBeInTheDocument();
    });

    it('does not submit when validation fails', async () => {
      const user = userEvent.setup();
      const fetchSpy = vi.fn();

      vi.stubGlobal('fetch', fetchSpy);

      renderWithI18n(<SignInForm />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      const alerts = await screen.findAllByRole('alert');
      expect(alerts.length).toBeGreaterThanOrEqual(2);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  it('routes signed-in users to the localized dashboard', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { token: 'token-123', user: { onboardingCompleted: false } } }),
    }));

    renderForm();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'pilot@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(locationAssign).toHaveBeenCalledWith('/en/dashboard'));
    expect(localStorage.getItem('adnexus_token')).toBe('token-123');
  });

  it('routes returning users to the localized dashboard', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { token: 'token-456', user: { onboardingCompleted: true } } }),
    }));

    renderForm();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'returning@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(locationAssign).toHaveBeenCalledWith('/en/dashboard'));
    expect(localStorage.getItem('adnexus_token')).toBe('token-456');
  });
});
