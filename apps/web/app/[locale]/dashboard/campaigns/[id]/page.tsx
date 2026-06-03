import { getTranslations } from 'next-intl/server';
import { CampaignDetailContent } from '@/components/campaigns/CampaignDetailContent';

interface CampaignDetailPageProps {
  params: Promise<{ id: string; locale: string }>;
}

export async function generateMetadata({ params }: CampaignDetailPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'campaigns' as any });
  return {
    title: t('title'),
  };
}

export default function CampaignDetailPage({ params: _params }: CampaignDetailPageProps) {
  return <CampaignDetailContent />;
}
