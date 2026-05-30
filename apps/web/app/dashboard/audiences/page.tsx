import { Metadata } from 'next';
import { AudiencesContent } from '@/components/audiences/AudiencesContent';

export const metadata: Metadata = {
  title: 'Audiences',
};

export default function AudiencesPage() {
  return <AudiencesContent />;
}
