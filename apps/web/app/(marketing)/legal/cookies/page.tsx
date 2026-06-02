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
    <LegalPage title="Cookie Policy" updated="June 2026">
      <LegalSection heading="What cookies we use">
        Essential cookies keep you signed in and the app functioning. We may use limited analytics cookies
        to understand product usage in aggregate.
      </LegalSection>
      <LegalSection heading="Managing cookies">
        You can control cookies through your browser settings. Disabling essential cookies may prevent
        parts of the service from working.
      </LegalSection>
      <LegalSection heading="Third parties">
        Any third-party analytics we use are listed in our sub-processor list, available on request.
      </LegalSection>
      <LegalSection heading="Contact">
        Questions about cookies? Email legal@adnexus.ai.
      </LegalSection>
    </LegalPage>
  );
}
