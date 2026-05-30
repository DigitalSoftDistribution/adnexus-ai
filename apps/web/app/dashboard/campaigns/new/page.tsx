import { Metadata } from 'next';
import { NewCampaignContent } from '@/components/campaigns/NewCampaignContent';

export const metadata: Metadata = {
  title: 'New Campaign',
};

export default function NewCampaignPage() {
  return <NewCampaignContent />;
}
