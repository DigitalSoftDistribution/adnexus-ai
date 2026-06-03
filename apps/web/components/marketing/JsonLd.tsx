/** Renders a JSON-LD <script> for structured data. Server-safe. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export const ORGANIZATION_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'AdNexus AI',
  url: 'https://adnexus.ai',
  description:
    'AI-powered advertising campaign management with draft-first approval across Meta, Google, TikTok, and Snap.',
  sameAs: [
    'https://twitter.com/adnexusai',
    'https://github.com/adnexusai',
    'https://linkedin.com/company/adnexusai',
  ],
};

export const SOFTWARE_APPLICATION_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AdNexus AI',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'The intelligent campaign workspace. AI-powered ad management with draft-first approval across Meta, Google, TikTok, and Snap.',
  offers: {
    '@type': 'AggregateOffer',
    lowPrice: '0',
    highPrice: '399',
    priceCurrency: 'USD',
  },
};
