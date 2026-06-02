import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/marketing/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How AdNexus AI collects, uses, and protects your data.',
  alternates: { canonical: '/legal/privacy' },
  robots: { index: false },
};

export default function Page() {
  return (
    <LegalPage title="Privacy Policy" updated="June 2026">
      <LegalSection heading="What we collect">
        Account details you provide (name, email, company) and the advertising data we access via OAuth
        from the ad platforms you connect. We do not collect platform passwords.
      </LegalSection>
      <LegalSection heading="How we use it">
        To operate the service: analyzing campaign performance, generating optimization drafts, and
        sending the reports and alerts you configure. We do not sell your data.
      </LegalSection>
      <LegalSection heading="Data sharing">
        We share data only with sub-processors required to run the service (e.g. hosting, infrastructure)
        under contract. A current sub-processor list is available on request.
      </LegalSection>
      <LegalSection heading="Your rights">
        You can access, export, or delete your data at any time from account settings or by contacting us.
      </LegalSection>
      <LegalSection heading="Contact">
        Questions about privacy? Email legal@adnexus.ai.
      </LegalSection>
    </LegalPage>
  );
}
