import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { VerifyEmailForm } from '@/components/auth/VerifyEmailForm';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' as any });
  return {
    title: t('verifyEmail'),
  };
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Suspense fallback={<LoadingSpinner size="lg" />}>
        <VerifyEmailForm />
      </Suspense>
    </div>
  );
}
