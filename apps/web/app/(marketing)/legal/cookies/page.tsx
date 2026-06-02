import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/marketing/LegalPage';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'How AdNexus AI uses cookies and similar technologies.',
  alternates: { canonical: '/legal/cookies' },
  robots: { index: false },
};

export default function Page() {
  return (
    <LegalPage title="Cookie Policy" updated="June 2, 2026">
      <LegalSection heading="1. What cookies are">
        Cookies are small text files placed on your device when you visit a website. They help the
        site function, remember your preferences, and understand how the site is used.
      </LegalSection>

      <LegalSection heading="2. Cookies we use">
        <strong>Strictly necessary cookies:</strong> required to keep you signed in, maintain your
        session, and operate core features. The Service cannot function properly without these.
        <br /><br />
        <strong>Preference cookies:</strong> remember choices such as theme and display settings.
        <br /><br />
        <strong>Analytics cookies:</strong> help us understand aggregate product usage so we can
        improve the Service. These do not identify you individually.
      </LegalSection>

      <LegalSection heading="3. Third-party cookies">
        Some analytics and infrastructure providers may set cookies on our behalf. Any such providers
        are listed in our sub-processor list, available on request, and are bound by contractual
        confidentiality and data-protection obligations.
      </LegalSection>

      <LegalSection heading="4. Managing cookies">
        You can control and delete cookies through your browser settings. Most browsers let you block
        or remove cookies, though disabling strictly necessary cookies may prevent parts of the Service
        from working. Where required by law, we request your consent before setting non-essential
        cookies.
      </LegalSection>

      <LegalSection heading="5. Updates to this policy">
        We may update this Cookie Policy as our practices evolve. Material changes will be reflected on
        this page with an updated effective date.
      </LegalSection>

      <LegalSection heading="6. Contact">
        Questions about our use of cookies? Email{' '}
        <a href="mailto:legal@adnexus.ai" style={{ color: '#c3f53b' }}>legal@adnexus.ai</a>.
      </LegalSection>
    </LegalPage>
  );
}
