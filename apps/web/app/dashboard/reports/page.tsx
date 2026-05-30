import { Metadata } from 'next';
import { ReportsContent } from '@/components/reports/ReportsContent';

export const metadata: Metadata = {
  title: 'Reports',
};

export default function ReportsPage() {
  return <ReportsContent />;
}
