import { Metadata } from 'next';
import { EditCampaignContent } from '@/components/campaigns/EditCampaignContent';

export const metadata: Metadata = {
  title: 'Edit Campaign',
};

export default function EditCampaignPage() {
  return <EditCampaignContent />;
}
