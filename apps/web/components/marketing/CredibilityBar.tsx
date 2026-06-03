'use client';

import { Cable, ShieldCheck, GitBranch, Lock } from 'lucide-react';

/**
 * Honest pre-launch credibility bar. No customer logos or invented metrics —
 * it leads with verifiable architecture facts: official partner APIs, the open
 * MCP standard, draft-first-by-design, and security posture.
 */

const PLATFORMS = [
  { name: 'Meta', color: '#1877F2' },
  { name: 'Google', color: '#DB4437' },
  { name: 'TikTok', color: '#00F2EA' },
  { name: 'Snap', color: '#FFFC00' },
];

const SIGNALS = [
  { icon: <Cable size={15} aria-hidden="true" />, label: 'MCP-native', sub: 'Open standard' },
  { icon: <ShieldCheck size={15} aria-hidden="true" />, label: 'Draft-first', sub: 'By architecture' },
  { icon: <Lock size={15} aria-hidden="true" />, label: 'OAuth only', sub: 'Never your passwords' },
  { icon: <GitBranch size={15} aria-hidden="true" />, label: 'Full audit trail', sub: 'Every change logged' },
];

export function CredibilityBar() {
  return (
    <section
      className="w-full py-10 px-6"
      style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div className="max-w-6xl mx-auto">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.12em] mb-6" style={{ color: 'var(--text-tertiary)' }}>
          Built on the official APIs you already trust
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 mb-8">
          {PLATFORMS.map((p) => (
            <span key={p.name} className="inline-flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} aria-hidden="true" />
              <span className="font-space text-base font-semibold text-white">{p.name}</span>
            </span>
          ))}
          <span className="hidden sm:inline text-sm" style={{ color: 'var(--text-tertiary)' }}>
            + any MCP client (Claude, ChatGPT, Cursor)
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
          {SIGNALS.map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
            >
              <span style={{ color: 'var(--accent)' }}>{s.icon}</span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-white truncate">{s.label}</span>
                <span className="block text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{s.sub}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
