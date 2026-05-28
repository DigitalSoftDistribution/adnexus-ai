import { Metadata } from 'next';
import { DraftsContent } from '@/components/drafts/DraftsContent';

export const metadata: Metadata = {
  title: 'Drafts',
};

export default function DraftsPage() {
  return <DraftsContent />;
}
