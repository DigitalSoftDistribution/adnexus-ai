import type { Metadata } from 'next';
import { BlogList } from './blog-list';
import { breadcrumbSchema, jsonLd } from '@/lib/structured-data';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Latest insights on AI advertising, campaign optimization, marketing strategies, product updates, and industry trends from AdNexus AI.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog | AdNexus AI',
    description:
      'Product updates, AI research, case studies, and tips for scaling ad operations.',
    url: '/blog',
    type: 'website',
  },
};

export default function BlogPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'Blog', path: '/blog' },
            ]),
          ),
        }}
      />
      <BlogList />
    </>
  );
}
