import { getTranslations } from 'next-intl/server';
import { EditCampaignContent } from '@/components/campaigns/EditCampaignContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'campaigns' as any });
  return {
    title: t('editCampaign'),
  };
}

export default function EditCampaignPage() {
  return <EditCampaignContent />;
}
