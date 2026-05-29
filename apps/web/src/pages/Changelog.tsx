import { useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Sparkles, Wrench, Bug, Zap, ChevronRight, Mail, Bell } from 'lucide-react'
import SEO from '../components/SEO';

/* ─────────── tag config ─────────── */
const TAG_CONFIG = {
  New: { icon: Sparkles, color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  Improved: { icon: Zap, color: 'bg-sky-500/15 text-sky-400 border-sky-500/25' },
  Fixed: { icon: Bug, color: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
}

/* ─────────── changelog data (newest → oldest) ─────────── */
const ENTRIES = [
  {
    id: 10,
    date: '2025-02-18',
    version: 'v2.4.0',
    title: 'MCP server v2 with write-enabled tools',
    description:
      'The Model Context Protocol server has been upgraded to v2, now supporting write-enabled tool operations. Build custom integrations that modify campaign data programmatically with full type safety.',
    tag: 'New' as const,
  },
  {
    id: 9,
    date: '2025-02-14',
    version: 'v2.3.3',
    title: 'Export reports to Google Sheets',
    description:
      'Report exports now support direct push to Google Sheets with live cell formatting, pivot-ready structure, and scheduled auto-sync every 6 hours.',
    tag: 'Improved' as const,
  },
  {
    id: 8,
    date: '2025-02-10',
    version: 'v2.3.2',
    title: 'Keyboard shortcuts (Cmd+K, etc.)',
    description:
      'Navigate the entire platform without touching your mouse. Press Cmd+K to open the command palette, use / to jump between modules, and ? to see all shortcuts.',
    tag: 'New' as const,
  },
  {
    id: 7,
    date: '2025-02-06',
    version: 'v2.3.1',
    title: 'Competitive intelligence dashboard',
    description:
      'A brand-new dashboard visualizes competitor ad spend trends, share-of-voice benchmarks, and creative strategy shifts across your tracked accounts in real time.',
    tag: 'New' as const,
  },
  {
    id: 6,
    date: '2025-02-03',
    version: 'v2.3.0',
    title: 'Fixed: Campaign filter reset bug',
    description:
      'Resolved an issue where campaign filters would unexpectedly reset after navigating away from the Campaigns page. Filter state is now persisted per session.',
    tag: 'Fixed' as const,
  },
  {
    id: 5,
    date: '2025-01-28',
    version: 'v2.2.4',
    title: 'Budget pacing alerts and forecasting',
    description:
      'Receive proactive alerts when campaigns are pacing over or under budget. AI-powered end-of-month spend forecasting helps you reallocate before it is too late.',
    tag: 'New' as const,
  },
  {
    id: 4,
    date: '2025-01-22',
    version: 'v2.2.3',
    title: 'Morning Brief email digest',
    description:
      'A daily email summary of your top-performing campaigns, budget status, AI recommendations, and any alerts requiring attention — delivered every morning at 8 AM.',
    tag: 'New' as const,
  },
  {
    id: 3,
    date: '2025-01-16',
    version: 'v2.2.2',
    title: 'Creative fatigue detection across all platforms',
    description:
      'Our AI now monitors ad creative performance across Meta, TikTok, and Google to detect fatigue signals early. Get replacement suggestions before ROAS drops.',
    tag: 'New' as const,
  },
  {
    id: 2,
    date: '2025-01-10',
    version: 'v2.2.1',
    title: 'TikTok Ads API integration (v2.0)',
    description:
      'Full support for TikTok Ads API v2.0 including creative-level reporting, catalog sync, and automated audience syncing from your CRM.',
    tag: 'New' as const,
  },
  {
    id: 1,
    date: '2025-01-05',
    version: 'v2.2.0',
    title: 'AI Agent now supports custom confidence thresholds',
    description:
      'Fine-tune how aggressive the AI Agent is. Set custom confidence thresholds for auto-apply actions, with a visual slider and per-campaign overrides.',
    tag: 'Improved' as const,
  },
]

/* ─────────── helpers ─────────── */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function TagBadge({ tag }: { tag: keyof typeof TAG_CONFIG }) {
  const cfg = TAG_CONFIG[tag]
  const Icon = cfg.icon
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}
    >
      <Icon className="h-3 w-3" />
      {tag}
    </span>
  )
}

/* ─────────── animation variants ─────────── */
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

/* ─────────── component ─────────── */
export default function Changelog() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      setSubscribed(true)
      setEmail('')
    }
  }

  return (
    <>
    <SEO
      title="Changelog"
      description="See what's new in AdNexus AI. Explore the latest features, improvements, bug fixes, and platform updates."
      keywords="changelog, product updates, new features, release notes, what's new"
    />
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* ═══════ Header ═══════ */}
      <div className="border-b border-slate-800/60 bg-slate-900/50">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-500/25">
                <Clock className="h-5 w-5 text-violet-400" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white">What&apos;s New</h1>
              <span className="ml-2 inline-flex items-center rounded-full bg-violet-500/15 px-3 py-1 text-sm font-semibold text-violet-300 ring-1 ring-violet-500/25">
                v2.4.0
              </span>
            </div>
            <p className="max-w-xl text-slate-400">
              Product updates, feature releases, and improvements. Stay in the loop with everything
              that ships.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ═══════ Timeline ═══════ */}
      <div className="mx-auto max-w-4xl px-6 py-14">
        <motion.div
          className="relative"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
        >
          {/* vertical line */}
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-slate-800 md:left-[23px]" />

          <div className="space-y-10">
            {ENTRIES.map((entry) => {
              const TagIcon = TAG_CONFIG[entry.tag].icon
              const dotColor =
                entry.tag === 'New'
                  ? 'bg-emerald-400 ring-emerald-500/30'
                  : entry.tag === 'Improved'
                    ? 'bg-sky-400 ring-sky-500/30'
                    : 'bg-amber-400 ring-amber-500/30'

              return (
                <motion.div
                  key={entry.id}
                  variants={itemVariants}
                  className="group relative pl-14 md:pl-16"
                >
                  {/* timeline dot */}
                  <div
                    className={`absolute left-2 top-3 flex h-5 w-5 items-center justify-center rounded-full ${dotColor} ring-4 ring-offset-2 ring-offset-slate-950 transition-transform duration-300 group-hover:scale-125`}
                  >
                    <TagIcon className="h-2.5 w-2.5 text-slate-950" />
                  </div>

                  {/* card */}
                  <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5 backdrop-blur-sm transition-all duration-300 hover:border-slate-700/80 hover:bg-slate-800/50 md:p-6">
                    {/* meta row */}
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <span className="text-sm font-medium text-slate-500">{formatDate(entry.date)}</span>
                      <span className="text-xs text-slate-600">·</span>
                      <code className="rounded-md bg-slate-800/80 px-2 py-0.5 text-xs font-mono text-slate-400 ring-1 ring-slate-700/50">
                        {entry.version}
                      </code>
                      <TagBadge tag={entry.tag} />
                    </div>

                    {/* title + description */}
                    <h3 className="mb-2 text-lg font-semibold text-white transition-colors group-hover:text-violet-300 md:text-xl">
                      {entry.title}
                    </h3>
                    <p className="leading-relaxed text-slate-400">{entry.description}</p>

                    {/* subtle hover hint */}
                    <div className="mt-4 flex items-center gap-1 text-xs font-medium text-slate-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <ChevronRight className="h-3 w-3" />
                      <span>Released in {entry.version}</span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* ═══════ Subscribe banner ═══════ */}
      <div className="border-t border-slate-800/60 bg-slate-900/40">
        <div className="mx-auto max-w-4xl px-6 py-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center text-center"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 ring-1 ring-violet-500/25">
              <Bell className="h-6 w-6 text-violet-400" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-white">Subscribe to updates</h2>
            <p className="mb-6 max-w-md text-sm text-slate-400">
              Get notified whenever we ship a new feature, improvement, or fix. No spam — just the
              good stuff.
            </p>

            {subscribed ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 rounded-xl bg-emerald-500/15 px-5 py-3 text-sm font-semibold text-emerald-400 ring-1 ring-emerald-500/25"
              >
                <Sparkles className="h-4 w-4" />
                You&apos;re subscribed! We&apos;ll be in touch.
              </motion.div>
            ) : (
              <form
                onSubmit={handleSubscribe}
                className="flex w-full max-w-md flex-col gap-3 sm:flex-row"
              >
                <div className="relative flex-1">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-700/70 bg-slate-800/60 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-violet-600 px-6 text-sm font-semibold text-white transition-all hover:bg-violet-500 active:scale-[0.98]"
                >
                  Subscribe
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </div>
    </>
  )
}
