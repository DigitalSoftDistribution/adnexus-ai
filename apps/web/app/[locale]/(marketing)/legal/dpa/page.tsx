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
    <LegalPage title="Data Processing Agreement" updated="June 2, 2026">
      <LegalSection heading="1. Scope and roles">
        This Data Processing Agreement (&ldquo;DPA&rdquo;) forms part of the Terms of Service between
        you (&ldquo;Customer&rdquo;) and AdNexus AI. For personal data processed on the Customer&apos;s
        behalf, the Customer acts as the <strong>data controller</strong> and AdNexus AI acts as the{' '}
        <strong>data processor</strong>. AdNexus AI processes such data only on the Customer&apos;s
        documented instructions.
      </LegalSection>

      <LegalSection heading="2. Subject matter and duration">
        The subject matter is the provision of the AdNexus AI service. Processing continues for the
        duration of the agreement and any agreed retention period thereafter, after which data is
        deleted or returned per Section 7.
      </LegalSection>

      <LegalSection heading="3. Nature and purpose of processing">
        AdNexus AI processes campaign data, performance metrics, audience data, and account
        information to deliver AI-assisted advertising management, reporting, and optimization
        features as described in the service documentation.
      </LegalSection>

      <LegalSection heading="4. Security measures">
        AdNexus AI implements appropriate technical and organizational measures, including encryption
        of data in transit and at rest, least-privilege role-based access control, audit logging of
        mutating actions, encrypted storage of platform access tokens, and regular review of access
        and security practices.
      </LegalSection>

      <LegalSection heading="5. Sub-processors">
        The Customer authorizes AdNexus AI to engage sub-processors to deliver the service. AdNexus AI
        remains responsible for the performance of its sub-processors&apos; obligations. A current list
        of sub-processors is available on request, and AdNexus AI will provide notice of intended
        changes, giving the Customer the opportunity to object on reasonable grounds.
      </LegalSection>

      <LegalSection heading="6. International transfers">
        Where personal data is transferred outside its region of origin, AdNexus AI relies on
        appropriate safeguards such as the European Commission&apos;s Standard Contractual Clauses or
        equivalent mechanisms recognized under applicable law.
      </LegalSection>

      <LegalSection heading="7. Return and deletion of data">
        Upon termination of the service, AdNexus AI will, at the Customer&apos;s choice, delete or
        return all personal data processed on the Customer&apos;s behalf, unless retention is required
        by law.
      </LegalSection>

      <LegalSection heading="8. Data subject requests and assistance">
        AdNexus AI will provide reasonable assistance to the Customer in responding to data subject
        requests and in meeting the Customer&apos;s obligations regarding security, breach notification,
        and data protection impact assessments.
      </LegalSection>

      <LegalSection heading="9. Personal data breach">
        AdNexus AI will notify the Customer without undue delay after becoming aware of a personal data
        breach affecting the Customer&apos;s data, and will provide information reasonably necessary for
        the Customer to meet its notification obligations.
      </LegalSection>

      <LegalSection heading="10. Executing a signed DPA">
        To execute a countersigned DPA for your organization, contact{' '}
        <a href="mailto:legal@adnexus.ai" style={{ color: '#c3f53b' }}>legal@adnexus.ai</a>.
      </LegalSection>
    </LegalPage>
  );
}
