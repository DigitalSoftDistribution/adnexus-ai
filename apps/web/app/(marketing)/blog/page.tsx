import type { Metadata } from 'next';
import { BlogContent } from '@/components/marketing/BlogContent';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Insights on AI advertising, draft-first campaign management, cross-platform optimization, creative fatigue, and product updates from AdNexus AI.',
  alternates: { canonical: '/blog' },
};

export default function Page() {
  return <BlogContent />;
}
