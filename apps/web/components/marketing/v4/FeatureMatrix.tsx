'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@/i18n/navigation';
import { Bot, CheckCircle2, Globe, ArrowRight, Sparkles, Pencil, Check, Eye } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

const TABS = [
  { id: 'ai-agent', label: 'AI Agent', icon: <Bot size={16} /> },
  { id: 'approvals', label: 'Approval Workflow', icon: <CheckCircle2 size={16} /> },
  { id: 'platforms', label: 'Cross-Platform', icon: <Globe size={16} /> },
];

const TAB_CONTENT: Record<string, {
  headline: string;
  desc: string;
  features: { title: string; desc: string }[];
  cta: { label: string; href: string };
  mockup: React.ReactNode;
}> = {
  'ai-agent': {
    headline: 'An analyst that never sleeps',
    desc: 'The AI monitors your campaigns 24/7, detects issues before they become expensive, and drafts optimizations for your approval.',
    features: [
      { title: 'Predictive detection', desc: 'Forecasts spend, ROAS, and creative fatigue before they hit.' },
      { title: 'Explains its reasoning', desc: 'Every draft comes with the metric that triggered it and expected impact.' },
      { title: 'MCP-native', desc: 'Query and direct the agent from Claude, ChatGPT, or Cursor.' },
    ],
    cta: { label: 'Explore AI Agent', href: '/features/ai-agent' },
    mockup: (
      <div className="space-y-2">
        {[
          { platform: 'Meta', color: '#1877F2', title: 'Shift budget to retargeting', why: 'ROAS 5.1x vs 2.3x' },
          { platform: 'Google', color: '#DB4437', title: 'Pause underperforming ad group', why: 'CPA 3.2x target' },
        ].map((d) => (
          <div key={d.title} className="rounded-lg p-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: d.color }} />
              <span className="text-[9px] font-semibold uppercase" style={{ color: 'var(--text-tertiary)' }}>{d.platform}</span>
            </div>
            <p className="text-[11px] font-semibold text-white">{d.title}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{d.why}</p>
          </div>
        ))}
      </div>
    ),
  },
  'approvals': {
    headline: 'Nothing goes live without your say',
    desc: 'Every AI-generated change is staged as a draft. Review, edit, approve, or reject — with a full audit trail.',
    features: [
      { title: 'Draft-first by design', desc: 'AI suggestions never touch live campaigns directly.' },
      { title: 'Edit before you ship', desc: 'Tweak budgets, audiences, or copy inline.' },
      { title: 'Multi-tier workflows', desc: 'Junior reviewers suggest, senior approvers sign off.' },
    ],
    cta: { label: 'Explore Approvals', href: '/features/approvals' },
    mockup: (
      <div className="flex items-center gap-2">
        {['Draft', 'Review', 'Edit', 'Approve'].map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div className="text-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold mx-auto mb-1" style={{ background: i <= 2 ? 'rgba(195,245,59,0.1)' : 'var(--bg-primary)', color: i <= 2 ? '#c3f53b' : 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                {i + 1}
              </div>
              <span className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>{step}</span>
            </div>
            {i < 3 && <div className="w-4 h-px" style={{ background: 'var(--border-subtle)' }} />}
          </div>
        ))}
      </div>
    ),
  },
  'platforms': {
    headline: 'One brain, four platforms',
    desc: 'Meta, Google, TikTok, and Snap — unified in one workspace with consistent workflows across all four.',
    features: [
      { title: 'Unified dashboard', desc: 'See all four platforms in a single view.' },
      { title: 'Cross-platform attribution', desc: 'True contribution of each channel, not siloed reports.' },
      { title: 'Smart budget shifting', desc: 'AI moves budget to wherever it performs best.' },
    ],
    cta: { label: 'Explore Platforms', href: '/features/platforms' },
    mockup: (
      <div className="grid grid-cols-2 gap-2">
        {[
          { name: 'Meta', color: '#1877F2', status: 'Connected' },
          { name: 'Google', color: '#DB4437', status: 'Connected' },
          { name: 'TikTok', color: '#00F2EA', status: 'Read-only' },
          { name: 'Snap', color: '#FFFC00', status: 'Coming soon' },
        ].map((p) => (
          <div key={p.name} className="rounded-lg p-2.5 flex items-center gap-2" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <div>
              <div className="text-[10px] font-semibold text-white">{p.name}</div>
              <div className="text-[9px]" style={{ color: 'var(--status-active)' }}>{p.status}</div>
            </div>
          </div>
        ))}
      </div>
    ),
  },
};

export function FeatureMatrix() {
  const { ref, isVisible } = useScrollAnimation(0.15);
  const [activeTab, setActiveTab] = useState('ai-agent');
  const content = TAB_CONTENT[activeTab];

  return (
    <section ref={ref} className="w-full py-24 px-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: easeSmooth }}
          className="text-center mb-12"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: '#c3f53b' }}>Explore</span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">Three foundations, deeply integrated</h2>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1, ease: easeSmooth }}
          className="flex items-center justify-center gap-2 mb-10"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: activeTab === tab.id ? 'rgba(195,245,59,0.1)' : 'var(--bg-elevated)',
                color: activeTab === tab.id ? '#c3f53b' : 'var(--text-secondary)',
                border: activeTab === tab.id ? '1px solid rgba(195,245,59,0.3)' : '1px solid var(--border-subtle)',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3, ease: easeSmooth }}
            className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10 items-center"
          >
            {/* Left: copy */}
            <div>
              <h3 className="font-space text-2xl font-semibold text-white mb-3">{content.headline}</h3>
              <p className="text-[14px] leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>{content.desc}</p>
              <div className="space-y-4 mb-8">
                {content.features.map((f, i) => (
                  <div key={f.title} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(195,245,59,0.1)' }}>
                      <Check size={12} style={{ color: '#c3f53b' }} />
                    </span>
                    <div>
                      <span className="block text-sm font-semibold text-white mb-0.5">{f.title}</span>
                      <span className="block text-[12px]" style={{ color: 'var(--text-secondary)' }}>{f.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href={content.cta.href}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-lg transition-all hover:scale-[1.02]"
                style={{ background: '#c3f53b', color: '#0a0a0a' }}
              >
                {content.cta.label}
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* Right: mockup */}
            <div className="rounded-xl p-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', boxShadow: '0 25px 80px rgba(0,0,0,0.4)' }}>
              <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                  <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                  <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                </span>
                <span className="flex-1 text-center text-[10px] font-mono-data" style={{ color: 'var(--text-tertiary)' }}>
                  {TABS.find(t => t.id === activeTab)?.label}
                </span>
              </div>
              {content.mockup}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
