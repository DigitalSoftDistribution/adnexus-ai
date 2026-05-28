import { Metadata } from 'next';
import { CampaignDetailContent } from '@/components/campaigns/CampaignDetailContent';

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CampaignDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Campaign ${id}`,
  };
}

export default function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  return <CampaignDetailContent />;
}
