import type { Metadata } from 'next';
import { Cable, Slack, Bot } from 'lucide-react';
import { PageHero, Section, CtaBand, WorkflowSteps } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'Integrations',
  description:
    'AdNexus AI v1 launches with Meta Ads execution, plus read-only/coming-soon coverage for Google, TikTok, and Snap, MCP clients like Claude and ChatGPT, Slack alerts, and an API roadmap for custom workflows.',
  alternates: { canonical: '/integrations' },
};

const PLATFORMS = [
  { name: 'Meta Ads', color: '#1877F2', detail: 'Facebook & Instagram — launch-ready write access' },
  { name: 'Google Ads', color: '#DB4437', detail: 'Search, Display, PMax — read-only in v1' },
  { name: 'TikTok Ads', color: '#00F2EA', detail: 'Coming soon for managed write access' },
  { name: 'Snap Ads', color: '#FFFC00', detail: 'Coming soon for managed write access' },
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

      <Section eyebrow="How connection works" title="Secure by design, set up in two minutes">
        <WorkflowSteps
          steps={[
            { title: 'Authorize over OAuth', desc: 'Click connect and approve access through each platform\u2019s official OAuth screen. We never see or store your passwords.' },
            { title: 'We request only what we need', desc: 'Scopes are least-privilege. Tokens are encrypted at rest and can be revoked from your settings or the platform at any time.' },
            { title: 'The agent reads, then drafts', desc: 'AdNexus pulls live data through official APIs and the MCP layer, then stages every proposed change as a draft.' },
            { title: 'You stay in control', desc: 'Nothing writes back to a live Meta campaign until you explicitly execute an approved draft, and every action is recorded in the audit trail.' },
          ]}
        />
      </Section>

      <CtaBand title="Connect everything in minutes" subtitle="Link your platforms and assistants with secure OAuth and start optimizing." />
    </>
  );
}
