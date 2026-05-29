/**
 * SkeletonDashboard.tsx
 *
 * A beautiful full-page skeleton loader for the Dashboard page.
 * Replicates the exact layout of KPI cards, charts, and tables with
 * a pulsing shimmer effect using CSS gradient animation.
 *
 * Layout match:
 *   - Header (title + date picker + export button)
 *   - 5x KPI cards in a responsive grid
 *   - 2x chart cards (spend over time + platform performance)
 *   - Campaigns table + Activity feed side by side
 */

import { motion } from 'framer-motion'
import { Skeleton } from './ui/skeleton'

/* ──────────────────────────────────────────────
   Shimmer wrapper — adds the gradient sweep
   ────────────────────────────────────────────── */
function ShimmerBox({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`rounded-xl border border-white/[0.05] overflow-hidden ${className}`}
      style={{ background: '#111111' }}
    >
      {children}
    </motion.div>
  )
}

/* ──────────────────────────────────────────────
   Shimmer line — animated gradient bar
   ────────────────────────────────────────────── */
function ShimmerLine({ height = 12, width = '100%', className = '', rounded = 'md' }: { height?: number; width?: string | number; className?: string; rounded?: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-white/[0.06] rounded-${rounded} ${className}`}
      style={{ height, width: typeof width === 'number' ? `${width}px` : width }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 2s infinite',
        }}
      />
    </div>
  )
}

/* ──────────────────────────────────────────────
   KPI Card Skeleton
   ────────────────────────────────────────────── */
function SkeletonKPI({ delay = 0 }: { delay?: number }) {
  return (
    <ShimmerBox className="p-4 space-y-3" delay={delay}>
      <div className="flex items-center justify-between">
        <ShimmerLine height={10} width={80} />
        <div className="w-7 h-7 rounded-full bg-white/[0.06] relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s infinite',
            }}
          />
        </div>
      </div>
      <ShimmerLine height={32} width={96} rounded="lg" />
      <div className="flex items-center gap-2">
        <div className="w-12 h-5 rounded-full bg-white/[0.06] relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s infinite',
            }}
          />
        </div>
        <ShimmerLine height={10} width={48} />
      </div>
    </ShimmerBox>
  )
}

/* ──────────────────────────────────────────────
   Chart Card Skeleton
   ────────────────────────────────────────────── */
function SkeletonChart({ delay = 0, height = 280 }: { delay?: number; height?: number }) {
  return (
    <ShimmerBox className="p-4 space-y-4" delay={delay}>
      <div className="flex items-center justify-between">
        <ShimmerLine height={18} width={140} rounded="md" />
        <div className="w-4 h-4 rounded-full bg-white/[0.06] relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s infinite',
            }}
          />
        </div>
      </div>
      <div className="relative overflow-hidden rounded-lg bg-white/[0.04]" style={{ height }}>
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s infinite',
          }}
        />
      </div>
    </ShimmerBox>
  )
}

/* ──────────────────────────────────────────────
   Table Row Skeleton
   ────────────────────────────────────────────── */
function SkeletonTableRow({ columns = 9, isHeader = false }: { columns?: number; isHeader?: boolean }) {
  return (
    <div
      className="grid gap-3 py-2.5 items-center"
      style={{
        gridTemplateColumns: `2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr`,
        borderBottom: isHeader ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded bg-white/[0.06]"
          style={{
            height: isHeader ? 14 : 12,
            width: i === 0 ? '85%' : `${55 + (i % 3) * 15}%`,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s infinite',
              animationDelay: `${i * 0.1}s`,
            }}
          />
        </div>
      ))}
    </div>
  )
}

/* ──────────────────────────────────────────────
   Campaigns Table Skeleton
   ────────────────────────────────────────────── */
function SkeletonCampaignsTable({ delay = 0 }: { delay?: number }) {
  return (
    <ShimmerBox className="p-4" delay={delay}>
      <div className="flex items-center justify-between mb-4">
        <ShimmerLine height={18} width={128} rounded="md" />
        <ShimmerLine height={10} width={64} rounded="sm" />
      </div>
      <div className="space-y-0">
        <SkeletonTableRow isHeader />
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonTableRow key={i} />
        ))}
      </div>
    </ShimmerBox>
  )
}

/* ──────────────────────────────────────────────
   Activity Feed Skeleton
   ────────────────────────────────────────────── */
function SkeletonActivityFeed({ delay = 0 }: { delay?: number }) {
  return (
    <ShimmerBox className="p-4" delay={delay}>
      <div className="flex items-center justify-between mb-4">
        <ShimmerLine height={18} width={96} rounded="md" />
        <div className="flex gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-10 h-5 rounded bg-white/[0.06] relative overflow-hidden">
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2s infinite',
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3" style={{ borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <div className="w-9 h-9 rounded-full bg-white/[0.06] flex-shrink-0 relative overflow-hidden">
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2s infinite',
                  animationDelay: `${i * 0.12}s`,
                }}
              />
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 rounded bg-white/[0.06] relative overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s infinite',
                    animationDelay: `${i * 0.12 + 0.05}s`,
                  }}
                />
              </div>
              <div className="h-2.5 w-1/2 rounded bg-white/[0.06] relative overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s infinite',
                    animationDelay: `${i * 0.12 + 0.1}s`,
                  }}
                />
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <div className="h-2.5 w-10 rounded bg-white/[0.06] relative overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s infinite',
                  }}
                />
              </div>
              <div className="h-4 w-8 rounded bg-white/[0.06] relative overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s infinite',
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </ShimmerBox>
  )
}

/* ──────────────────────────────────────────────
   Main Skeleton Dashboard
   ────────────────────────────────────────────── */
export interface SkeletonDashboardProps {
  className?: string
}

export default function SkeletonDashboard({ className }: SkeletonDashboardProps) {
  return (
    <div className={`min-h-[100dvh] ${className || ''}`} style={{ background: '#0a0a0a' }}>
      <div className="flex">
        {/* Sidebar spacer (matches Layout sidebar) */}
        <div className="hidden lg:block w-64 flex-shrink-0" />

        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 max-w-[1440px] mx-auto w-full">
          {/* ── Header ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="space-y-2">
                <ShimmerLine height={28} width={180} rounded="lg" />
                <ShimmerLine height={14} width={260} />
              </div>
              <div className="flex items-center gap-3">
                <ShimmerBox className="px-4 py-2" delay={0.05}>
                  <ShimmerLine height={16} width={100} />
                </ShimmerBox>
                <ShimmerBox className="px-4 py-2" delay={0.1}>
                  <ShimmerLine height={16} width={60} />
                </ShimmerBox>
              </div>
            </div>
          </motion.div>

          {/* ── KPI Cards Row ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonKPI key={i} delay={i * 0.04} />
            ))}
          </div>

          {/* ── Charts Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
            <div className="lg:col-span-3">
              <SkeletonChart height={280} delay={0.2} />
            </div>
            <div className="lg:col-span-2">
              <SkeletonChart height={280} delay={0.25} />
            </div>
          </div>

          {/* ── Table + Activity Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
            <div className="lg:col-span-3">
              <SkeletonCampaignsTable delay={0.3} />
            </div>
            <div className="lg:col-span-2">
              <SkeletonActivityFeed delay={0.35} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
