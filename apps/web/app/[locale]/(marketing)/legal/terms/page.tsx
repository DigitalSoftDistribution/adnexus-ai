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
    <LegalPage title="Terms of Service" updated="June 2, 2026">
      <LegalSection heading="1. Acceptance of terms">
        By accessing or using AdNexus AI (&ldquo;the Service&rdquo;), you agree to be bound by
        these Terms of Service. If you are using the Service on behalf of an organization, you
        represent that you have the authority to bind that organization to these terms. If you
        do not agree, do not use the Service.
      </LegalSection>

      <LegalSection heading="2. Account registration">
        You must provide accurate, complete, and current information when creating an account.
        You are responsible for safeguarding your login credentials and for all activity on your
        account. Notify us immediately of any unauthorized use.
      </LegalSection>

      <LegalSection heading="3. Use of the Service">
        AdNexus AI provides AI-assisted advertising campaign management with a &ldquo;draft-first&rdquo;
        approval model. You acknowledge that:
        <br /><br />
        (a) AI-generated drafts are suggestions and must be reviewed and approved by you before
        publishing to ad platforms.
        <br />
        (b) You remain solely responsible for all approved changes and their compliance with
        ad platform policies and applicable law.
        <br />
        (c) You must use the Service in compliance with the terms of service of any connected
        ad platform.
      </LegalSection>

      <LegalSection heading="4. Acceptable use">
        You agree not to use the Service to violate ad platform policies, applicable law, or the
        rights of others. Prohibited activities include uploading malicious code, attempting to
        gain unauthorized access to the Service or related systems, and using the Service to
        distribute spam or fraudulent content.
      </LegalSection>

      <LegalSection heading="5. Fees and payment">
        Paid plans are billed monthly or annually as selected. Pricing is flat and does not scale
        with your ad spend. Fees are non-refundable except as required by law or stated in a
        specific promotion. You may cancel at any time; access continues through the end of the
        current billing period.
      </LegalSection>

      <LegalSection heading="6. Intellectual property">
        AdNexus AI and its original content, features, and functionality are owned by AdNexus AI
        and are protected by international copyright, trademark, and other intellectual property
        laws. Campaign data and creative assets you upload remain yours.
      </LegalSection>

      <LegalSection heading="7. Disclaimer of warranties">
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties
        of any kind, express or implied. We do not warrant that the Service will be uninterrupted,
        error-free, or that AI-generated drafts will achieve particular advertising outcomes.
      </LegalSection>

      <LegalSection heading="8. Limitation of liability">
        To the fullest extent permitted by applicable law, AdNexus AI and its officers, directors,
        employees, and agents shall not be liable for any indirect, incidental, special, consequential,
        or punitive damages arising from your use of the Service. Our total liability for any claim
        arising from these terms shall not exceed the amount you paid us in the 12 months preceding
        the claim.
      </LegalSection>

      <LegalSection heading="9. Termination">
        We may suspend or terminate your access to the Service for violation of these terms, without
        prior notice. Upon termination, your right to use the Service ceases immediately. Data
        retention and deletion are governed by our Privacy Policy.
      </LegalSection>

      <LegalSection heading="10. Governing law">
        These Terms shall be governed by and construed in accordance with the laws of Germany,
        without regard to its conflict of law provisions.
      </LegalSection>

      <LegalSection heading="11. Changes to these terms">
        We may modify these terms from time to time. Material changes will be communicated via email
        and/or in-app notice at least 14 days before they take effect. Continued use after changes
        take effect constitutes acceptance.
      </LegalSection>

      <LegalSection heading="12. Contact">
        Questions about these Terms? Email{' '}
        <a href="mailto:legal@adnexus.ai" style={{ color: '#c3f53b' }}>legal@adnexus.ai</a>.
      </LegalSection>
    </LegalPage>
  );
}
