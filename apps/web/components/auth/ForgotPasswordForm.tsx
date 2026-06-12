'use client';

import { useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AlertCircle, MailCheck } from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getEmailError(
  email: string,
  t: ReturnType<typeof useTranslations<'auth'>>,
): string | undefined {
  // Validate the same normalized value the submit handler sends
  const normalizedEmail = email.trim();
  if (!normalizedEmail) {
    return t('emailRequired');
  }
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return t('invalidEmail');
  }
  return undefined;
}

export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [submitted, setSubmitted] = useState(false);
  const touchedRef = useRef(false);

  const updateEmailError = useCallback(
    (newEmail: string) => {
      if (touchedRef.current) {
        setEmailError(getEmailError(newEmail, t));
      }
    },
    [t],
  );

  const handleBlur = useCallback(() => {
    touchedRef.current = true;
    setEmailError(getEmailError(email, t));
  }, [email, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    touchedRef.current = true;
    const validationError = getEmailError(email, t);
    setEmailError(validationError);
    if (validationError) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? t('resetRequestFailed'));
        return;
      }

      // Always show the same success state regardless of whether the email
      // exists, mirroring the API's anti-enumeration behavior.
      setSubmitted(true);
    } catch {
      setError(t('unexpectedError'));
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <MailCheck className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">{t('resetEmailSentTitle')}</CardTitle>
          <CardDescription className="text-center">
            {t('resetEmailSentDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-muted-foreground">
            <Link href="/auth/signin" className="text-primary hover:underline">
              {t('backToSignIn')}
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xl font-bold">A</span>
          </div>
        </div>
        <CardTitle className="text-2xl text-center">{t('forgotPasswordTitle')}</CardTitle>
        <CardDescription className="text-center">{t('forgotPasswordSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div
              className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(e) => {
                const newVal = e.target.value;
                setEmail(newVal);
                updateEmailError(newVal);
              }}
              onBlur={handleBlur}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? 'email-error' : undefined}
            />
            {emailError && (
              <p id="email-error" className="text-sm text-destructive" role="alert">
                {emailError}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
            {t('sendResetLink')}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/auth/signin" className="text-primary hover:underline">
            {t('backToSignIn')}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
