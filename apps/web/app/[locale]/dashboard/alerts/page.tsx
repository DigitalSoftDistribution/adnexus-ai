import { getTranslations } from 'next-intl/server';
import { AlertsContent } from '@/components/alerts/AlertsContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'alerts' as any });
  return {
    title: t('title'),
  };
}

export default function AlertsPage() {
  return <AlertsContent />;
}
