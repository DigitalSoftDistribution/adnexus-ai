import type { Metadata } from 'next';
import { CompareMadgicxContent } from '@/components/marketing/CompareMadgicxContent';

export const metadata: Metadata = {
  title: 'AdNexus AI vs Madgicx',
  description:
    'AdNexus AI vs Madgicx: cross-platform AI ad management (Meta, Google, TikTok, Snap) with flat pricing — not Meta-only automation that scales with your spend.',
  alternates: { canonical: '/compare/madgicx' },
};

export default function Page() {
  return <CompareMadgicxContent />;
}
