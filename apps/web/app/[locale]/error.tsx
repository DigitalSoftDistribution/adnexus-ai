'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ErrorState } from '@/components/ui/error-state';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors');

  useEffect(() => {
    // Surface the error for observability tooling / local debugging.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <ErrorState
        className="w-full max-w-lg"
        title={t('somethingWentWrong')}
        description={t('unexpectedErrorDescription')}
        onRetry={reset}
        retryLabel={t('tryAgain')}
      />
    </div>
  );
}
