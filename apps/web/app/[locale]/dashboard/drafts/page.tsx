import { getTranslations } from 'next-intl/server';
import { DraftsContent } from '@/components/drafts/DraftsContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'drafts' as any });
  return {
    title: t('title'),
  };
}

export default function DraftsPage() {
  return <DraftsContent />;
}
