import { getTranslations } from 'next-intl/server';
import { AnalyticsContent } from '@/components/analytics/AnalyticsContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'analytics' as never });
  return { title: t('title') };
}

export default function AnalyticsPage() {
  return <AnalyticsContent />;
}
