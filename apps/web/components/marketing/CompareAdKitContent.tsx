'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  X,
  Shield,
  Cpu,
  Bell,
  ArrowRight,
  Sparkles,
  Layers,
  BarChart3,
  Zap,
  DollarSign,
  Users,
  FileText,
  Palette,
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

interface ComparisonRow {
  feature: string;
  adnexus: boolean | string;
  adkit: boolean | string;
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
      { feature: 'Meta Ads', adnexus: true, adkit: true },
      { feature: 'Google Ads', adnexus: true, adkit: true },
      { feature: 'TikTok Ads', adnexus: true, adkit: false },
      { feature: 'Snapchat Ads', adnexus: true, adkit: false },
      { feature: '4 platforms total', adnexus: true, adkit: '3 platforms' },
    ],
  },
  {
    name: 'AI & Automation',
    icon: Cpu,
    rows: [
      { feature: 'Draft-first approval workflow', adnexus: true, adkit: true },
      { feature: 'AI-powered recommendations', adnexus: true, adkit: true },
      { feature: 'MCP/AI agent native integration', adnexus: true, adkit: false },
      { feature: 'Creative fatigue detection', adnexus: true, adkit: false },
      { feature: 'Anomaly detection', adnexus: true, adkit: true },
      { feature: 'Automated budget pacing', adnexus: true, adkit: true },
    ],
  },
  {
    name: 'Reporting & Insights',
    icon: BarChart3,
    rows: [
      { feature: 'Scheduled reports', adnexus: true, adkit: false },
      { feature: 'White-label reports', adnexus: true, adkit: false },
      { feature: 'Morning brief email', adnexus: true, adkit: false },
      { feature: 'Cross-account dashboards', adnexus: true, adkit: true },
      { feature: 'Custom report builder', adnexus: true, adkit: false },
      { feature: 'PDF export', adnexus: true, adkit: true },
    ],
  },
  {
    name: 'Collaboration',
    icon: Users,
    rows: [
      { feature: 'Team workspaces', adnexus: true, adkit: false },
      { feature: 'Role-based access (RBAC)', adnexus: true, adkit: false },
      { feature: 'Comment & annotation on drafts', adnexus: true, adkit: false },
      { feature: 'Slack notifications', adnexus: true, adkit: false },
      { feature: 'Approval workflows', adnexus: true, adkit: true },
    ],
  },
  {
    name: 'Competitor Intelligence',
    icon: Shield,
    rows: [
      { feature: 'Ad library / competitor tracking', adnexus: false, adkit: true, note: 'AdKit strength' },
      { feature: 'Competitor spend estimates', adnexus: false, adkit: true },
      { feature: 'Creative inspiration feed', adnexus: false, adkit: true },
    ],
  },
  {
    name: 'Pricing',
    icon: DollarSign,
    rows: [
      { feature: 'Free tier', adnexus: true, adkit: true },
      { feature: 'Starting price', adnexus: '$49/mo', adkit: '$49/mo' },
      { feature: 'Team plan', adnexus: '$149/mo', adkit: '$97/mo' },
      { feature: 'Agency plan', adnexus: '$399/mo', adkit: 'N/A' },
      { feature: 'Transparent self-serve pricing', adnexus: true, adkit: true },
    ],
  },
];

export function CompareAdKitContent() {
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);

  const scrollToCTA = () => ctaRef.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-[#08090a] text-white">

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-20 pb-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(56,189,248,0.12),transparent)]" />
        <div className="relative mx-auto max-w-5xl text-center">
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-sm font-medium text-sky-400 ring-1 ring-white/10">
              <Zap size={14} /> Competitive Comparison
            </span>
          </motion.div>
          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
          >
            AdNexus AI <span className="text-sky-400">vs</span> AdKit
          </motion.h1>
          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400"
          >
            Both platforms offer draft-first approval workflows and AI recommendations.
            AdNexus AI goes further with 4 platform support, team workspaces, white-label reports, and MCP-native AI agent integration.
          </motion.p>
          <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible" className="mt-8 flex justify-center gap-4">
            <button
              onClick={scrollToCTA}
              className="rounded-lg bg-sky-500 px-6 py-3 font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-400"
            >
              See Your Opportunities
            </button>
            <a href="/pricing" className="rounded-lg border border-white/10 px-6 py-3 font-semibold text-zinc-300 transition hover:bg-white/5">
              View Pricing
            </a>
          </motion.div>
        </div>
      </section>

      {/* Quick Summary */}
      <section className="px-6 py-12">
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
          {[
            { label: 'Platforms', adnexus: '4', adkit: '3', icon: Layers },
            { label: 'Starting Price', adnexus: '$49/mo', adkit: '$49/mo', icon: DollarSign },
            { label: 'Team Workspaces', adnexus: 'Up to 25', adkit: 'None', icon: Users },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center"
            >
              <item.icon className="mx-auto mb-3 text-sky-400" size={24} />
              <p className="text-sm text-zinc-500">{item.label}</p>
              <p className="mt-1 text-xl font-bold">{item.adnexus}</p>
              <p className="text-sm text-zinc-500">vs AdKit: {item.adkit}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-center text-3xl font-bold">Feature-by-Feature Comparison</h2>
          <div className="space-y-8">
            {(showAllFeatures ? comparisonCategories : comparisonCategories.slice(0, 4)).map((cat) => (
              <div key={cat.name}>
                <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-sky-400">
                  <cat.icon size={20} />
                  {cat.name}
                </div>
                <div className="overflow-hidden rounded-xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03]">
                        <th className="px-4 py-3 text-left font-medium text-zinc-400">Feature</th>
                        <th className="px-4 py-3 text-center font-medium text-sky-400">AdNexus AI</th>
                        <th className="px-4 py-3 text-center font-medium text-emerald-400">AdKit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.rows.map((row) => (
                        <tr key={row.feature} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-zinc-300">
                            {row.feature}
                            {row.note && <span className="ml-2 text-xs text-zinc-600">({row.note})</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {typeof row.adnexus === 'boolean' ? (
                              row.adnexus ? <Check size={16} className="mx-auto text-sky-400" /> : <X size={16} className="mx-auto text-zinc-600" />
                            ) : (
                              <span className="text-sky-300">{row.adnexus}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {typeof row.adkit === 'boolean' ? (
                              row.adkit ? <Check size={16} className="mx-auto text-emerald-400" /> : <X size={16} className="mx-auto text-zinc-600" />
                            ) : (
                              <span className="text-emerald-300">{row.adkit}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
          {comparisonCategories.length > 4 && (
            <div className="mt-6 text-center">
              <button onClick={() => setShowAllFeatures(!showAllFeatures)} className="text-sm text-sky-400 hover:underline">
                {showAllFeatures ? 'Show less' : `Show all ${comparisonCategories.length} categories`}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Strengths acknowledgment */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-center text-3xl font-bold">Where AdKit Shines</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { icon: Shield, title: 'Ad Library', desc: 'Comprehensive competitor creative tracking and ad library for inspiration.' },
              { icon: BarChart3, title: 'Spend Intelligence', desc: 'Estimates competitor spend and provides market-level benchmarks.' },
              { icon: FileText, title: 'Draft-First Workflow', desc: 'Both platforms offer draft-first approval, showing market alignment.' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-6"
              >
                <item.icon className="mb-3 text-emerald-400" size={24} />
                <h3 className="font-semibold text-emerald-300">{item.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaRef} className="px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 className="text-3xl font-bold sm:text-4xl">
              See Your Ad Opportunities <span className="text-sky-400">Today</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-zinc-400">
              Get a free AI-powered audit of your ad accounts. No credit card required.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <a href="/auth/signup" className="rounded-lg bg-sky-500 px-8 py-3 font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-400">
                Start Free Audit
              </a>
              <a href="/compare/pipeboard" className="rounded-lg border border-white/10 px-8 py-3 font-semibold text-zinc-300 transition hover:bg-white/5">
                Compare vs Pipeboard
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
