import type { Metadata } from 'next';
import { HomeContent } from '@/components/marketing/HomeContent';
import { JsonLd, ORGANIZATION_JSONLD, SOFTWARE_APPLICATION_JSONLD } from '@/components/marketing/JsonLd';

export const metadata: Metadata = {
  // `absolute` bypasses the layout's "%s | AdNexus AI" template so the brand
  // name is not duplicated in the home page title.
  title: { absolute: 'AdNexus AI — The Intelligent Campaign Workspace' },
  description:
    'AI-powered ad management launching with Meta execution and read-only/coming-soon coverage for Google, TikTok, and Snap — where every AI-generated change is a reviewed draft before execution. One dashboard, flat pricing.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'AdNexus AI — The Intelligent Campaign Workspace',
    description:
      'AI-powered ad management with reviewed drafts, Meta execution, and cross-platform reporting roadmap.',
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
