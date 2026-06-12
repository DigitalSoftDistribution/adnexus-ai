'use client';

import { useState, useCallback, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AlertCircle } from 'lucide-react';

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

type FieldName = 'name' | 'email' | 'password';

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getFieldErrors(
  name: string,
  email: string,
  password: string,
  t: ReturnType<typeof useTranslations<'auth'>>,
  touchedFields: Record<FieldName, boolean>,
): FieldErrors {
  const errors: FieldErrors = {};

  if (touchedFields.name && !name.trim()) {
    errors.name = t('nameRequired');
  }

  if (touchedFields.email) {
    // Validate the same normalized value the submit handler sends
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      errors.email = t('emailRequired');
    } else if (!EMAIL_REGEX.test(normalizedEmail)) {
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

export function SignUpForm() {
  const locale = useLocale();
  const t = useTranslations('auth');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const touchedRef = useRef<Record<FieldName, boolean>>({
    name: false,
    email: false,
    password: false,
  });

  const updateFieldErrors = useCallback(
    (newName: string, newEmail: string, newPassword: string) => {
      setFieldErrors(getFieldErrors(newName, newEmail, newPassword, t, touchedRef.current));
    },
    [t],
  );

  const handleBlur = useCallback(
    (field: FieldName) => {
      touchedRef.current = { ...touchedRef.current, [field]: true };
      updateFieldErrors(name, email, password);
    },
    [name, email, password, updateFieldErrors],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched and run full validation
    touchedRef.current = { name: true, email: true, password: true };
    const errors = getFieldErrors(name, email, password, t, touchedRef.current);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message ?? t('signUpFailed'));
        return;
      }

      // The API wraps the payload: { success, data: { token, ... } }.
      const token = data?.data?.token ?? data?.token;
      if (!token) {
        setError(t('signUpFailed'));
        return;
      }
      localStorage.setItem('adnexus_token', token);
      window.location.assign(`/${locale}/onboarding`);
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
        <CardTitle className="text-2xl text-center">{t('createAccount')}</CardTitle>
        <CardDescription className="text-center">
          {t('signUpSubtitle')}
        </CardDescription>
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
                updateFieldErrors(newVal, email, password);
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
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(e) => {
                const newVal = e.target.value;
                setEmail(newVal);
                updateFieldErrors(name, newVal, password);
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
            <Label htmlFor="password">{t('password')}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                const newVal = e.target.value;
                setPassword(newVal);
                updateFieldErrors(name, email, newVal);
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
            {t('signUp')}
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
