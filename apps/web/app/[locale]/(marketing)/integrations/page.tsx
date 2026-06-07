import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { IntegrationStatusGrid, OAuthFlowDiagram, MCPShowcase } from '@/components/marketing/v4';
import { Section } from '@/components/marketing/sections';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  return {
    title: 'Integrations — AdNexus AI',
    description: 'Connect Meta, Google, TikTok, and Snap Ads. OAuth-secured, draft-first, MCP-native.',
    openGraph: { title: 'Integrations — AdNexus AI', description: 'Connect Meta, Google, TikTok, and Snap Ads. OAuth-secured, draft-first, MCP-native.' },
  };
}

export default async function IntegrationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)]">
      <section className="pt-28 pb-16 px-4 text-center">
        <span className="inline-block text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: '#c3f53b' }}>Connections</span>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 max-w-2xl mx-auto">One brain. Four platforms.</h1>
        <p className="text-base max-w-xl mx-auto mb-2" style={{ color: 'var(--text-secondary)' }}>
          Connect your ad accounts in under two minutes. OAuth-secured, no passwords stored.
        </p>
        <p className="text-[13px] max-w-xl mx-auto" style={{ color: 'var(--text-tertiary)' }}>
          Meta, Google, TikTok, and Snap — all synced to a single AI that drafts optimizations across every channel.
        </p>
      </section>

      <Section title="Connected platforms" subtitle="Real-time sync across all major ad platforms">
        <IntegrationStatusGrid />
      </Section>

      <Section title="Secure by design" subtitle="OAuth 2.0 with least-privilege scopes">
        <OAuthFlowDiagram />
      </Section>

      <Section title="MCP-native" subtitle="Talk to your campaigns from Claude, ChatGPT, or Cursor">
        <MCPShowcase />
      </Section>
    </main>
  );
}
