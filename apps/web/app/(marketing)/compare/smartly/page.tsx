import type { Metadata } from 'next';
import { CompareSmartlyContent } from '@/components/marketing/CompareSmartlyContent';

export const metadata: Metadata = {
  title: 'AdNexus AI vs Smartly.io',
  description:
    'AdNexus AI vs Smartly.io: self-serve, 2-minute setup and flat pricing — AI-native campaign management without enterprise contracts or $2,500+/mo minimums.',
  alternates: { canonical: '/compare/smartly' },
};

export default function Page() {
  return <CompareSmartlyContent />;
}
