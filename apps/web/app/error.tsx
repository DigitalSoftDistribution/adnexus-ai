'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/error-state';

/**
 * Root error boundary for routes outside [locale] (e.g. /api rewrites, sitemap).
 * Locale-scoped pages use app/[locale]/error.tsx.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <ErrorState
        className="w-full max-w-lg"
        title="Something went wrong"
        description="An unexpected error occurred. Please try again."
        onRetry={reset}
        retryLabel="Try again"
      />
    </div>
  );
}
