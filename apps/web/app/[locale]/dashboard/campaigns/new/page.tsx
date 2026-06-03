import { getTranslations } from 'next-intl/server';
import { NewCampaignContent } from '@/components/campaigns/NewCampaignContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'campaigns' as any });
  return {
    title: t('newCampaign'),
  };
}

export default function NewCampaignPage() {
  return <NewCampaignContent />;
}
