import { getTranslations } from 'next-intl/server';
import { CampaignsContent } from '@/components/campaigns/CampaignsContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'campaigns' as any });
  return {
    title: t('title'),
  };
}

export default function CampaignsPage() {
  return <CampaignsContent />;
}
