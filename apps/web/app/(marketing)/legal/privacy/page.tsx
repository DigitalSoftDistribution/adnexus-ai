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
    <LegalPage title="Privacy Policy" updated="June 2, 2026">
      <LegalSection heading="1. Information we collect">
        <strong>Account information you provide:</strong> name, email address, company name, and any
        profile details you choose to add when creating an AdNexus AI account.
        <br /><br />
        <strong>Advertising data we access:</strong> campaign metadata, performance metrics, audience
        data, and creative assets from the ad platforms you connect (Meta, Google, TikTok, Snap)
        through their official OAuth APIs. We do not collect or store your platform passwords.
        <br /><br />
        <strong>Usage data:</strong> product interaction data (features used, session duration) to
        improve the service. This is aggregated and does not identify individual users.
      </LegalSection>

      <LegalSection heading="2. How we use your information">
        To operate and deliver the AdNexus AI service: analyzing campaign performance, generating
        AI-powered optimization drafts, sending the alerts and reports you configure, and providing
        customer support. We may use de-identified, aggregated data to improve our AI models and
        product features.
      </LegalSection>

      <LegalSection heading="3. How we share your information">
        We do not sell your personal data. We share data only with:
        <br /><br />
        <strong>Service providers:</strong> infrastructure, hosting, and analytics providers that help
        us run the service, all under contract and confidentiality obligations.
        <br />
        <strong>Ad platforms:</strong> when you approve a change through our draft-first workflow,
        your instructions are transmitted to the relevant platform via its official API.
        <br />
        <strong>Legal obligations:</strong> if required by law, court order, or to protect the rights
        and safety of AdNexus AI and our users.
      </LegalSection>

      <LegalSection heading="4. Data retention and deletion">
        We retain your campaign data while your account is active or as needed to provide the service.
        You may delete your account at any time; associated data is permanently removed within 30 days
        except where retention is required by law or legitimate business purposes (e.g., billing
        records).
      </LegalSection>

      <LegalSection heading="5. Data security">
        We implement industry-standard security measures including encryption in transit (TLS) and at
        rest, least-privilege role-based access controls, and audit logging of all mutating actions.
        Platform access tokens are encrypted at rest. Our security posture is detailed on the{' '}
        <a href="/security" style={{ color: '#c3f53b' }}>Security page</a>.
      </LegalSection>

      <LegalSection heading="6. International data transfers">
        AdNexus AI is operated in the European Union. Where data is transferred across regions, we
        rely on standard contractual clauses and other lawful transfer mechanisms. A Data Processing
        Agreement is available on request.
      </LegalSection>

      <LegalSection heading="7. Your rights">
        Depending on your jurisdiction, you may have rights to access, correct, delete, or port your
        data. To exercise any of these rights, contact{' '}
        <a href="mailto:legal@adnexus.ai" style={{ color: '#c3f53b' }}>legal@adnexus.ai</a>. We respond
        within 30 days.
      </LegalSection>

      <LegalSection heading="8. Updates to this policy">
        We may update this policy from time to time. Material changes will be communicated via email
        and/or in-app notice. Continued use after changes are posted constitutes acceptance.
      </LegalSection>

      <LegalSection heading="9. Contact">
        Questions about this policy or our data practices? Email{' '}
        <a href="mailto:legal@adnexus.ai" style={{ color: '#c3f53b' }}>legal@adnexus.ai</a>.
      </LegalSection>
    </LegalPage>
  );
}
