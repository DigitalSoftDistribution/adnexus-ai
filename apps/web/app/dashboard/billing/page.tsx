import { Metadata } from 'next';
import { BillingContent } from '@/components/billing/BillingContent';

export const metadata: Metadata = {
  title: 'Billing',
};

export default function BillingPage() {
  return <BillingContent />;
}
