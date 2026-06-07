import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { IntegrationsContent } from '@/components/integrations/IntegrationsContent';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'integrations' as never });
  return {
    title: t('title'),
  };
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <IntegrationsContent />
    </Suspense>
  );
}
