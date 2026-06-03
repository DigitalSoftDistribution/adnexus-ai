import { getTranslations } from 'next-intl/server';
import { ReportsContent } from '@/components/reports/ReportsContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'reports' as any });
  return {
    title: t('title'),
  };
}

export default function ReportsPage() {
  return <ReportsContent />;
}
