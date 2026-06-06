import { PricingContent } from '@/components/marketing/PricingContent';

export const metadata = {
  title: 'Pricing',
  description: 'Flat AdNexus AI pricing for teams that want AI-powered campaign monitoring, draft approvals, and managed platform execution.',
  alternates: { canonical: '/pricing' },
};

export default function PricingPage() {
  return <PricingContent />;
}
