import { Metadata } from 'next';
import { AlertsContent } from '@/components/alerts/AlertsContent';

export const metadata: Metadata = {
  title: 'Alerts',
};

export default function AlertsPage() {
  return <AlertsContent />;
}
