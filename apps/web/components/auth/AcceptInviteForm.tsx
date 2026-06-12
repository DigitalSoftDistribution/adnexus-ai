'use client';

import { useState, useCallback, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const MIN_PASSWORD_LENGTH = 8;

interface FieldErrors {
  name?: string;
  password?: string;
}

function getFieldErrors(
  name: string,
  password: string,
  t: ReturnType<typeof useTranslations<'auth'>>,
  touchedFields: { name: boolean; password: boolean },
): FieldErrors {
  const errors: FieldErrors = {};

  if (touchedFields.name && !name.trim()) {
    errors.name = t('nameRequired');
  }

  if (touchedFields.password) {
    if (!password) {
      errors.password = t('passwordRequired');
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = t('passwordMinLength', { min: MIN_PASSWORD_LENGTH });
    }
  }

  return errors;
}

function getFullFieldErrors(
  name: string,
  password: string,
  t: ReturnType<typeof useTranslations<'auth'>>,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!name.trim()) {
    errors.name = t('nameRequired');
  }

  if (!password) {
    errors.password = t('passwordRequired');
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = t('passwordMinLength', { min: MIN_PASSWORD_LENGTH });
  }

  return errors;
}

export function AcceptInviteForm({ token }: { token: string }) {
  const locale = useLocale();
  const t = useTranslations('auth');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);
  const touchedRef = useRef({ name: false, password: false });

  const updateFieldErrors = useCallback(
    (newName: string, newPassword: string) => {
      setFieldErrors(getFieldErrors(newName, newPassword, t, touchedRef.current));
    },
    [t],
  );

  const handleBlur = useCallback(
    (field: 'name' | 'password') => {
      touchedRef.current = { ...touchedRef.current, [field]: true };
      updateFieldErrors(name, password);
    },
    [name, password, updateFieldErrors],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    touchedRef.current = { name: true, password: true };
    const errors = getFullFieldErrors(name, password, t);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/v1/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: name.trim(), password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error?.message ?? t('acceptInviteFailed'));
        return;
      }

      const accessToken = data?.data?.token ?? data?.token;
      if (accessToken) {
        localStorage.setItem('adnexus_token', accessToken);
        window.location.assign(`/${locale}/dashboard`);
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
          <CardTitle className="text-2xl text-center">{t('invalidInviteTokenTitle')}</CardTitle>
          <CardDescription className="text-center">
            {t('invalidInviteTokenDescription')}
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

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">{t('acceptInviteSuccessTitle')}</CardTitle>
          <CardDescription className="text-center">
            {t('acceptInviteSuccessDescription')}
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
        <CardTitle className="text-2xl text-center">{t('acceptInviteTitle')}</CardTitle>
        <CardDescription className="text-center">{t('acceptInviteSubtitle')}</CardDescription>
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
            <Label htmlFor="name">{t('name')}</Label>
            <Input
              id="name"
              type="text"
              placeholder={t('namePlaceholder')}
              value={name}
              onChange={(e) => {
                const newVal = e.target.value;
                setName(newVal);
                updateFieldErrors(newVal, password);
              }}
              onBlur={() => handleBlur('name')}
              aria-invalid={!!fieldErrors.name}
              aria-describedby={fieldErrors.name ? 'name-error' : undefined}
            />
            {fieldErrors.name && (
              <p id="name-error" className="text-sm text-destructive" role="alert">
                {fieldErrors.name}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                const newVal = e.target.value;
                setPassword(newVal);
                updateFieldErrors(name, newVal);
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
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
            {t('acceptInvite')}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {t('hasAccount')}{' '}
          <Link href="/auth/signin" className="text-primary hover:underline">
            {t('signIn')}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
