import type { Metadata } from 'next';
import { BlogPostContent } from '@/components/marketing/BlogPostContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const title = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return {
    title,
    description: 'Read the latest from the AdNexus AI blog on AI-powered, draft-first advertising.',
    alternates: { canonical: `/blog/${slug}` },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BlogPostContent slug={slug} />;
}
