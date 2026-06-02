'use client';
import Link from 'next/link';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  X,
  Globe,
  Zap,
  DollarSign,
  ArrowRight,
  Sparkles,
  MessageSquare,
  Layers,
  Cpu,
  Shield,
  BarChart3,

  Code2,
} from 'lucide-react';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: easeSmooth },
  }),
};

/* ─── categorized comparison rows ─── */
interface ComparisonRow {
  feature: string;
  adnexus: boolean | string;
  madgicx: boolean | string;
  note?: string;
}

interface ComparisonCategory {
  name: string;
  icon: typeof Layers;
  rows: ComparisonRow[];
}

const comparisonCategories: ComparisonCategory[] = [
  {
    name: 'Platforms',
    icon: Layers,
    rows: [
      { feature: 'Meta Ads', adnexus: true, madgicx: true, note: 'Both native' },
      { feature: 'Google Ads', adnexus: true, madgicx: false },
      { feature: 'TikTok Ads', adnexus: true, madgicx: false },
      { feature: 'Snap Ads', adnexus: true, madgicx: false },
      { feature: 'MCP Server', adnexus: true, madgicx: false, note: 'AI-native protocol' },
      { feature: 'Cross-Platform', adnexus: true, madgicx: false, note: 'Single dashboard vs Meta-only' },
    ],
  },
  {
    name: 'AI Features',
    icon: Cpu,
    rows: [
      { feature: 'Creative Fatigue Detection', adnexus: true, madgicx: true },
      { feature: 'Anomaly Detection', adnexus: true, madgicx: false, note: 'Statistical + ML models' },
      { feature: 'Morning Brief', adnexus: true, madgicx: false, note: 'Daily AI summary to inbox' },
      { feature: 'AI Agent Integration', adnexus: true, madgicx: false, note: 'Claude, ChatGPT, Cursor' },
      { feature: 'AI Recommendations', adnexus: true, madgicx: true },
      { feature: 'Curated Tool Surface', adnexus: '30 tools', madgicx: 'N/A', note: 'MCP-native tool design' },
    ],
  },
  {
    name: 'Draft Workflow',
    icon: Shield,
    rows: [
      { feature: 'Draft-First Workflow', adnexus: true, madgicx: false, note: 'All writes staged for approval' },
      { feature: 'Visual Dashboard', adnexus: true, madgicx: true },
      { feature: 'Campaign Management UI', adnexus: true, madgicx: true },
      { feature: 'Audit Log', adnexus: true, madgicx: false, note: 'Full audit trail vs basic' },
    ],
  },
  {
    name: 'Reporting',
    icon: BarChart3,
    rows: [
      { feature: 'Performance Dashboard', adnexus: true, madgicx: true },
      { feature: 'White-Label Reports', adnexus: true, madgicx: true },
      { feature: 'Scheduled Reports', adnexus: true, madgicx: true },
      { feature: 'Cross-Platform Attribution', adnexus: true, madgicx: false },
    ],
  },
  {
    name: 'Pricing',
    icon: DollarSign,
    rows: [
      { feature: 'Free Tier', adnexus: true, madgicx: false },
      { feature: 'Scale plan', adnexus: '$149/mo flat', madgicx: '$99 + $49 tracking' },
      { feature: 'Agency Plan', adnexus: '$399/mo flat', madgicx: '$298+/mo' },
      { feature: 'Price Scales with Spend', adnexus: false, madgicx: true, note: 'Hidden cost escalation' },
    ],
  },
  {
    name: 'Integrations',
    icon: Code2,
    rows: [
      { feature: 'Slack Notifications', adnexus: true, madgicx: false },
      { feature: 'Multi-Account Scoping', adnexus: true, madgicx: true, note: 'Per-client isolation' },
      { feature: 'API Access', adnexus: true, madgicx: true },
      { feature: 'Webhook Support', adnexus: true, madgicx: false },
      { feature: 'MCP Client Support', adnexus: true, madgicx: false, note: 'Any MCP-compatible AI' },
    ],
  },
];

const differentiators = [
  {
    icon: Globe,
    title: '4 Platforms, Not 1',
    description:
      'Meta, Google, TikTok, Snap in one dashboard. No more switching between tools. Madgicx is Meta-only.',
    gradient: 'from-blue-500/20 to-indigo-500/10',
    iconColor: '#60A5FA',
  },
  {
    icon: Zap,
    title: 'MCP-Native Architecture',
    description:
      'Connect Claude, ChatGPT, Cursor directly to your ad data via the Model Context Protocol. Madgicx has no MCP layer.',
    gradient: 'from-amber-500/20 to-orange-500/10',
    iconColor: '#FBBF24',
  },
  {
    icon: DollarSign,
    title: 'Truly Flat Pricing',
    description:
      '$149/mo flat for everything. Madgicx charges $49-$99 PLUS $49 for tracking, and prices scale with ad spend.',
    gradient: 'from-emerald-500/20 to-teal-500/10',
    iconColor: '#34D399',
  },
];

/* ─── cell renderer ─── */
function Cell({
  value,
  highlight,
}: {
  value: boolean | string;
  highlight: boolean;
}) {
  if (typeof value === 'boolean') {
    if (value) {
      return (
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(16,185,129,0.2)' }}
        >
          <Check size={14} style={{ color: '#10B981' }} />
        </div>
      );
    }
    return (
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center"
        style={{ background: highlight ? 'rgba(239,68,68,0.15)' : 'rgba(85,91,102,0.2)' }}
      >
        <X size={14} style={{ color: highlight ? '#EF4444' : '#555B66' }} />
      </div>
    );
  }
  return (
    <span
      className="font-mono text-xs font-medium"
      style={{ color: highlight ? '#10B981' : 'var(--text-tertiary)' }}
    >
      {value}
    </span>
  );
}

/* ─── page component ─── */

export function CompareMadgicxContent() {
  const tableRef = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const scrollToTable = () => {
    tableRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredCategories = activeCategory
    ? comparisonCategories.filter((c) => c.name === activeCategory)
    : comparisonCategories;

  return (
    <>
    <div className="min-h-[100dvh]" style={{ background: 'var(--bg-primary)' }}>
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-6 pt-20 pb-24">
        <div className="absolute inset-0 opacity-25">
          <div
            className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[150px]"
            style={{ background: 'var(--accent-glow)' }}
          />
          <div
            className="absolute bottom-0 left-1/3 w-96 h-96 rounded-full blur-[120px]"
            style={{ background: 'rgba(245,158,11,0.08)' }}
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeSmooth }}
          >
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase mb-6"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <Sparkles size={14} style={{ color: 'var(--accent)' }} />
              Madgicx Alternative
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: easeSmooth }}
            className="font-space text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
          >
            <span className="text-gradient-blue">The Madgicx Alternative</span>
            <br />
            <span style={{ color: 'var(--text-primary)' }}>for Cross-Platform Teams</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: easeSmooth }}
            className="font-inter text-lg sm:text-xl max-w-2xl mx-auto mb-10"
            style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}
          >
            Madgicx is Meta-only. We cover Meta, Google, TikTok, and Snap — with MCP
            integration for AI agents. All at one flat price.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: easeSmooth }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/auth/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: 'var(--accent)',
                color: '#0a0a0a',
                boxShadow: '0 0 30px rgba(37,99,235,0.2)',
              }}
            >Start Free
              <ArrowRight size={16} />
            </Link>
            <button
              onClick={scrollToTable}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: 'transparent',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              See Feature Comparison
            </button>
          </motion.div>
        </div>
      </section>

      {/* ─── Differentiator Cards ─── */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {differentiators.map((card, i) => (
            <motion.div
              key={card.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              variants={fadeUp}
              className="group relative overflow-hidden rounded-xl p-6 transition-all duration-300 hover:-translate-y-1"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              />
              <div className="relative z-10">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: 'var(--bg-secondary)' }}
                >
                  <card.icon size={20} style={{ color: card.iconColor }} />
                </div>
                <h3
                  className="font-space text-lg font-semibold mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {card.title}
                </h3>
                <p
                  className="font-inter text-sm leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {card.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Comparison Table ─── */}
      <section ref={tableRef} className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, ease: easeSmooth }}
            className="text-center mb-12"
          >
            <h2
              className="font-space text-3xl sm:text-4xl font-semibold mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              Feature Comparison
            </h2>
            <p
              className="font-inter text-base"
              style={{ color: 'var(--text-secondary)' }}
            >
              See how AdNexus AI stacks up against Madgicx
            </p>
          </motion.div>

          {/* Category filter pills */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: easeSmooth }}
            className="flex flex-wrap justify-center gap-2 mb-8"
          >
            <button
              onClick={() => setActiveCategory(null)}
              className="px-4 py-2 rounded-full font-inter text-sm font-medium transition-all duration-200"
              style={{
                background: activeCategory === null ? 'rgba(37,99,235,0.15)' : 'transparent',
                color: activeCategory === null ? '#60A5FA' : 'var(--text-secondary)',
                border: `1px solid ${activeCategory === null ? 'rgba(37,99,235,0.15)' : 'var(--border-subtle)'}`,
              }}
            >
              All
            </button>
            {comparisonCategories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-inter text-sm font-medium transition-all duration-200"
                style={{
                  background: activeCategory === cat.name ? 'rgba(37,99,235,0.15)' : 'transparent',
                  color: activeCategory === cat.name ? '#60A5FA' : 'var(--text-secondary)',
                  border: `1px solid ${activeCategory === cat.name ? 'rgba(37,99,235,0.15)' : 'var(--border-subtle)'}`,
                }}
              >
                <cat.icon size={14} />
                {cat.name}
              </button>
            ))}
          </motion.div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, ease: easeSmooth }}
            className="overflow-x-auto rounded-xl"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {/* Header */}
            <div
              className="grid items-center"
              style={{
                gridTemplateColumns: '1fr 140px 140px', minWidth: '520px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div
                className="px-4 sm:px-6 py-4 font-inter text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                Feature
              </div>
              <div
                className="px-4 sm:px-6 py-4 font-inter text-xs font-semibold uppercase tracking-wider text-center"
                style={{ color: '#60A5FA' }}
              >
                AdNexus AI
              </div>
              <div
                className="px-4 sm:px-6 py-4 font-inter text-xs font-semibold uppercase tracking-wider text-center"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Madgicx
              </div>
            </div>

            {/* Categories */}
            {filteredCategories.map((cat, catIdx) => (
              <div key={cat.name}>
                {/* Category header row */}
                <div
                  className="grid items-center px-4 sm:px-6 py-2.5"
                  style={{
                    gridTemplateColumns: '1fr 140px 140px', minWidth: '520px',
                    background: 'rgba(37,99,235,0.04)',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <cat.icon size={14} style={{ color: 'var(--accent)' }} />
                    <span
                      className="font-inter text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--accent)' }}
                    >
                      {cat.name}
                    </span>
                  </div>
                </div>

                {/* Feature rows */}
                {cat.rows.map((row, i) => (
                  <div
                    key={`${cat.name}-${row.feature}`}
                    className="grid items-center transition-colors duration-100 hover:bg-[#161616]"
                    style={{
                      gridTemplateColumns: '1fr 140px 140px', minWidth: '520px',
                      borderBottom:
                        catIdx < filteredCategories.length - 1 || i < cat.rows.length - 1
                          ? '1px solid var(--border-subtle)'
                          : 'none',
                    }}
                  >
                    <div className="px-4 sm:px-6 py-4">
                      <span
                        className="font-inter text-sm font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {row.feature}
                      </span>
                      {row.note && (
                        <p
                          className="font-inter text-xs mt-0.5 hidden sm:block"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {row.note}
                        </p>
                      )}
                    </div>
                    <div className="px-4 sm:px-6 py-4 flex justify-center">
                      <Cell value={row.adnexus} highlight />
                    </div>
                    <div className="px-4 sm:px-6 py-4 flex justify-center">
                      <Cell value={row.madgicx} highlight={false} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </motion.div>

          {/* Score summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2, ease: easeSmooth }}
            className="mt-8 flex justify-center"
          >
            <div
              className="inline-flex items-center gap-3 px-5 py-3 rounded-xl"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: '#10B981' }} />
                <span
                  className="font-inter text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  AdNexus AI: 22 wins
                </span>
              </div>
              <span style={{ color: 'var(--text-muted)' }}>|</span>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: '#555B66' }} />
                <span
                  className="font-inter text-sm font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Madgicx: 7 wins
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Pricing Comparison ─── */}
      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, ease: easeSmooth }}
            className="text-center mb-12"
          >
            <h2
              className="font-space text-3xl sm:text-4xl font-semibold mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              Pricing Comparison
            </h2>
            <p className="font-inter text-base" style={{ color: 'var(--text-secondary)' }}>
              Transparent flat pricing vs stacked add-ons
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* AdNexus */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, ease: easeSmooth }}
              className="relative overflow-hidden rounded-xl p-6"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-active)',
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(ellipse at top, rgba(37,99,235,0.1) 0%, transparent 70%)',
                }}
              />
              <div className="relative z-10">
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4"
                  style={{ background: 'var(--accent)', color: '#0a0a0a' }}
                >
                  <Sparkles size={12} />
                  AdNexus AI
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span
                    className="font-space text-4xl font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    $149
                  </span>
                  <span className="font-inter text-sm" style={{ color: 'var(--text-secondary)' }}>
                    /mo
                  </span>
                </div>
                <p
                  className="font-inter text-sm mb-4"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Scale plan — all 4 platforms
                </p>
                <ul className="space-y-2">
                  {[
                    'Meta + Google + TikTok + Snap',
                    'MCP server included',
                    'Draft-first workflow',
                    'Morning Briefs',
                    'Anomaly detection',
                    'Cross-platform attribution',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check size={14} style={{ color: '#10B981' }} />
                      <span
                        className="font-inter text-sm"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Madgicx */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, ease: easeSmooth }}
              className="relative overflow-hidden rounded-xl p-6"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="relative z-10">
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4"
                  style={{
                    background: 'var(--bg-hover)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <Layers size={12} />
                  Madgicx
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span
                    className="font-space text-4xl font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    $148
                  </span>
                  <span className="font-inter text-sm" style={{ color: 'var(--text-secondary)' }}>
                    /mo
                  </span>
                </div>
                <p
                  className="font-inter text-sm mb-4"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Pro $99 + Tracking $49
                </p>
                <ul className="space-y-2">
                  {[
                    'Meta Ads only',
                    'No MCP server',
                    'No draft workflow',
                    'No Morning Briefs',
                    'No anomaly detection',
                    'Tracking costs extra',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <X size={14} style={{ color: '#555B66' }} />
                      <span
                        className="font-inter text-sm"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>

          {/* Savings callout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2, ease: easeSmooth }}
            className="text-center mt-8"
          >
            <span
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-inter text-sm font-medium"
              style={{
                background: 'rgba(16,185,129,0.1)',
                color: '#10B981',
                border: '1px solid rgba(16,185,129,0.2)',
              }}
            >
              <DollarSign size={16} />
              Save $588/year with AdNexus Pro
            </span>
          </motion.div>
        </div>
      </section>

      {/* ─── Differentiators Grid ─── */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, ease: easeSmooth }}
            className="text-center mb-12"
          >
            <h2
              className="font-space text-3xl sm:text-4xl font-semibold mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              Why Teams Switch to AdNexus AI
            </h2>
            <p
              className="font-inter text-base max-w-xl mx-auto"
              style={{ color: 'var(--text-secondary)' }}
            >
              Built for modern multi-platform teams who need AI-native workflows.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Globe, title: '4 Platforms', desc: 'Manage Meta, Google, TikTok, and Snap from one dashboard.', color: '#60A5FA' },
              { icon: Code2, title: 'MCP Support', desc: 'Connect any MCP-compatible AI agent directly to your ad data.', color: '#A78BFA' },
              { icon: Shield, title: 'Draft-First', desc: 'Every AI action is staged for approval before deployment.', color: '#34D399' },
              { icon: DollarSign, title: 'Flat Pricing', desc: 'No per-account fees. No hidden charges. Predictable costs.', color: '#FBBF24' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-30px' }}
                variants={fadeUp}
                className="group rounded-xl p-6 transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110"
                  style={{ background: 'var(--bg-secondary)' }}
                >
                  <item.icon size={20} style={{ color: item.color }} />
                </div>
                <h3
                  className="font-space text-base font-semibold mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {item.title}
                </h3>
                <p className="font-inter text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonial ─── */}
      <section className="px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, ease: easeSmooth }}
          className="max-w-3xl mx-auto text-center"
        >
          <div
            className="relative overflow-hidden rounded-xl p-8 sm:p-12"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background:
                  'radial-gradient(ellipse at top, rgba(37,99,235,0.1) 0%, transparent 70%)',
              }}
            />
            <MessageSquare
              size={32}
              className="mx-auto mb-6 opacity-40"
              style={{ color: 'var(--accent)' }}
            />
            <blockquote
              className="font-space text-xl sm:text-2xl font-medium leading-relaxed"
              style={{ color: 'var(--text-primary)' }}
            >
              Madgicx optimizes one platform and bills more as your spend grows. AdNexus coordinates{' '}
              <span style={{ color: 'var(--accent)' }}>Meta, Google, TikTok, and Snap from one brain</span>{' '}
              — with creative-fatigue detection and flat pricing that never scales with your budget.
            </blockquote>
          </div>
        </motion.div>
      </section>

      {/* ─── CTA ─── */}
      <section className="px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, ease: easeSmooth }}
          className="max-w-4xl mx-auto text-center"
        >
          <div
            className="relative overflow-hidden rounded-2xl p-8 sm:p-12"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse at top, rgba(37,99,235,0.08) 0%, transparent 60%)',
              }}
            />
            <div className="relative z-10">
              <h2
                className="font-space text-2xl sm:text-3xl font-semibold mb-4"
                style={{ color: 'var(--text-primary)' }}
              >
                Switching is Easy
              </h2>
              <p
                className="font-inter text-base max-w-xl mx-auto mb-8"
                style={{ color: 'var(--text-secondary)' }}
              >
                Connect your accounts and import all campaigns in under 5 minutes. Our team
                handles the rest.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/auth/signup"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    background: 'var(--accent)',
                    color: '#0a0a0a',
                    boxShadow: '0 0 30px rgba(37,99,235,0.2)',
                  }}
                >Start Free Trial
                  <ArrowRight size={16} />
                </Link>
                <Link href="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >Talk to Founder
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Utility styles */}
      <style>{`
        .text-gradient-blue {
          background: linear-gradient(135deg, #2563EB 0%, #60A5FA 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>
    </div>
    </>
  );
}
