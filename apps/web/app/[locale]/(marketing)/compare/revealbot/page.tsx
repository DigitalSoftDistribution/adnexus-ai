import type { Metadata } from 'next';
import { CompareRevealbotContent } from '@/components/marketing/CompareRevealbotContent';

export const metadata: Metadata = {
  title: 'AdNexus AI vs Revealbot (Birch)',
  description:
    'AdNexus AI vs Revealbot (formerly Birch): AI-native, draft-first ad management instead of hand-written rule engines — with flat pricing that never scales with ad spend.',
  alternates: { canonical: '/compare/revealbot' },
};

export default function Page() {
  return <CompareRevealbotContent />;
}
