import { CampaignDetailContent } from '@/components/campaigns/CampaignDetailContent';

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function CampaignDetailPage({ params: _params }: CampaignDetailPageProps) {
  return <CampaignDetailContent />;
}
