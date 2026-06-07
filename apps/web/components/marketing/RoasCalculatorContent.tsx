'use client';

import { useState, useMemo } from 'react';
import { Link } from '@/i18n/navigation';
import { motion } from 'framer-motion';
import {
  Calculator,
  TrendingUp,
  DollarSign,
  MousePointerClick,
  Target,
  BarChart3,
  ArrowRight,
  Info,
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

interface MetricResult {
  label: string;
  value: string;
  description: string;
  icon: typeof DollarSign;
  color: string;
}

const benchmarks = [
  { channel: 'Meta Ads', goodRoas: '4:1', avgCtr: '0.9-1.5%', avgCvr: '2-3%', avgCpc: '$0.50-$2.00' },
  { channel: 'Google Search', goodRoas: '2:1', avgCtr: '3-5%', avgCvr: '3-5%', avgCpc: '$1.00-$3.00' },
  { channel: 'Google Shopping', goodRoas: '4:1', avgCtr: '0.5-1.5%', avgCvr: '1.5-3%', avgCpc: '$0.30-$1.50' },
  { channel: 'TikTok Ads', goodRoas: '2:1', avgCtr: '0.5-1.5%', avgCvr: '1-2%', avgCpc: '$0.20-$0.80' },
];

export function RoasCalculatorContent() {
  const [spend, setSpend] = useState('');
  const [revenue, setRevenue] = useState('');
  const [impressions, setImpressions] = useState('');
  const [clicks, setClicks] = useState('');
  const [conversions, setConversions] = useState('');

  const results = useMemo<MetricResult[]>(() => {
    const s = parseFloat(spend) || 0;
    const r = parseFloat(revenue) || 0;
    const imp = parseFloat(impressions) || 0;
    const cl = parseFloat(clicks) || 0;
    const conv = parseFloat(conversions) || 0;

    const metrics: MetricResult[] = [];

    const roas = s > 0 ? r / s : 0;
    metrics.push({
      label: 'ROAS',
      value: s > 0 ? `${roas.toFixed(2)}:1` : '—',
      description: roas >= 4 ? 'Excellent' : roas >= 2 ? 'Good' : roas >= 1 ? 'Break-even' : 'Below target',
      icon: TrendingUp,
      color: roas >= 4 ? 'text-emerald-400' : roas >= 2 ? 'text-sky-400' : roas >= 1 ? 'text-yellow-400' : 'text-red-400',
    });

    metrics.push({
      label: 'ROAS %',
      value: s > 0 ? `${(roas * 100).toFixed(1)}%` : '—',
      description: 'Return on ad spend as percentage',
      icon: BarChart3,
      color: 'text-sky-400',
    });

    const cpa = conv > 0 ? s / conv : 0;
    metrics.push({
      label: 'CPA',
      value: conv > 0 ? `$${cpa.toFixed(2)}` : '—',
      description: 'Cost per acquisition',
      icon: Target,
      color: cpa > 0 && cpa <= 20 ? 'text-emerald-400' : 'text-yellow-400',
    });

    const cpc = cl > 0 ? s / cl : 0;
    metrics.push({
      label: 'CPC',
      value: cl > 0 ? `$${cpc.toFixed(2)}` : '—',
      description: 'Cost per click',
      icon: DollarSign,
      color: 'text-sky-400',
    });

    const ctr = imp > 0 ? (cl / imp) * 100 : 0;
    metrics.push({
      label: 'CTR',
      value: imp > 0 ? `${ctr.toFixed(2)}%` : '—',
      description: 'Click-through rate',
      icon: MousePointerClick,
      color: ctr >= 1 ? 'text-emerald-400' : 'text-yellow-400',
    });

    const cvr = cl > 0 ? (conv / cl) * 100 : 0;
    metrics.push({
      label: 'CVR',
      value: cl > 0 ? `${cvr.toFixed(2)}%` : '—',
      description: 'Conversion rate',
      icon: Target,
      color: cvr >= 2 ? 'text-emerald-400' : 'text-yellow-400',
    });

    return metrics;
  }, [spend, revenue, impressions, clicks, conversions]);

  return (
    <div className="min-h-screen bg-[#08090a] text-white">

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-20 pb-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(56,189,248,0.12),transparent)]" />
        <div className="relative mx-auto max-w-3xl text-center">
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-sm font-medium text-sky-400 ring-1 ring-white/10">
              <Calculator size={14} /> Free Tool
            </span>
          </motion.div>
          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl"
          >
            ROAS Calculator
          </motion.h1>
          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mx-auto mt-4 max-w-xl text-lg text-zinc-400"
          >
            Calculate your Return on Ad Spend, CPA, CPC, CTR, and CVR instantly. Compare against industry benchmarks.
          </motion.p>
        </div>
      </section>

      {/* Calculator */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Inputs */}
            <motion.div
              custom={3}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="rounded-xl border border-white/10 bg-white/[0.03] p-6"
            >
              <h2 className="mb-6 text-lg font-semibold">Input Your Data</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-400">
                    Ad Spend ($) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={spend}
                    onChange={(e) => setSpend(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-zinc-600 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-400">
                    Revenue ($) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={revenue}
                    onChange={(e) => setRevenue(e.target.value)}
                    placeholder="e.g. 20000"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-zinc-600 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-400">Impressions</label>
                    <input
                      type="number"
                      value={impressions}
                      onChange={(e) => setImpressions(e.target.value)}
                      placeholder="100000"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-zinc-600 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-400">Clicks</label>
                    <input
                      type="number"
                      value={clicks}
                      onChange={(e) => setClicks(e.target.value)}
                      placeholder="1500"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-zinc-600 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-400">Conversions</label>
                    <input
                      type="number"
                      value={conversions}
                      onChange={(e) => setConversions(e.target.value)}
                      placeholder="50"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-zinc-600 outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>
              <p className="mt-4 flex items-start gap-2 text-xs text-zinc-600">
                <Info size={12} className="mt-0.5 shrink-0" />
                All calculations happen locally in your browser. No data is sent to any server.
              </p>
            </motion.div>

            {/* Results */}
            <motion.div
              custom={4}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="rounded-xl border border-white/10 bg-white/[0.03] p-6"
            >
              <h2 className="mb-6 text-lg font-semibold">Results</h2>
              <div className="grid grid-cols-2 gap-4">
                {results.map((m) => (
                  <div key={m.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                    <div className="flex items-center gap-2">
                      <m.icon size={16} className="text-zinc-500" />
                      <span className="text-xs font-medium text-zinc-500">{m.label}</span>
                    </div>
                    <p className={`mt-2 text-2xl font-bold ${m.color}`}>{m.value}</p>
                    <p className="mt-1 text-xs text-zinc-600">{m.description}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benchmarks */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-center text-2xl font-bold">Industry Benchmarks</h2>
          <p className="mb-8 text-center text-zinc-400">
            A good ROAS is generally considered <span className="text-sky-400 font-semibold">4:1 or higher</span> (meaning $4 revenue for every $1 spent).
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">Channel</th>
                  <th className="px-4 py-3 text-center font-medium text-zinc-400">Good ROAS</th>
                  <th className="px-4 py-3 text-center font-medium text-zinc-400">Avg CTR</th>
                  <th className="px-4 py-3 text-center font-medium text-zinc-400">Avg CVR</th>
                  <th className="px-4 py-3 text-center font-medium text-zinc-400">Avg CPC</th>
                </tr>
              </thead>
              <tbody>
                {benchmarks.map((b) => (
                  <tr key={b.channel} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-zinc-300">{b.channel}</td>
                    <td className="px-4 py-3 text-center text-emerald-400">{b.goodRoas}</td>
                    <td className="px-4 py-3 text-center text-zinc-400">{b.avgCtr}</td>
                    <td className="px-4 py-3 text-center text-zinc-400">{b.avgCvr}</td>
                    <td className="px-4 py-3 text-center text-zinc-400">{b.avgCpc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 className="text-3xl font-bold sm:text-4xl">
              Stop Calculating. <span className="text-sky-400">Start Optimizing.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-zinc-400">
              Connect your ad account and AdNexus AI will track ROAS, CPA, and all metrics automatically with AI-powered recommendations to improve them.
            </p>
            <Link
              href="/contact"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-sky-500 px-8 py-3 font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-400"
            >
              Request Pilot Access <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
