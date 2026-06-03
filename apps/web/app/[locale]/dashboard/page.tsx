import { getTranslations } from 'next-intl/server';
import { DashboardContent } from '@/components/dashboard/DashboardContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard' as any });
  return {
    title: t('title'),
  };
}

export default function DashboardPage() {
  return <DashboardContent />;
}
