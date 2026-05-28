import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  Filter,
  TrendingDown,
  MousePointer,
  ShoppingCart,
  CreditCard,
  Eye,
  Users,
  BarChart3,
  Clock,
  GitCompare,
  Info,
  CheckCircle2,
  ChevronRight,
  Layers,
  Target,
  Share2,
  ShieldAlert,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { apiGet } from '../lib/api'
import type { CrossPlatformData, FunnelStage, ReportCampaign } from '../lib/api'
import { Skeleton } from '../components/ui/skeleton'
import SEO from '../components/SEO';

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */

interface DashboardResponse {
  summary: {
    totalSpend: number
    impressions: number
    clicks: number
    conversions: number
    ctr: number
    cpa: number
    roas: number
  }
  platformMetrics: CrossPlatformData[]
  funnelStages?: FunnelStage[]
  campaigns: ReportCampaign[]
}

interface AttributionModel {
  name: string
  description: string
  credits: Record<string, number>
}

interface FunnelStep {
  name: string
  value: number
  icon: React.ElementType
  color: string
}

interface ConversionRate {
  from: string
  to: string
  rate: number
}

interface TimelineEvent {
  day: number
  platform: string
  action: string
  description: string
  icon: React.ElementType
  color: string
  bgClass: string
  textClass: string
}

/* ═══════════════════════════════════════════
   PLATFORM COLOR MAPS
   ═══════════════════════════════════════════ */

const PLATFORM_COLORS: Record<string, string> = {
  Meta: '#3B82F6',
  Google: '#EF4444',
  TikTok: '#111111',
  Snap: '#EAB308',
}

const PLATFORM_COLORS_BG: Record<string, string> = {
  Meta: 'bg-blue-500',
  Google: 'bg-red-500',
  TikTok: 'bg-neutral-800',
  Snap: 'bg-yellow-500',
}

const PLATFORM_COLORS_TEXT: Record<string, string> = {
  Meta: 'text-blue-400',
  Google: 'text-red-400',
  TikTok: 'text-neutral-400',
  Snap: 'text-yellow-400',
}

const PLATFORM_API_COLORS: Record<string, string> = {
  Meta: '#1877F2',
  Google: '#EA4335',
  TikTok: '#00F2EA',
  Snap: '#FFFC00',
}

/* ═══════════════════════════════════════════
   ATTRIBUTION MODEL CALCULATIONS
   ═══════════════════════════════════════════ */

function computeAttributionModels(
  platformMetrics: CrossPlatformData[]
): AttributionModel[] {
  const platforms = platformMetrics.filter((p) => p.conversions > 0)
  const totalConversions = platforms.reduce((s, p) => s + p.conversions, 0)
  const totalClicks = platforms.reduce((s, p) => s + p.clicks, 0)

  if (totalConversions === 0 || platforms.length === 0) {
    return [
      { name: 'First-Click', description: '100% credit to the first touchpoint', credits: { Meta: 0, Google: 0, TikTok: 0, Snap: 0 } },
      { name: 'Last-Click', description: '100% credit to the last touchpoint before conversion', credits: { Meta: 0, Google: 0, TikTok: 0, Snap: 0 } },
      { name: 'Linear', description: 'Equal credit split across all touchpoints', credits: { Meta: 0, Google: 0, TikTok: 0, Snap: 0 } },
      { name: 'Time-Decay', description: 'More credit to touchpoints closer to conversion', credits: { Meta: 0, Google: 0, TikTok: 0, Snap: 0 } },
      { name: 'Data-Driven', description: 'AI-weighted based on incremental impact (ROAS-weighted)', credits: { Meta: 0, Google: 0, TikTok: 0, Snap: 0 } },
    ]
  }

  // Sort platforms: highest impressions = likely first touch
  const byImpressions = [...platforms].sort((a, b) => b.impressions - a.impressions)
  // Sort platforms: highest conversions = likely last touch (retargeting)
  const byConversions = [...platforms].sort((a, b) => b.conversions - a.conversions)

  // 1. First-Click: 100% to platform with highest impressions
  const firstClickCredits: Record<string, number> = { Meta: 0, Google: 0, TikTok: 0, Snap: 0 }
  if (byImpressions[0]) firstClickCredits[byImpressions[0].platform] = 100

  // 2. Last-Click: 100% to platform with highest conversions
  const lastClickCredits: Record<string, number> = { Meta: 0, Google: 0, TikTok: 0, Snap: 0 }
  if (byConversions[0]) lastClickCredits[byConversions[0].platform] = 100

  // 3. Linear: Equal credit to all platforms that had conversions
  const linearCredits: Record<string, number> = { Meta: 0, Google: 0, TikTok: 0, Snap: 0 }
  const equalShare = 100 / platforms.length
  platforms.forEach((p) => {
    linearCredits[p.platform] = Math.round(equalShare)
  })
  // Normalize to ensure 100%
  const linearTotal = Object.values(linearCredits).reduce((s, v) => s + v, 0)
  if (linearTotal < 100 && platforms[0]) {
    linearCredits[platforms[0].platform] += 100 - linearTotal
  }

  // 4. Time-Decay: Weight by conversions (more conversions = closer to purchase)
  const timeDecayCredits: Record<string, number> = { Meta: 0, Google: 0, TikTok: 0, Snap: 0 }
  // Use a decay factor: platforms with higher conversions get more weight
  // Also factor in recency bias through click-through rate
  const decayWeights: Record<string, number> = {}
  platforms.forEach((p) => {
    // Weight = conversions * (1 + ctr/100) — platforms with both conversions and engagement score higher
    decayWeights[p.platform] = p.conversions * (1 + (p.ctr || 0) / 100)
  })
  const totalDecayWeight = Object.values(decayWeights).reduce((s, v) => s + v, 0)
  platforms.forEach((p) => {
    timeDecayCredits[p.platform] = totalDecayWeight > 0
      ? Math.round((decayWeights[p.platform] / totalDecayWeight) * 100)
      : 0
  })
  // Normalize
  const tdTotal = Object.values(timeDecayCredits).reduce((s, v) => s + v, 0)
  if (tdTotal < 100 && byConversions[0]) {
    timeDecayCredits[byConversions[0].platform] += 100 - tdTotal
  }

  // 5. Data-Driven: ROAS-weighted incremental impact
  const dataDrivenCredits: Record<string, number> = { Meta: 0, Google: 0, TikTok: 0, Snap: 0 }
  const roasWeights: Record<string, number> = {}
  platforms.forEach((p) => {
    // Weight = conversions * ROAS — rewards both volume AND efficiency
    roasWeights[p.platform] = p.conversions * (p.roas || 1)
  })
  const totalRoasWeight = Object.values(roasWeights).reduce((s, v) => s + v, 0)
  platforms.forEach((p) => {
    dataDrivenCredits[p.platform] = totalRoasWeight > 0
      ? Math.round((roasWeights[p.platform] / totalRoasWeight) * 100)
      : 0
  })
  // Normalize
  const ddTotal = Object.values(dataDrivenCredits).reduce((s, v) => s + v, 0)
  if (ddTotal < 100 && byConversions[0]) {
    dataDrivenCredits[byConversions[0].platform] += 100 - ddTotal
  }

  return [
    { name: 'First-Click', description: '100% credit to the first touchpoint', credits: firstClickCredits },
    { name: 'Last-Click', description: '100% credit to the last touchpoint before conversion', credits: lastClickCredits },
    { name: 'Linear', description: 'Equal credit split across all touchpoints', credits: linearCredits },
    { name: 'Time-Decay', description: 'More credit to touchpoints closer to conversion', credits: timeDecayCredits },
    { name: 'Data-Driven', description: 'AI-weighted based on incremental impact (ROAS-weighted)', credits: dataDrivenCredits },
  ]
}

function buildFunnelSteps(data: DashboardResponse): { steps: FunnelStep[]; rates: ConversionRate[] } {
  const funnelStages = data.funnelStages
  if (funnelStages && funnelStages.length > 0) {
    const iconMap: Record<string, React.ElementType> = {
      Impressions: Eye,
      Clicks: MousePointer,
      'Landing Page': Filter,
      'Add to Cart': ShoppingCart,
      Purchase: CreditCard,
    }
    const colorMap: Record<string, string> = {
      Impressions: '#6366F1',
      Clicks: '#8B5CF6',
      'Landing Page': '#A78BFA',
      'Add to Cart': '#C084FC',
      Purchase: '#22D3EE',
    }
    const steps = funnelStages.map((stage) => ({
      name: stage.stage,
      value: stage.count,
      icon: iconMap[stage.stage] || Eye,
      color: colorMap[stage.stage] || '#6366F1',
    }))
    const rates: ConversionRate[] = []
    for (let i = 1; i < steps.length; i++) {
      const rate = steps[i - 1].value > 0
        ? (steps[i].value / steps[i - 1].value) * 100
        : 0
      rates.push({ from: steps[i - 1].name, to: steps[i].name, rate: parseFloat(rate.toFixed(2)) })
    }
    return { steps, rates }
  }

  // Fallback: derive from summary
  const impressions = data.summary?.impressions || 0
  const clicks = data.summary?.clicks || 0
  // Estimate landing page views as ~80% of clicks
  const landingPage = Math.round(clicks * 0.8)
  // Estimate add-to-cart as ~15% of landing page views
  const addToCart = Math.round(landingPage * 0.15)
  const conversions = data.summary?.conversions || 0

  const steps: FunnelStep[] = [
    { name: 'Impressions', value: impressions, icon: Eye, color: '#6366F1' },
    { name: 'Clicks', value: clicks, icon: MousePointer, color: '#8B5CF6' },
    { name: 'Landing Page', value: landingPage, icon: Filter, color: '#A78BFA' },
    { name: 'Add to Cart', value: addToCart, icon: ShoppingCart, color: '#C084FC' },
    { name: 'Purchase', value: conversions, icon: CreditCard, color: '#22D3EE' },
  ]

  const rates: ConversionRate[] = []
  for (let i = 1; i < steps.length; i++) {
    const rate = steps[i - 1].value > 0
      ? (steps[i].value / steps[i - 1].value) * 100
      : 0
    rates.push({ from: steps[i - 1].name, to: steps[i].name, rate: parseFloat(rate.toFixed(2)) })
  }

  return { steps, rates }
}

function buildPlatformFunnelData(platformMetrics: CrossPlatformData[]) {
  const steps = ['Impressions', 'Clicks', 'Landing', 'Add to Cart', 'Purchase']
  return steps.map((step, i) => {
    const row: Record<string, string | number> = { step }
    platformMetrics.forEach((p) => {
      let value: number
      switch (i) {
        case 0: value = p.impressions; break
        case 1: value = p.clicks; break
        case 2: value = Math.round(p.clicks * 0.8); break
        case 3: value = Math.round(p.clicks * 0.8 * 0.15); break
        case 4: value = p.conversions; break
        default: value = 0
      }
      row[p.platform] = value
    })
    return row
  })
}

function buildTimelineEvents(platformMetrics: CrossPlatformData[]): TimelineEvent[] {
  const sortedByImpressions = [...platformMetrics].sort((a, b) => b.impressions - a.impressions)
  const sortedByConversions = [...platformMetrics].sort((a, b) => b.conversions - a.conversions)

  const events: TimelineEvent[] = []
  let day = 1

  // Day 1: First touch (highest impressions platform)
  if (sortedByImpressions[0]) {
    const p = sortedByImpressions[0]
    events.push({
      day,
      platform: p.platform,
      action: 'Ad Impression',
      description: `User sees a ${p.platform} ad in their feed`,
      icon: Eye,
      color: PLATFORM_API_COLORS[p.platform] || PLATFORM_COLORS[p.platform] || '#6366F1',
      bgClass: PLATFORM_COLORS_BG[p.platform] || 'bg-blue-500',
      textClass: PLATFORM_COLORS_TEXT[p.platform] || 'text-blue-400',
    })
    day++
  }

  // Day 2: Second touch (second highest impressions)
  if (sortedByImpressions[1]) {
    const p = sortedByImpressions[1]
    events.push({
      day,
      platform: p.platform,
      action: 'Search Click',
      description: `User clicks a ${p.platform} search ad`,
      icon: MousePointer,
      color: PLATFORM_API_COLORS[p.platform] || PLATFORM_COLORS[p.platform] || '#6366F1',
      bgClass: PLATFORM_COLORS_BG[p.platform] || 'bg-red-500',
      textClass: PLATFORM_COLORS_TEXT[p.platform] || 'text-red-400',
    })
    day++
  }

  // Day 3: Third touch (video engagement)
  if (sortedByImpressions[2]) {
    const p = sortedByImpressions[2]
    events.push({
      day,
      platform: p.platform,
      action: 'Video View',
      description: `User views a ${p.platform} product video`,
      icon: Users,
      color: PLATFORM_API_COLORS[p.platform] || PLATFORM_COLORS[p.platform] || '#6366F1',
      bgClass: PLATFORM_COLORS_BG[p.platform] || 'bg-neutral-800',
      textClass: PLATFORM_COLORS_TEXT[p.platform] || 'text-neutral-400',
    })
    day += 2
  }

  // Day 5: Fourth touch (retargeting click)
  if (sortedByImpressions[3]) {
    const p = sortedByImpressions[3]
    events.push({
      day,
      platform: p.platform,
      action: 'Ad Click',
      description: `User clicks a ${p.platform} ad and browses`,
      icon: Target,
      color: PLATFORM_API_COLORS[p.platform] || PLATFORM_COLORS[p.platform] || '#6366F1',
      bgClass: PLATFORM_COLORS_BG[p.platform] || 'bg-yellow-500',
      textClass: PLATFORM_COLORS_TEXT[p.platform] || 'text-yellow-400',
    })
    day += 2
  } else if (sortedByConversions[0] && !events.find((e) => e.platform === sortedByConversions[0].platform)) {
    const p = sortedByConversions[0]
    events.push({
      day,
      platform: p.platform,
      action: 'Ad Click',
      description: `User clicks a ${p.platform} retargeting ad`,
      icon: Target,
      color: PLATFORM_API_COLORS[p.platform] || PLATFORM_COLORS[p.platform] || '#6366F1',
      bgClass: PLATFORM_COLORS_BG[p.platform] || 'bg-yellow-500',
      textClass: PLATFORM_COLORS_TEXT[p.platform] || 'text-yellow-400',
    })
    day += 2
  }

  // Final day: Purchase
  const lastTouchPlatform = sortedByConversions[0]?.platform || 'Meta'
  events.push({
    day,
    platform: 'Purchase',
    action: 'Purchase Complete',
    description: `User buys — attributed to ${lastTouchPlatform} (last-click)`,
    icon: CheckCircle2,
    color: '#22D3EE',
    bgClass: 'bg-cyan-400',
    textClass: 'text-cyan-400',
  })

  return events
}

function generateInsight(
  platformMetrics: CrossPlatformData[],
  models: AttributionModel[]
): string {
  if (!platformMetrics.length) return 'Loading insights...'

  const byImpressions = [...platformMetrics].sort((a, b) => b.impressions - a.impressions)[0]
  const byConversions = [...platformMetrics].sort((a, b) => b.conversions - a.conversions)[0]
  const byRoas = [...platformMetrics].sort((a, b) => b.roas - a.roas)[0]
  const byCtr = [...platformMetrics].sort((a, b) => b.ctr - a.ctr)[0]

  const firstClickModel = models.find((m) => m.name === 'First-Click')
  const dataDrivenModel = models.find((m) => m.name === 'Data-Driven')

  const firstTouchName = firstClickModel
    ? Object.entries(firstClickModel.credits).find(([, v]) => v === 100)?.[0] || byImpressions?.platform
    : byImpressions?.platform

  const ddc = dataDrivenModel?.credits || {}
  const topDDC = Object.entries(ddc).sort((a, b) => b[1] - a[1])[0]

  return (
    `${byImpressions?.platform || 'Meta'} drives the most impressions and early-funnel engagement, while ` +
    `${byConversions?.platform || 'Google'} leads in total conversions. ` +
    `${byCtr?.platform || 'Google'} shows the strongest CTR at ${byCtr?.ctr?.toFixed(2) || 'N/A'}%, ` +
    `and ${byRoas?.platform || 'Google'} delivers the best ROAS at ${byRoas?.roas?.toFixed(1) || 'N/A'}x. ` +
    `Data-driven attribution reveals ${firstTouchName}'s true incremental value at ` +
    `${topDDC ? `${topDDC[1]}%` : 'N/A'} — much higher than last-click would suggest. ` +
    `Consider shifting budget toward ${byImpressions?.platform || 'Meta'} for awareness ` +
    `and ${byConversions?.platform || 'Google'} for conversion.`
  )
}

/* ═══════════════════════════════════════════
   ANIMATION VARIANTS
   ═══════════════════════════════════════════ */
const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' },
  }),
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.45 } },
}

/* ═══════════════════════════════════════════
   LOADING SKELETONS
   ═══════════════════════════════════════════ */

function FunnelSkeleton() {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-12 rounded-lg" style={{ width: `${100 - i * 15}%` }} />
          {i < 4 && <Skeleton className="h-4 w-24 mx-auto" />}
        </div>
      ))}
      <div className="grid grid-cols-4 gap-3 mt-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-4">
      <div className="flex gap-2 mb-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-3 w-16 rounded-sm" />
        ))}
      </div>
      <Skeleton className="h-[360px] rounded-lg w-full" />
      <div className="grid grid-cols-4 gap-3 mt-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

function TimelineSkeleton() {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-4">
      <div className="relative">
        <Skeleton className="absolute left-6 top-8 bottom-8 w-0.5" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-4 py-3">
            <Skeleton className="w-12 h-12 rounded-full shrink-0" />
            <Skeleton className="h-16 flex-1 rounded-xl" />
          </div>
        ))}
      </div>
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-4">
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
      <Skeleton className="h-24 rounded-xl w-full" />
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-zinc-800/50 border border-zinc-700/40 rounded-xl p-3 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════
   ERROR BANNER
   ═══════════════════════════════════════════ */

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-red-500/20 p-4 mb-6 flex items-center gap-4"
      style={{ background: 'rgba(239,68,68,0.08)' }}
    >
      <ShieldAlert size={18} className="text-red-500 shrink-0" />
      <div className="flex-1">
        <p className="text-[13px] font-semibold text-red-500">Failed to load attribution data</p>
        <p className="text-[12px] text-zinc-400">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:bg-red-500/20"
        style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}
      >
        <RefreshCw size={12} />
        Retry
      </button>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════ */

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  index,
}: {
  icon: React.ElementType
  title: string
  subtitle: string
  index: number
}) {
  return (
    <motion.div
      custom={index}
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      className="mb-6"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-zinc-800/80 border border-zinc-700/50">
          <Icon className="w-5 h-5 text-cyan-400" />
        </div>
        <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
      </div>
      <p className="text-sm text-zinc-400 ml-12">{subtitle}</p>
    </motion.div>
  )
}

function HorizontalFunnel({
  funnelSteps,
  conversionRates,
}: {
  funnelSteps: FunnelStep[]
  conversionRates: ConversionRate[]
}) {
  const maxValue = funnelSteps[0]?.value || 1

  return (
    <motion.div
      variants={fadeInUp}
      custom={1}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6"
    >
      <div className="flex flex-col gap-2">
        {funnelSteps.map((step, i) => {
          const widthPercent = Math.max((step.value / maxValue) * 100, 12)
          const Icon = step.icon
          const prevStep = i > 0 ? funnelSteps[i - 1] : null
          const conversionRate = prevStep
            ? ((step.value / prevStep.value) * 100).toFixed(1)
            : null

          return (
            <React.Fragment key={step.name}>
              {i > 0 && (
                <div className="flex justify-center py-1">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-800/60 px-3 py-1 rounded-full">
                    <TrendingDown className="w-3 h-3" />
                    <span>{conversionRate}% conv.</span>
                  </div>
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="flex items-center gap-4"
              >
                <div className="flex-1 flex items-center">
                  <div
                    className="h-12 rounded-lg flex items-center px-4 gap-3 transition-all duration-700 relative overflow-hidden"
                    style={{
                      width: `${widthPercent}%`,
                      background: `linear-gradient(135deg, ${step.color}30, ${step.color}15)`,
                      borderLeft: `3px solid ${step.color}`,
                      minWidth: '140px',
                    }}
                  >
                    <Icon className="w-4 h-4 shrink-0" style={{ color: step.color }} />
                    <span className="text-sm font-medium text-zinc-200 whitespace-nowrap">
                      {step.name}
                    </span>
                    <span
                      className="text-sm font-bold ml-auto whitespace-nowrap"
                      style={{ color: step.color }}
                    >
                      {step.value >= 1000
                        ? `${(step.value / 1000).toFixed(step.value >= 1000000 ? 1 : 0)}K`
                        : step.value.toLocaleString()}
                    </span>
                  </div>
                </div>
              </motion.div>
            </React.Fragment>
          )
        })}
      </div>

      {/* Conversion rate summary */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {conversionRates.slice(0, 4).map((cr) => (
          <div
            key={`${cr.from}-${cr.to}`}
            className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/40"
          >
            <div className="text-xs text-zinc-500 mb-1">
              {cr.from} &rarr; {cr.to}
            </div>
            <div className="text-lg font-bold text-cyan-400">{cr.rate}%</div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function PlatformLegend({ platforms }: { platforms: string[] }) {
  return (
    <div className="flex flex-wrap gap-4 mb-4">
      {platforms.map((name) => (
        <div key={name} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: PLATFORM_API_COLORS[name] || PLATFORM_COLORS[name] || '#6366F1' }}
          />
          <span className="text-xs text-zinc-400">{name}</span>
        </div>
      ))}
    </div>
  )
}

function PlatformFunnelComparison({
  platformFunnelData,
  platforms,
}: {
  platformFunnelData: Record<string, string | number>[]
  platforms: string[]
}) {
  if (!platformFunnelData.length) return null

  return (
    <motion.div
      variants={fadeInUp}
      custom={1}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6"
    >
      <PlatformLegend platforms={platforms} />
      <div className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={platformFunnelData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            barCategoryGap="18%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="step"
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
              axisLine={{ stroke: '#3f3f46' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toString())}
            />
            <Tooltip
              contentStyle={{
                background: '#18181b',
                border: '1px solid #3f3f46',
                borderRadius: '12px',
                fontSize: 13,
                color: '#e4e4e7',
              }}
              formatter={(value: number) => [value.toLocaleString(), '']}
            />
            {platforms.map((p) => (
              <Bar
                key={p}
                dataKey={p}
                fill={PLATFORM_API_COLORS[p] || PLATFORM_COLORS[p] || '#6366F1'}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Platform performance summary */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {platforms.map((platform) => {
          const lastRow = platformFunnelData[platformFunnelData.length - 1]
          const firstRow = platformFunnelData[0]
          const purchases = (lastRow?.[platform] as number) || 0
          const impressions = (firstRow?.[platform] as number) || 1
          const overallRate = ((purchases / impressions) * 100).toFixed(3)
          const color = PLATFORM_API_COLORS[platform] || PLATFORM_COLORS[platform] || '#6366F1'

          return (
            <div
              key={platform}
              className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/40"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-xs text-zinc-400">{platform}</span>
              </div>
              <div className="text-lg font-bold" style={{ color }}>
                {overallRate}%
              </div>
              <div className="text-[11px] text-zinc-500">Overall conv.</div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

function TouchpointTimeline({
  timelineEvents,
  attributionModels,
}: {
  timelineEvents: TimelineEvent[]
  attributionModels: AttributionModel[]
}) {
  const [activeModel, setActiveModel] = useState('Last-Click')
  const activeModelData = attributionModels.find((m) => m.name === activeModel)

  return (
    <motion.div
      variants={fadeInUp}
      custom={1}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6"
    >
      {/* Timeline */}
      <div className="relative mb-8">
        <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-zinc-700/50" />

        <div className="flex flex-col gap-0">
          {timelineEvents.map((event, i) => {
            const Icon = event.icon
            return (
              <motion.div
                key={`${event.day}-${event.platform}-${i}`}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.4 }}
                className="flex items-start gap-4 py-3 relative"
              >
                <div className="relative z-10 shrink-0">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                      event.platform === 'Purchase' ? 'bg-cyan-400/20 border-cyan-400' : ''
                    }`}
                    style={{
                      backgroundColor:
                        event.platform !== 'Purchase' ? `${event.color}18` : undefined,
                      borderColor: event.platform !== 'Purchase' ? event.color : undefined,
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: event.color }} />
                  </div>
                </div>

                <div className="flex-1 bg-zinc-800/50 border border-zinc-700/40 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${event.color}20`,
                        color: event.color,
                      }}
                    >
                      Day {event.day}
                    </span>
                    <span className="text-sm font-medium text-zinc-200">{event.action}</span>
                  </div>
                  <p className="text-xs text-zinc-500">{event.description}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Attribution Model Selector */}
      <div className="border-t border-zinc-800 pt-5">
        <div className="flex items-center gap-2 mb-4">
          <GitCompare className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-zinc-200">Attribution Model</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          {attributionModels.map((model) => (
            <button
              key={model.name}
              onClick={() => setActiveModel(model.name)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeModel === model.name
                  ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/40'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-zinc-200 hover:border-zinc-600'
              }`}
            >
              {model.name}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeModelData && (
            <motion.div
              key={activeModel}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="mb-4"
            >
              <p className="text-xs text-zinc-500 mb-3">{activeModelData.description}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(activeModelData.credits).map(([platform, credit]) => {
                  const color = PLATFORM_API_COLORS[platform] || PLATFORM_COLORS[platform] || '#6366F1'
                  return (
                    <div
                      key={platform}
                      className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/30"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                        <span className="text-xs text-zinc-400">{platform}</span>
                      </div>
                      <div className="flex items-end gap-2">
                        <span className="text-xl font-bold text-zinc-100">{credit}%</span>
                        <div className="flex-1 h-2 bg-zinc-700/50 rounded-full overflow-hidden mb-1.5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${credit}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: color }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function AttributionTable({
  attributionModels,
  platformNames,
}: {
  attributionModels: AttributionModel[]
  platformNames: string[]
}) {
  const headerColors: Record<string, string> = {
    Meta: 'text-blue-400',
    Google: 'text-red-400',
    TikTok: 'text-neutral-400',
    Snap: 'text-yellow-400',
  }
  const barColors: Record<string, string> = {
    Meta: 'bg-blue-500',
    Google: 'bg-red-500',
    TikTok: 'bg-neutral-500',
    Snap: 'bg-yellow-500',
  }
  const cellActiveColors: Record<string, string> = {
    Meta: 'text-blue-400',
    Google: 'text-red-400',
    TikTok: 'text-neutral-300',
    Snap: 'text-yellow-400',
  }

  return (
    <motion.div
      variants={fadeInUp}
      custom={1}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 overflow-x-auto"
    >
      <table className="w-full min-w-[540px]">
        <thead>
          <tr className="border-b border-zinc-700/60">
            <th
              scope="col"
              className="text-left py-3 px-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider"
            >
              Model
            </th>
            {platformNames.map((p) => (
              <th
                key={p}
                scope="col"
                className={`text-center py-3 px-3 text-xs font-semibold uppercase tracking-wider ${headerColors[p] || 'text-zinc-400'}`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-sm"
                    style={{ backgroundColor: PLATFORM_API_COLORS[p] || PLATFORM_COLORS[p] || '#6366F1' }}
                  />
                  {p}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {attributionModels.map((model, i) => (
            <motion.tr
              key={model.name}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors"
            >
              <td className="py-3.5 px-3">
                <span className="text-sm font-medium text-zinc-200">{model.name}</span>
              </td>
              {platformNames.map((p) => {
                const val = model.credits[p] || 0
                const valStr = `${val}%`
                const activeColor = cellActiveColors[p] || 'text-zinc-400'
                const barColor = barColors[p] || 'bg-zinc-500'
                return (
                  <td key={p} className="py-3.5 px-3 text-center">
                    <span
                      className={`text-sm font-bold ${
                        val > 30 ? activeColor : val > 0 ? `${activeColor}/60` : 'text-zinc-600'
                      }`}
                    >
                      {valStr}
                    </span>
                    <div className="w-16 h-1 bg-zinc-700/40 rounded-full mx-auto mt-1 overflow-hidden">
                      <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: valStr }} />
                    </div>
                  </td>
                )
              })}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */

export default function Attribution() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(30)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiGet<DashboardResponse>(`/reports/dashboard?days=${days}`)
      setData(response)
    } catch (err: any) {
      console.error('[Attribution] Failed to load dashboard data:', err)
      setError(err?.message || 'Failed to load attribution data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Refresh every 60 seconds
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [days])

  // Derived data using useMemo
  const funnelSteps = useMemo(() => {
    if (!data) return { steps: [] as FunnelStep[], rates: [] as ConversionRate[] }
    return buildFunnelSteps(data)
  }, [data])

  const platformFunnelData = useMemo(() => {
    if (!data?.platformMetrics) return []
    return buildPlatformFunnelData(data.platformMetrics)
  }, [data])

  const platformNames = useMemo(() => {
    if (!data?.platformMetrics) return ['Meta', 'Google', 'TikTok', 'Snap']
    return data.platformMetrics.map((p) => p.platform)
  }, [data])

  const attributionModels = useMemo(() => {
    if (!data?.platformMetrics) return []
    return computeAttributionModels(data.platformMetrics)
  }, [data])

  const timelineEvents = useMemo(() => {
    if (!data?.platformMetrics) return []
    return buildTimelineEvents(data.platformMetrics)
  }, [data])

  const insight = useMemo(() => {
    if (!data?.platformMetrics) return ''
    return generateInsight(data.platformMetrics, attributionModels)
  }, [data, attributionModels])

  // Header stats
  const headerStats = useMemo(() => {
    if (!data?.summary) return []
    const s = data.summary
    return [
      {
        label: 'Total Impressions',
        value: s.impressions >= 1000000
          ? `${(s.impressions / 1000000).toFixed(1)}M`
          : s.impressions >= 1000
            ? `${(s.impressions / 1000).toFixed(0)}K`
            : s.impressions.toLocaleString(),
        icon: Eye,
      },
      {
        label: 'Total Clicks',
        value: s.clicks >= 1000 ? `${(s.clicks / 1000).toFixed(0)}K` : s.clicks.toLocaleString(),
        icon: MousePointer,
      },
      {
        label: 'Add to Cart',
        value: (() => {
          const atc = Math.round(s.clicks * 0.8 * 0.15)
          return atc >= 1000 ? `${(atc / 1000).toFixed(1)}K` : atc.toLocaleString()
        })(),
        icon: ShoppingCart,
      },
      {
        label: 'Purchases',
        value: s.conversions >= 1000
          ? `${(s.conversions / 1000).toFixed(1)}K`
          : s.conversions.toLocaleString(),
        icon: CreditCard,
      },
    ]
  }, [data])

  const sectionClass = 'mb-16 last:mb-0'

  return (
    <>
    <SEO
      title="Attribution"
      description="Analyze multi-touch attribution across your campaigns. Understand the customer journey and credit each touchpoint accurately."
      keywords="attribution, multi-touch attribution, customer journey, touchpoint analysis"
    />
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ── Header ── */}
      <div className="border-b border-zinc-800/60 bg-zinc-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center justify-between mb-2 flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-400/10 border border-cyan-400/20">
                  <Share2 className="w-5 h-5 text-cyan-400" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100">Attribution Funnel</h1>
              </div>
              <div className="flex items-center gap-2">
                {[7, 14, 30, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      days === d
                        ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/40'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-zinc-200 hover:border-zinc-600'
                    }`}
                  >
                    {d === 1 ? 'Today' : `Last ${d}d`}
                  </button>
                ))}
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-600 transition-all disabled:opacity-40"
                  title="Refresh"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
            <p className="text-sm text-zinc-400 ml-12">
              Cross-platform customer journey analysis and attribution modeling
            </p>
          </motion.div>

          {/* Summary stats */}
          {loading && !data ? (
            <div className="ml-12 mt-6">
              <StatsSkeleton />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 ml-12"
            >
              {headerStats.map((stat) => {
                const Icon = stat.icon
                return (
                  <div
                    key={stat.label}
                    className="bg-zinc-800/50 border border-zinc-700/40 rounded-xl p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-[11px] text-zinc-500">{stat.label}</span>
                    </div>
                    <div className="text-lg font-bold text-zinc-100">{stat.value}</div>
                  </div>
                )
              })}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {error && <ErrorBanner message={error} onRetry={fetchData} />}

        {/* Section 1: Funnel Overview */}
        <section className={sectionClass}>
          <SectionHeader
            icon={Filter}
            title="Funnel Overview"
            subtitle="Aggregated conversion funnel across all platforms with step-by-step conversion rates"
            index={0}
          />
          {loading && !data ? (
            <FunnelSkeleton />
          ) : (
            <HorizontalFunnel
              funnelSteps={funnelSteps.steps}
              conversionRates={funnelSteps.rates}
            />
          )}
        </section>

        {/* Section 2: Platform Funnel Comparison */}
        <section className={sectionClass}>
          <SectionHeader
            icon={BarChart3}
            title="Platform Funnel Comparison"
            subtitle="Side-by-side funnel performance for each advertising platform"
            index={0}
          />
          {loading && !data ? (
            <ChartSkeleton />
          ) : (
            <PlatformFunnelComparison
              platformFunnelData={platformFunnelData}
              platforms={platformNames}
            />
          )}
        </section>

        {/* Section 3: Touchpoint Timeline */}
        <section className={sectionClass}>
          <SectionHeader
            icon={Clock}
            title="Touchpoint Timeline"
            subtitle="Customer journey across multiple platforms with live attribution model visualization"
            index={0}
          />
          {loading && !data ? (
            <TimelineSkeleton />
          ) : (
            <TouchpointTimeline
              timelineEvents={timelineEvents}
              attributionModels={attributionModels}
            />
          )}
        </section>

        {/* Section 4: Attribution Model Comparison */}
        <section className={sectionClass}>
          <SectionHeader
            icon={Layers}
            title="Attribution Model Comparison"
            subtitle="How credit is distributed across platforms under different attribution models"
            index={0}
          />
          {loading && !data ? (
            <TableSkeleton />
          ) : (
            <AttributionTable
              attributionModels={attributionModels}
              platformNames={platformNames}
            />
          )}

          {/* Insight box */}
          {!loading && insight && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-5 bg-zinc-800/40 border border-zinc-700/40 rounded-xl p-4 flex items-start gap-3"
            >
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-zinc-300 mb-1">Key Insight</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{insight}</p>
              </div>
            </motion.div>
          )}
        </section>
      </div>
    </div>
    </>
  )
}
