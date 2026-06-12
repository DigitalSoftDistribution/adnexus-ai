import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' as any });
  return {
    title: t('resetPassword'),
  };
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      {/* ResetPasswordForm reads the token from useSearchParams, which requires
          a Suspense boundary during static rendering. */}
      <Suspense fallback={<LoadingSpinner size="lg" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
