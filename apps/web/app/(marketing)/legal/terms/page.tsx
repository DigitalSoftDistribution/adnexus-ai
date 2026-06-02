import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/marketing/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms that govern your use of AdNexus AI.',
  alternates: { canonical: '/legal/terms' },
  robots: { index: false },
};

export default function Page() {
  return (
    <LegalPage title="Terms of Service" updated="June 2026">
      <LegalSection heading="Acceptance">
        By using AdNexus AI you agree to these terms. If you use the service on behalf of an organization,
        you represent that you have authority to bind that organization.
      </LegalSection>
      <LegalSection heading="The service">
        AdNexus provides AI-assisted ad management with draft-first approval. You remain responsible for
        approving and publishing changes to your live campaigns.
      </LegalSection>
      <LegalSection heading="Acceptable use">
        Do not use the service to violate ad platform policies, applicable law, or the rights of others.
      </LegalSection>
      <LegalSection heading="Billing">
        Paid plans bill monthly or annually as selected. Pricing is flat and does not vary with your ad
        spend. You may cancel at any time; access continues through the current period.
      </LegalSection>
      <LegalSection heading="Liability">
        The service is provided as-is. To the extent permitted by law, AdNexus is not liable for indirect
        or consequential damages arising from use of the service.
      </LegalSection>
    </LegalPage>
  );
}
