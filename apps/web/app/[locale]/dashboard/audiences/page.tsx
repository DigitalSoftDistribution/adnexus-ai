import { getTranslations } from 'next-intl/server';
import { AudiencesContent } from '@/components/audiences/AudiencesContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'audiences' as any });
  return {
    title: t('title'),
  };
}

export default function AudiencesPage() {
  return <AudiencesContent />;
}
