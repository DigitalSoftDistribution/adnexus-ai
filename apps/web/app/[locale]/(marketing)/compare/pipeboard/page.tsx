import type { Metadata } from 'next';
import { ComparePipeboardContent } from '@/components/marketing/ComparePipeboardContent';

export const metadata: Metadata = {
  title: 'AdNexus AI vs Pipeboard',
  description:
    'AdNexus AI vs Pipeboard: a visual dashboard and draft-first governance on top of MCP-native AI — not just a chat connector. Compare features, platforms, and pricing.',
  alternates: { canonical: '/compare/pipeboard' },
};

export default function Page() {
  return <ComparePipeboardContent />;
}
