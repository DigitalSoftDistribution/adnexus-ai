'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function VerifyEmailForm() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!token) return;
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/v1/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? t('verifyEmailFailed'));
        return;
      }

      setSuccess(true);
    } catch {
      setError(t('unexpectedError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsResending(true);
    setResendSuccess(false);
    setError('');

    try {
      const res = await fetch('/api/v1/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? t('resendVerificationFailed'));
        return;
      }

      setResendSuccess(true);
    } catch {
      setError(t('unexpectedError'));
    } finally {
      setIsResending(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">{t('verifyEmailSuccessTitle')}</CardTitle>
          <CardDescription className="text-center">{t('verifyEmailSuccessDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/auth/signin">{t('signIn')}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Mail className="h-6 w-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl text-center">{t('verifyEmailTitle')}</CardTitle>
        <CardDescription className="text-center">
          {token ? t('verifyEmailDescription') : t('verifyEmailMissingTokenDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div
            className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {token ? (
          <Button type="button" className="w-full" onClick={handleVerify} disabled={isLoading}>
            {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
            {t('verifyEmail')}
          </Button>
        ) : null}
        <form onSubmit={handleResend} className="space-y-3" noValidate>
          <div className="space-y-2">
            <Label htmlFor="verification-email">{t('email')}</Label>
            <Input
              id="verification-email"
              type="email"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <Button type="submit" variant="outline" className="w-full" disabled={isResending || !email.trim()}>
            {isResending ? <LoadingSpinner size="sm" className="mr-2" /> : null}
            {t('resendVerificationEmail')}
          </Button>
          {resendSuccess ? (
            <p className="text-center text-sm text-muted-foreground" role="status">
              {t('resendVerificationSuccess')}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
