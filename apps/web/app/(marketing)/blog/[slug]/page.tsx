import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogPostContent } from '@/components/marketing/BlogPostContent';
import { BLOG_SLUGS, isKnownBlogSlug } from '@/lib/marketing/blog-slugs';

export function generateStaticParams() {
  return BLOG_SLUGS.map((slug) => ({ slug }));
}

export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isKnownBlogSlug(slug)) {
    return { title: 'Not found', robots: { index: false } };
  }
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
  if (!isKnownBlogSlug(slug)) {
    notFound();
  }
  return <BlogPostContent slug={slug} />;
}
