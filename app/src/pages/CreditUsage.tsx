// @ts-nocheck
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from 'recharts';
import SEO from '../components/SEO';
import {
  AlertTriangle,
  ArrowUpRight,
  Zap,
  TrendingUp,
  Coins,
  CreditCard,
  Sparkles,
  MessageSquare,
  Palette,
  BarChart3,
  AlertOctagon,
  FileText,
  Activity,
  ChevronRight,
  CheckCircle2,
  Star,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  MOCK DATA                                                          */
/* ------------------------------------------------------------------ */

const dailyData = [
  { day: '1', actual: 28 }, { day: '2', actual: 35 }, { day: '3', actual: 45 },
  { day: '4', actual: 38 }, { day: '5', actual: 52 }, { day: '6', actual: 31 },
  { day: '7', actual: 29 }, { day: '8', actual: 48 }, { day: '9', actual: 55 },
  { day: '10', actual: 42 }, { day: '11', actual: 36 }, { day: '12', actual: 50 },
  { day: '13', actual: 33 }, { day: '14', actual: 44 }, { day: '15', actual: 58 },
  { day: '16', actual: 39 }, { day: '17', actual: 41 }, { day: '18', actual: 47 },
  { day: '19', actual: 53 }, { day: '20', actual: 38 }, { day: '21', actual: 43 },
  { day: '22', actual: 46 }, { day: '23', actual: 40 }, { day: '24', actual: 52 },
  { day: '25', actual: 35 }, { day: '26', actual: 48 }, { day: '27', actual: 44 },
  { day: '28', actual: 50 }, { day: '29', actual: 42 }, { day: '30', actual: 46 },
];

const featureData = [
  { name: 'Morning Brief', value: 320, color: '#2563EB', icon: <Sparkles size={12} /> },
  { name: 'AI Chat', value: 280, color: '#10B981', icon: <MessageSquare size={12} /> },
  { name: 'Creative Gen', value: 195, color: '#F59E0B', icon: <Palette size={12} /> },
  { name: 'Campaign Analysis', value: 180, color: '#8B5CF6', icon: <BarChart3 size={12} /> },
  { name: 'Anomaly Detection', value: 150, color: '#EF4444', icon: <AlertOctagon size={12} /> },
  { name: 'Reports', value: 122, color: '#06B6D4', icon: <FileText size={12} /> },
];

const usageLog = [
  { id: '1', datetime: 'May 20, 8:00 AM', feature: 'Morning Brief', action: 'Daily digest', platform: 'All', credits: 8, cost: '$0.072', icon: <Sparkles size={14} /> },
  { id: '2', datetime: 'May 20, 10:30 AM', feature: 'AI Chat', action: 'Budget reallocation Q&A', platform: 'Meta', credits: 3, cost: '$0.027', icon: <MessageSquare size={14} /> },
  { id: '3', datetime: 'May 20, 2:15 PM', feature: 'Creative Gen', action: '5 headline variants', platform: 'Meta', credits: 15, cost: '$0.135', icon: <Palette size={14} /> },
  { id: '4', datetime: 'May 20, 3:00 PM', feature: 'Anomaly Detection', action: 'CPA spike scan', platform: 'All', credits: 12, cost: '$0.108', icon: <AlertOctagon size={14} /> },
  { id: '5', datetime: 'May 20, 4:45 PM', feature: 'Campaign Analysis', action: 'ROAS deep-dive', platform: 'Google', credits: 18, cost: '$0.162', icon: <BarChart3 size={14} /> },
  { id: '6', datetime: 'May 20, 5:30 PM', feature: 'Reports', action: 'Weekly report generation', platform: 'All', credits: 22, cost: '$0.198', icon: <FileText size={14} /> },
  { id: '7', datetime: 'May 19, 8:00 AM', feature: 'Morning Brief', action: 'Daily digest', platform: 'All', credits: 8, cost: '$0.072', icon: <Sparkles size={14} /> },
  { id: '8', datetime: 'May 19, 11:00 AM', feature: 'AI Chat', action: 'Audience targeting Q&A', platform: 'Google', credits: 5, cost: '$0.045', icon: <MessageSquare size={14} /> },
  { id: '9', datetime: 'May 19, 1:20 PM', feature: 'Creative Gen', action: '3 image descriptions', platform: 'TikTok', credits: 9, cost: '$0.081', icon: <Palette size={14} /> },
  { id: '10', datetime: 'May 19, 3:45 PM', feature: 'Anomaly Detection', action: 'CTR drop scan', platform: 'Meta', credits: 12, cost: '$0.108', icon: <AlertOctagon size={14} /> },
  { id: '11', datetime: 'May 19, 5:00 PM', feature: 'Campaign Analysis', action: 'Cross-platform compare', platform: 'All', credits: 25, cost: '$0.225', icon: <BarChart3 size={14} /> },
  { id: '12', datetime: 'May 18, 8:00 AM', feature: 'Morning Brief', action: 'Daily digest', platform: 'All', credits: 8, cost: '$0.072', icon: <Sparkles size={14} /> },
  { id: '13', datetime: 'May 18, 10:00 AM', feature: 'AI Chat', action: 'Campaign optimization Q&A', platform: 'Snap', credits: 4, cost: '$0.036', icon: <MessageSquare size={14} /> },
  { id: '14', datetime: 'May 18, 2:30 PM', feature: 'Creative Gen', action: 'Ad copy rewrite', platform: 'Google', credits: 12, cost: '$0.108', icon: <Palette size={14} /> },
  { id: '15', datetime: 'May 18, 4:00 PM', feature: 'Reports', action: 'Monthly summary', platform: 'All', credits: 30, cost: '$0.270', icon: <FileText size={14} /> },
];

const USED = 1247;
const LIMIT = 2000;
const PCT = Math.round((USED / LIMIT) * 100);

/* ------------------------------------------------------------------ */
/*  TOOLTIP COMPONENTS                                                 */
/* ------------------------------------------------------------------ */

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border px-3 py-2 text-xs" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
      <p className="mb-1 font-medium">May {label}</p>
      <p style={{ color: 'var(--accent)' }}>{payload[0].value} credits</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                     */
/* ------------------------------------------------------------------ */

export default function CreditUsage() {
  const [plan] = useState('Pro');

  return (
    <>
    <SEO
      title="Credit Usage"
      description="Monitor your AdNexus AI credit usage, view billing history, manage subscriptions, and track feature consumption."
      keywords="credit usage, billing, subscription, payment history, account credits"
    />
    <div className="min-h-[100dvh] px-4 py-6 md:px-8" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
        className="mb-6 flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h1 className="font-space text-3xl font-bold tracking-tight md:text-4xl" style={{ color: 'var(--text-primary)' }}>
            AI Credit Usage
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Track and analyze your AI credit consumption
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
            {plan} Plan &mdash; {LIMIT.toLocaleString()} credits/month
          </span>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:opacity-90"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            <ArrowUpRight size={12} /> Upgrade
          </button>
        </div>
      </motion.div>

      {/* ===== CREDIT BALANCE CARD ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="card-surface p-5 mb-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          {/* Progress */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity size={18} style={{ color: 'var(--accent)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Credits Used This Month</span>
              </div>
              <span className="font-mono-data text-sm font-bold" style={{ color: PCT > 80 ? 'var(--status-warning)' : 'var(--accent)' }}>
                {PCT}%
              </span>
            </div>
            <div className="h-4 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${PCT}%` }}
                transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                className="h-full rounded-full relative"
                style={{
                  background: PCT > 80
                    ? 'linear-gradient(90deg, #F59E0B, #EF4444)'
                    : 'linear-gradient(90deg, #2563EB, #3B82F6)',
                }}
              >
                {PCT > 80 && (
                  <div className="absolute inset-0 rounded-full animate-pulse" style={{ background: 'rgba(245,158,11,0.3)' }} />
                )}
              </motion.div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="font-mono-data text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{USED.toLocaleString()}</span>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>of {LIMIT.toLocaleString()} credits</span>
              <span className="font-mono-data text-lg font-bold" style={{ color: 'var(--text-secondary)' }}>{(LIMIT - USED).toLocaleString()}</span>
            </div>
            {PCT > 60 && (
              <div className="flex items-center gap-2 mt-3 rounded-lg p-3" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <AlertTriangle size={16} style={{ color: 'var(--status-warning)', flexShrink: 0 }} />
                <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                  At current usage, you will exceed your {LIMIT.toLocaleString()} credit limit by <strong>May 28</strong>. Consider upgrading your plan.
                </span>
              </div>
            )}
          </div>

          {/* Mini Stats */}
          <div className="grid grid-cols-2 gap-3 lg:w-64 shrink-0">
            <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-secondary)' }}>
              <TrendingUp size={14} className="mx-auto mb-1" style={{ color: 'var(--accent)' }} />
              <p className="font-mono-data text-lg font-bold" style={{ color: 'var(--text-primary)' }}>42</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>avg/day</p>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-secondary)' }}>
              <Coins size={14} className="mx-auto mb-1" style={{ color: 'var(--accent)' }} />
              <p className="font-mono-data text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{(LIMIT - USED).toLocaleString()}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>remaining</p>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-secondary)' }}>
              <Zap size={14} className="mx-auto mb-1" style={{ color: 'var(--status-active)' }} />
              <p className="font-mono-data text-sm font-bold" style={{ color: 'var(--text-primary)' }}>$14.97</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>est. cost</p>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-secondary)' }}>
              <CreditCard size={14} className="mx-auto mb-1" style={{ color: 'var(--accent)' }} />
              <p className="font-mono-data text-sm font-bold" style={{ color: 'var(--text-primary)' }}>~75%</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>margin</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ===== CHARTS ROW ===== */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        {/* Daily Credit Consumption — Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="card-surface p-5 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-space text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Daily Credit Consumption &mdash; May 2026
            </h3>
            <span className="text-[10px] rounded-full px-2 py-0.5 font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
              30 days
            </span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dailyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: '#555B66', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#555B66', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={42} stroke="#F59E0B" strokeDasharray="6 4" strokeWidth={1} label={{ value: 'Avg 42', fill: '#F59E0B', fontSize: 10, position: 'right' }} />
              <Bar dataKey="actual" name="actual" fill="url(#barGrad)" radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Usage by Feature — Donut */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="card-surface p-5"
        >
          <h3 className="mb-2 font-space text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Usage by Feature
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={featureData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                stroke="none"
                paddingAngle={2}
              >
                {featureData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  fontSize: 11,
                  color: 'var(--text-primary)',
                }}
                formatter={(value: number, name: string) => [`${value} cr`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="text-center">
            <p className="font-mono-data text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{USED.toLocaleString()}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>total credits used</p>
          </div>
          <div className="mt-3 space-y-1.5">
            {featureData.map(f => (
              <div key={f.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span style={{ color: f.color }}>{f.icon}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{f.name}</span>
                </div>
                <span className="font-mono-data" style={{ color: 'var(--text-primary)' }}>{f.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ===== UPGRADE CTA ===== */}
      {PCT > 60 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-6 rounded-xl p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(139,92,246,0.08) 100%)',
            border: '1px solid rgba(37,99,235,0.2)',
          }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                <Star size={20} style={{ color: 'white' }} />
              </div>
              <div>
                <h3 className="font-space text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Upgrade to Business Plan</h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Get 10,000 credits/month, priority support, and white-label reports</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
              {['10,000 credits', 'Priority support', 'White-label reports'].map(perk => (
                <span key={perk} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium" style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
                  <CheckCircle2 size={10} /> {perk}
                </span>
              ))}
              <button
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-all hover:opacity-90 ml-2"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                Upgrade Now <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ===== USAGE LOG TABLE ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="card-surface overflow-hidden"
      >
        <div className="border-b px-5 py-4 flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
          <h3 className="font-space text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Usage Log</h3>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{usageLog.length} entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>Date/Time</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>Feature</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>Action</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>Platform</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>Credits</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {usageLog.map((entry, i) => (
                <motion.tr
                  key={entry.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.015 }}
                  className="border-t transition-colors hover:bg-white/[0.02]"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <td className="px-4 py-3 font-mono-data text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{entry.datetime}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span style={{ color: 'var(--accent)' }}>{entry.icon}</span>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{entry.feature}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{entry.action}</td>
                  <td className="px-4 py-3"><PlatformBadge platform={entry.platform} /></td>
                  <td className="px-4 py-3 font-mono-data text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{entry.credits}cr</td>
                  <td className="px-4 py-3 font-mono-data text-xs" style={{ color: 'var(--text-secondary)' }}>{entry.cost}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  PLATFORM BADGE                                                     */
/* ------------------------------------------------------------------ */

function PlatformBadge({ platform }: { platform: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    Meta: { bg: 'rgba(24,119,242,0.15)', text: '#1877F2' },
    Google: { bg: 'rgba(219,68,55,0.15)', text: '#DB4437' },
    TikTok: { bg: 'rgba(0,242,234,0.15)', text: '#00F2EA' },
    Snap: { bg: 'rgba(255,252,0,0.15)', text: '#FFFC00' },
    All: { bg: 'rgba(138,143,152,0.15)', text: '#8A8F98' },
  };
  const c = colors[platform] || colors.All;
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: c.bg, color: c.text }}>
      {platform}
    </span>
  );
}
