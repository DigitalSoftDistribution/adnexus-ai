import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
});
