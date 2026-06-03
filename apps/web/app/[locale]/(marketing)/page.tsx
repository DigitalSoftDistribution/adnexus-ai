import type { Metadata } from 'next';
import { HomeContent } from '@/components/marketing/HomeContent';
import { JsonLd, ORGANIZATION_JSONLD, SOFTWARE_APPLICATION_JSONLD } from '@/components/marketing/JsonLd';

export const metadata: Metadata = {
  // `absolute` bypasses the layout's "%s | AdNexus AI" template so the brand
  // name is not duplicated in the home page title.
  title: { absolute: 'AdNexus AI — The Intelligent Campaign Workspace' },
  description:
    'AI-powered ad management across Meta, Google, TikTok, and Snap — where every AI-generated change is a draft awaiting your approval. One dashboard, flat pricing.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'AdNexus AI — The Intelligent Campaign Workspace',
    description:
      'AI-powered ad management with draft-first approval across Meta, Google, TikTok, and Snap.',
    url: '/',
  },
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={[ORGANIZATION_JSONLD, SOFTWARE_APPLICATION_JSONLD]} />
      <HomeContent />
    </>
  );
}
