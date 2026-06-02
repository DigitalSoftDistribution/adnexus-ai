import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CompareContent } from './compare-content';
import { COMPARE_DATA, COMPARE_SLUGS } from '../_data';
import { breadcrumbSchema, jsonLd } from '@/lib/structured-data';

export function generateStaticParams() {
  return COMPARE_SLUGS.map((competitor) => ({ competitor }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ competitor: string }>;
}): Promise<Metadata> {
  const { competitor } = await params;
  const data = COMPARE_DATA[competitor];
  if (!data) {
    return { title: 'Comparison Not Found' };
  }
  const canonical = `/compare/${data.slug}`;
  return {
    title: data.metaTitle,
    description: data.metaDescription,
    alternates: { canonical },
    openGraph: {
      title: `${data.metaTitle} | AdNexus AI`,
      description: data.metaDescription,
      url: canonical,
      type: 'website',
    },
  };
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ competitor: string }>;
}) {
  const { competitor } = await params;
  const data = COMPARE_DATA[competitor];
  if (!data) {
    notFound();
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'Compare', path: '/compare' },
              { name: data.competitor, path: `/compare/${data.slug}` },
            ]),
          ),
        }}
      />
      <CompareContent data={data} />
    </>
  );
}
