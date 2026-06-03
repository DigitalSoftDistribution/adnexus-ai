import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogPostContent } from '@/components/marketing/BlogPostContent';
import { BLOG_SLUGS, getBlogPost } from '@/lib/marketing/blog-posts';

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
  const post = getBlogPost(slug);
  if (!post) {
    return { title: 'Not found', robots: { index: false } };
  }
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      url: `/blog/${slug}`,
    },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getBlogPost(slug)) {
    notFound();
  }
  return <BlogPostContent slug={slug} />;
}
