import type { Metadata } from 'next';
import { Cable, Slack, Bot } from 'lucide-react';
import { PageHero, Section, CtaBand } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'Integrations',
  description:
    'AdNexus AI connects to Meta, Google, TikTok, and Snap ad platforms, plus MCP clients like Claude and ChatGPT, Slack alerts, and an API for custom workflows.',
  alternates: { canonical: '/integrations' },
};

const PLATFORMS = [
  { name: 'Meta Ads', color: '#1877F2', detail: 'Facebook & Instagram — full write access' },
  { name: 'Google Ads', color: '#DB4437', detail: 'Search, Display, PMax, Demand Gen' },
  { name: 'TikTok Ads', color: '#00F2EA', detail: 'Campaign, ad group, creative management' },
  { name: 'Snap Ads', color: '#FFFC00', detail: 'Snap, Story & Collection Ads' },
];

const TOOLS = [
  { icon: <Bot size={22} style={{ color: '#A78BFA' }} aria-hidden="true" />, title: 'MCP Clients', desc: 'Claude, ChatGPT, Cursor, and any MCP-compatible assistant connect natively.' },
  { icon: <Slack size={22} style={{ color: '#34D399' }} aria-hidden="true" />, title: 'Slack', desc: 'Get alerts and approval requests where your team already works.' },
  { icon: <Cable size={22} style={{ color: '#2563EB' }} aria-hidden="true" />, title: 'API & Webhooks', desc: 'Build custom automations on top of AdNexus with our REST API and event webhooks.' },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Integrations"
        title={<>Connects to <span style={{ color: '#c3f53b' }}>your stack</span></>}
        subtitle="Every major ad platform, your favorite AI assistants, and the tools your team already uses."
      />

      <Section title="Ad platforms">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLATFORMS.map((p) => (
            <div key={p.name} className="card-surface p-5">
              <span className="w-3 h-3 rounded-full block mb-3" style={{ background: p.color }} aria-hidden="true" />
              <h3 className="text-sm font-semibold text-white mb-1">{p.name}</h3>
              <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{p.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tools & automation" alt>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TOOLS.map((t) => (
            <div key={t.title} className="card-surface p-6 hover-lift">
              <div className="mb-3">{t.icon}</div>
              <h3 className="text-base font-semibold text-white mb-2">{t.title}</h3>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand title="Connect everything in minutes" subtitle="Link your platforms and assistants with secure OAuth and start optimizing." />
    </>
  );
}
