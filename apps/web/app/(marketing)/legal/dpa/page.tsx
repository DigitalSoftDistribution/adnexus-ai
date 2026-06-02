import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/marketing/LegalPage';

export const metadata: Metadata = {
  title: 'Data Processing Agreement',
  description: 'AdNexus AI Data Processing Agreement for customers with regulatory requirements.',
  alternates: { canonical: '/legal/dpa' },
  robots: { index: false },
};

export default function Page() {
  return (
    <LegalPage title="Data Processing Agreement" updated="June 2026">
      <LegalSection heading="Roles">
        For data processed on your behalf, you are the controller and AdNexus is the processor. We process
        data only on your documented instructions.
      </LegalSection>
      <LegalSection heading="Security measures">
        We apply encryption in transit and at rest, least-privilege role-based access, and audit logging.
        See the Security page for details.
      </LegalSection>
      <LegalSection heading="Sub-processors">
        We engage sub-processors to deliver the service and remain responsible for their compliance. A
        current list is available on request.
      </LegalSection>
      <LegalSection heading="International transfers">
        Where data is transferred across regions, we rely on appropriate safeguards such as standard
        contractual clauses.
      </LegalSection>
      <LegalSection heading="Requesting a signed DPA">
        To execute a DPA for your organization, contact legal@adnexus.ai.
      </LegalSection>
    </LegalPage>
  );
}
