// @ts-nocheck
import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import {
  Check,
  X,
  Shield,
  Cpu,
  Bell,
  ArrowRight,
  Sparkles,
  MessageSquare,
  Layers,
  BarChart3,
  Zap,
  DollarSign,
  Users,
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
  pipeboard: boolean | string;
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
      { feature: 'Meta Ads', adnexus: true, pipeboard: true, note: 'Native + MCP passthrough' },
      { feature: 'Google Ads', adnexus: true, pipeboard: true },
      { feature: 'TikTok Ads', adnexus: true, pipeboard: true },
      { feature: 'Snap Ads', adnexus: true, pipeboard: true },
      { feature: 'MCP Server', adnexus: true, pipeboard: true, note: 'Official Meta MCP' },
    ],
  },
  {
    name: 'AI Features',
    icon: Cpu,
    rows: [
      { feature: 'Creative Fatigue Detection', adnexus: true, pipeboard: false },
      { feature: 'Anomaly Detection', adnexus: true, pipeboard: false, note: 'Statistical + ML' },
      { feature: 'Morning Brief', adnexus: true, pipeboard: false, note: 'Daily AI summary' },
      { feature: 'AI Recommendations', adnexus: true, pipeboard: false },
      { feature: 'Curated Tool Surface', adnexus: '30 tools', pipeboard: '120+ tools', note: '30 beats 120 for LLM reasoning' },
    ],
  },
  {
    name: 'Draft Workflow',
    icon: Shield,
    rows: [
      { feature: 'Draft-First Workflow', adnexus: true, pipeboard: false, note: 'All writes staged for approval' },
      { feature: 'Visual Dashboard', adnexus: true, pipeboard: false, note: 'Bento grid vs chat only' },
      { feature: 'Campaign Management UI', adnexus: true, pipeboard: false, note: 'Full CRUD interface' },
      { feature: 'Audit Log', adnexus: true, pipeboard: false, note: 'Full audit trail' },
    ],
  },
  {
    name: 'Reporting',
    icon: BarChart3,
    rows: [
      { feature: 'Performance Dashboard', adnexus: true, pipeboard: true },
      { feature: 'White-Label Reports', adnexus: true, pipeboard: false },
      { feature: 'Scheduled Reports', adnexus: true, pipeboard: true },
      { feature: 'Cross-Platform Attribution', adnexus: true, pipeboard: false },
    ],
  },
  {
    name: 'Pricing',
    icon: DollarSign,
    rows: [
      { feature: 'Free Tier', adnexus: true, pipeboard: true },
      { feature: 'Pro Plan', adnexus: '$99/mo flat', pipeboard: '$149/mo' },
      { feature: 'Agency Plan', adnexus: '$499/mo flat', pipeboard: 'Custom pricing' },
      { feature: 'Hidden Fees', adnexus: false, pipeboard: true, note: 'Tracking costs extra' },
    ],
  },
  {
    name: 'Integrations',
    icon: Zap,
    rows: [
      { feature: 'Slack Notifications', adnexus: true, pipeboard: false },
      { feature: 'Multi-Account Scoping', adnexus: true, pipeboard: false, note: 'Per-client isolation' },
      { feature: 'API Access', adnexus: true, pipeboard: true },
      { feature: 'Webhook Support', adnexus: true, pipeboard: false },
    ],
  },
];

const differentiators = [
  {
    icon: Shield,
    title: 'Drafts, Not Deploys',
    description:
      'Every change is staged for your approval. Nothing touches live accounts without explicit sign-off. Pipeboard deploys paused; we deploy drafts.',
    gradient: 'from-emerald-500/20 to-teal-500/10',
    iconColor: '#34D399',
  },
  {
    icon: Cpu,
    title: '30 Tools, Not 120',
    description:
      'Curated tool surface designed for LLM reasoning. Lower token costs, higher accuracy, faster responses.',
    gradient: 'from-blue-500/20 to-indigo-500/10',
    iconColor: '#60A5FA',
  },
  {
    icon: Bell,
    title: 'Proactive, Not Reactive',
    description:
      'Morning Briefs, anomaly detection, and creative fatigue alerts delivered to your inbox daily. Pipeboard waits for you to ask.',
    gradient: 'from-amber-500/20 to-orange-500/10',
    iconColor: '#FBBF24',
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

export default function ComparePipeboard() {
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
    <SEO
      title="AdNexus AI vs Pipeboard"
      description="Compare AdNexus AI with Pipeboard. See why marketing teams choose AdNexus AI for AI-powered campaign management and optimization."
      keywords="AdNexus vs Pipeboard, Pipeboard alternative, campaign management comparison"
    />
    <div className="min-h-[100dvh]" style={{ background: 'var(--bg-primary)' }}>
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-6 pt-20 pb-24">
        <div className="absolute inset-0 opacity-25">
          <div
            className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[150px]"
            style={{ background: 'var(--accent-glow)' }}
          />
          <div
            className="absolute bottom-0 right-1/3 w-96 h-96 rounded-full blur-[120px]"
            style={{ background: 'rgba(16,185,129,0.08)' }}
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
              Pipeboard Alternative
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: easeSmooth }}
            className="font-space text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
          >
            <span className="text-gradient-blue">The Pipeboard Alternative</span>
            <br />
            <span style={{ color: 'var(--text-primary)' }}>Built for Agencies</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: easeSmooth }}
            className="font-inter text-lg sm:text-xl max-w-2xl mx-auto mb-10"
            style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}
          >
            Draft-first safety. Proactive agents. 30 tools your AI can actually reason about. All
            at a fraction of the cost.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: easeSmooth }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: 'var(--accent)',
                color: 'white',
                boxShadow: '0 0 30px rgba(37,99,235,0.2)',
              }}
            >
              Start Free
              <ArrowRight size={16} />
            </button>
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
              See how AdNexus AI stacks up against Pipeboard
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
            className="overflow-hidden rounded-xl"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {/* Header */}
            <div
              className="grid items-center"
              style={{
                gridTemplateColumns: '1fr 140px 140px',
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
                Pipeboard
              </div>
            </div>

            {/* Categories */}
            {filteredCategories.map((cat, catIdx) => (
              <div key={cat.name}>
                {/* Category header row */}
                <div
                  className="grid items-center px-4 sm:px-6 py-2.5"
                  style={{
                    gridTemplateColumns: '1fr 140px 140px',
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
                {cat.rows.map((row, i) => {
                  const _globalIdx = comparisonCategories.slice(0, catIdx).reduce((s, c) => s + c.rows.length, 0) + i;
                  void _globalIdx;
                  return (
                    <div
                      key={`${cat.name}-${row.feature}`}
                      className="grid items-center transition-colors duration-100 hover:bg-[#161616]"
                      style={{
                        gridTemplateColumns: '1fr 140px 140px',
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
                        <Cell value={row.pipeboard} highlight={false} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </motion.div>

          {/* Score summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2, ease: easeSmooth }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <div
              className="inline-flex items-center gap-3 px-5 py-3 rounded-xl"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: '#10B981' }}
                />
                <span className="font-inter text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  AdNexus AI: 20 wins
                </span>
              </div>
              <span style={{ color: 'var(--text-muted)' }}>|</span>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: '#555B66' }}
                />
                <span className="font-inter text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Pipeboard: 8 wins
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Why Agencies Choose ─── */}
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
              Why Agencies Choose AdNexus AI
            </h2>
            <p
              className="font-inter text-base max-w-xl mx-auto"
              style={{ color: 'var(--text-secondary)' }}
            >
              Built from the ground up for agencies managing multiple clients across platforms.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Users, title: 'Multi-Account', desc: 'Isolate clients with scoped access and per-account dashboards.', color: '#60A5FA' },
              { icon: Shield, title: 'Draft-First', desc: 'Every change staged for approval. No accidental deployments.', color: '#34D399' },
              { icon: Bell, title: 'Proactive Alerts', desc: 'Morning briefs, anomaly detection, and fatigue alerts daily.', color: '#FBBF24' },
              { icon: DollarSign, title: 'Flat Pricing', desc: 'Predictable costs. No per-account fees or hidden charges.', color: '#A78BFA' },
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
              className="font-space text-xl sm:text-2xl font-medium leading-relaxed mb-6"
              style={{ color: 'var(--text-primary)' }}
            >
              &ldquo;We switched from Pipeboard because we needed to SEE our data, not just chat
              about it. AdNexus&apos;s dashboard + proactive alerts caught a $400/day budget leak
              in 12 minutes.&rdquo;
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-space text-sm font-semibold"
                style={{
                  background: 'var(--bg-hover)',
                  color: 'var(--accent)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                SC
              </div>
              <div className="text-left">
                <p
                  className="font-inter text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Sarah Chen
                </p>
                <p className="font-inter text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Solo Media Buyer, 12 clients
                </p>
              </div>
            </div>
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
                <button
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    background: 'var(--accent)',
                    color: 'white',
                    boxShadow: '0 0 30px rgba(37,99,235,0.2)',
                  }}
                >
                  Start Free Trial
                  <ArrowRight size={16} />
                </button>
                <button
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  Talk to Founder
                </button>
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
