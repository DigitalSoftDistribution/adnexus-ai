import { setAuthToken } from '../../src/lib/authFetch';
'use client';

import { useState, useCallback, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AlertCircle } from 'lucide-react';

interface FieldErrors {
  email?: string;
  password?: string;
}

const MIN_PASSWORD_LENGTH = 8;

function getFieldErrors(
  email: string,
  password: string,
  t: ReturnType<typeof useTranslations<'auth'>>,
  touchedFields: { email: boolean; password: boolean },
): FieldErrors {
  const errors: FieldErrors = {};

  if (touchedFields.email) {
    if (!email.trim()) {
      errors.email = t('emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = t('invalidEmail');
    }
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
  email: string,
  password: string,
  t: ReturnType<typeof useTranslations<'auth'>>,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!email.trim()) {
    errors.email = t('emailRequired');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = t('invalidEmail');
  }

  if (!password) {
    errors.password = t('passwordRequired');
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = t('passwordMinLength', { min: MIN_PASSWORD_LENGTH });
  }

  return errors;
}

export function SignInForm() {
  const locale = useLocale();
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const touchedRef = useRef({ email: false, password: false });

  const updateFieldErrors = useCallback(
    (newEmail: string, newPassword: string) => {
      const errors = getFieldErrors(newEmail, newPassword, t, touchedRef.current);
      setFieldErrors(errors);
    },
    [t],
  );

  const handleBlur = useCallback(
    (field: 'email' | 'password') => {
      touchedRef.current = { ...touchedRef.current, [field]: true };
      updateFieldErrors(email, password);
    },
    [email, password, updateFieldErrors],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched and run full validation
    touchedRef.current = { email: true, password: true };
    const errors = getFullFieldErrors(email, password, t);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/v1/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setError(t('invalidCredentials'));
        } else {
          setError(data.error?.message ?? t('signInFailed'));
        }
        return;
      }

      const token = data?.data?.token ?? data?.token;
      if (!token) {
        setError(t('signInFailed'));
        return;
      }
      setAuthToken(token);
      window.location.assign(`/${locale}/dashboard`);
    } catch {
      setError(t('unexpectedError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xl font-bold">A</span>
          </div>
        </div>
        <CardTitle className="text-2xl text-center">{t('welcomeBack')}</CardTitle>
        <CardDescription className="text-center">{t('signInSubtitle')}</CardDescription>
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
                updateFieldErrors(newVal, password);
              }}
              onBlur={() => handleBlur('email')}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            />
            {fieldErrors.email && (
              <p id="email-error" className="text-sm text-destructive" role="alert">
                {fieldErrors.email}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t('password')}</Label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2"
              >
                {t('forgotPassword')}
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                const newVal = e.target.value;
                setPassword(newVal);
                updateFieldErrors(email, newVal);
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
            {t('signIn')}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {t('noAccount')}{' '}
          <Link href="/auth/signup" className="text-primary hover:underline">
            {t('signUp')}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
