import { Metadata } from 'next';
import { CampaignsContent } from '@/components/campaigns/CampaignsContent';

export const metadata: Metadata = {
  title: 'Campaigns',
};

export default function CampaignsPage() {
  return <CampaignsContent />;
}
