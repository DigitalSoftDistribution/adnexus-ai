import { getTranslations } from 'next-intl/server';
import { GoalsContent } from '@/components/goals/GoalsContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'goals' as never });
  return { title: t('title') };
}

export default function GoalsPage() {
  return <GoalsContent />;
}
