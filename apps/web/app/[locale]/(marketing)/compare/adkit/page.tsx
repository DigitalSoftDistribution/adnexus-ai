import type { Metadata } from 'next';
import { CompareAdKitContent } from '@/components/marketing/CompareAdKitContent';

export const metadata: Metadata = {
  title: 'AdNexus AI vs AdKit',
  description:
    'AdNexus AI vs AdKit: broader platform support, team workspaces, scheduled reports, and an MCP-native AI agent — with draft-first approval on every change.',
  alternates: { canonical: '/compare/adkit' },
};

export default function Page() {
  return <CompareAdKitContent />;
}
