import type { Metadata } from 'next';
import { RoasCalculatorContent } from '@/components/marketing/RoasCalculatorContent';

export const metadata: Metadata = {
  title: 'Free ROAS Calculator',
  description:
    'Free ROAS calculator for Meta, Google, and TikTok ads. Calculate ROAS, CPA, CPC, CTR, and CVR instantly with industry benchmarks.',
  alternates: { canonical: '/tools/roas-calculator' },
};

export default function Page() {
  return <RoasCalculatorContent />;
}
