'use client';

import { useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const MIN_PASSWORD_LENGTH = 8;

interface FieldErrors {
  password?: string;
  confirmPassword?: string;
}

function getFieldErrors(
  password: string,
  confirmPassword: string,
  t: ReturnType<typeof useTranslations<'auth'>>,
  touchedFields: { password: boolean; confirmPassword: boolean },
): FieldErrors {
  const errors: FieldErrors = {};

  if (touchedFields.password) {
    if (!password) {
      errors.password = t('passwordRequired');
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = t('passwordMinLength', { min: MIN_PASSWORD_LENGTH });
    }
  }

  if (touchedFields.confirmPassword) {
    if (!confirmPassword) {
      errors.confirmPassword = t('confirmPasswordRequired');
    } else if (confirmPassword !== password) {
      errors.confirmPassword = t('passwordsDoNotMatch');
    }
  }

  return errors;
}

export function ResetPasswordForm() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  // The password-reset email links to /auth/reset-password?token=<token>.
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);
  const touchedRef = useRef({ password: false, confirmPassword: false });

  const updateFieldErrors = useCallback(
    (newPassword: string, newConfirmPassword: string) => {
      setFieldErrors(getFieldErrors(newPassword, newConfirmPassword, t, touchedRef.current));
    },
    [t],
  );

  const handleBlur = useCallback(
    (field: 'password' | 'confirmPassword') => {
      touchedRef.current = { ...touchedRef.current, [field]: true };
      updateFieldErrors(password, confirmPassword);
    },
    [password, confirmPassword, updateFieldErrors],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    touchedRef.current = { password: true, confirmPassword: true };
    const errors = getFieldErrors(password, confirmPassword, t, touchedRef.current);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? t('resetPasswordFailed'));
        return;
      }

      setSuccess(true);
    } catch {
      setError(t('unexpectedError'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">{t('invalidResetTokenTitle')}</CardTitle>
          <CardDescription className="text-center">
            {t('invalidResetTokenDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/auth/forgot-password">{t('requestNewLink')}</Link>
          </Button>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <Link href="/auth/signin" className="text-primary hover:underline">
              {t('backToSignIn')}
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">{t('resetPasswordSuccessTitle')}</CardTitle>
          <CardDescription className="text-center">
            {t('resetPasswordSuccessDescription')}
          </CardDescription>
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
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xl font-bold">A</span>
          </div>
        </div>
        <CardTitle className="text-2xl text-center">{t('resetPasswordTitle')}</CardTitle>
        <CardDescription className="text-center">{t('resetPasswordSubtitle')}</CardDescription>
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
            <Label htmlFor="password">{t('newPassword')}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                const newVal = e.target.value;
                setPassword(newVal);
                updateFieldErrors(newVal, confirmPassword);
              }}
              onBlur={() => handleBlur('password')}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            />
            {fieldErrors.password && (
              <p id="password-error" className="text-sm text-destructive" role="alert">
                {fieldErrors.password}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t('confirmPassword')}</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                const newVal = e.target.value;
                setConfirmPassword(newVal);
                updateFieldErrors(password, newVal);
              }}
              onBlur={() => handleBlur('confirmPassword')}
              aria-invalid={!!fieldErrors.confirmPassword}
              aria-describedby={fieldErrors.confirmPassword ? 'confirm-password-error' : undefined}
            />
            {fieldErrors.confirmPassword && (
              <p id="confirm-password-error" className="text-sm text-destructive" role="alert">
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
            {t('resetPassword')}
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
