import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { SignUpForm } from './SignUpForm';
import messages from '@/messages/en.json';

const locationAssign = vi.fn();

Object.defineProperty(window, 'location', {
  value: { ...window.location, assign: locationAssign },
  writable: true,
});

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

function renderForm() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SignUpForm />
    </NextIntlClientProvider>,
  );
}

describe('SignUpForm', () => {
  beforeEach(() => {
    locationAssign.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('routes newly signed-up users to localized onboarding', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { token: 'signup-token-123' } }),
    }));

    renderForm();
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'New Pilot' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'pilot@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => expect(locationAssign).toHaveBeenCalledWith('/en/onboarding'));
    expect(localStorage.getItem('adnexus_token')).toBe('signup-token-123');
  });

  describe('client-side validation', () => {
    it('shows validation errors and does not submit an empty form', async () => {
      const user = userEvent.setup();
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      renderForm();
      await user.click(screen.getByRole('button', { name: /sign up/i }));

      const alerts = await screen.findAllByRole('alert');
      expect(alerts.length).toBeGreaterThanOrEqual(3);
      expect(screen.getByText(/enter your full name/i)).toBeInTheDocument();
      expect(screen.getByText(/enter your email/i)).toBeInTheDocument();
      expect(screen.getByText(/enter your password/i)).toBeInTheDocument();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('shows validation error for invalid email format after blur', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByLabelText(/email/i), 'notanemail');
      await user.tab();

      expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    });

    it('shows validation error for short password after blur', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByLabelText(/password/i), '12345');
      await user.tab();

      expect(await screen.findByText(/at least 8/i)).toBeInTheDocument();
    });
  });

  describe('server errors', () => {
    it('shows the API error message on failed signup', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ error: { message: 'Email already registered' } }),
      }));

      renderForm();
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'New Pilot' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'pilot@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

      expect(await screen.findByText('Email already registered')).toBeInTheDocument();
      expect(locationAssign).not.toHaveBeenCalled();
    });

    it('shows an error and does not redirect when the response has no token', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { user: { id: 'u1' } } }),
      }));

      renderForm();
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'New Pilot' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'pilot@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

      expect(await screen.findByText(/sign up failed/i)).toBeInTheDocument();
      expect(locationAssign).not.toHaveBeenCalled();
      expect(localStorage.getItem('adnexus_token')).toBeNull();
    });

    it('shows an error banner on network failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      renderForm();
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'New Pilot' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'pilot@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

      expect(await screen.findByText(/unexpected error/i)).toBeInTheDocument();
    });
  });
});
