// @ts-nocheck
/**
 * SkeletonLoader.tsx
 *
 * Reusable skeleton components for loading states across the app.
 * Uses the shadcn/ui Skeleton component as the base with custom
 * styling for dark-theme compatibility and consistent visual language.
 *
 * Components:
 *   - SkeletonCard   : Card-shaped skeleton with pulsing animation
 *   - SkeletonTable  : Table row skeletons (configurable columns)
 *   - SkeletonChart  : Chart area skeleton
 *   - SkeletonKPI    : KPI card skeleton
 *   - SkeletonText   : Text line skeleton (configurable width)
 */

import { motion } from 'framer-motion'
import { Skeleton } from './ui/skeleton'

/* ──────────────────────────────────────────────
   SkeletonText — single text line
   ────────────────────────────────────────────── */
export interface SkeletonTextProps {
  width?: string | number
  className?: string
}

export function SkeletonText({ width = '100%', className }: SkeletonTextProps) {
  const w = typeof width === 'number' ? `${width}px` : width
  return (
    <Skeleton
      className={`h-4 rounded ${className || ''}`}
      style={{ width: w }}
      shimmer
    />
  )
}

/* ──────────────────────────────────────────────
   SkeletonKPI — KPI card skeleton
   ────────────────────────────────────────────── */
export interface SkeletonKPIProps {
  className?: string
}

export function SkeletonKPI({ className }: SkeletonKPIProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`rounded-xl border border-white/[0.05] p-4 space-y-3 ${className || ''}`}
      style={{ background: '#111111' }}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-8 w-20" />
    </motion.div>
  )
}

/* ──────────────────────────────────────────────
   SkeletonCard — card-shaped skeleton
   ────────────────────────────────────────────── */
export interface SkeletonCardProps {
  rows?: number
  className?: string
}

export function SkeletonCard({ rows = 3, className }: SkeletonCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`rounded-xl border border-white/[0.05] p-4 space-y-3 ${className || ''}`}
      style={{ background: '#111111' }}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, delay: i * 0.05 }}
          className="space-y-2"
        >
          <Skeleton className="h-3 w-full" />
          {i === 0 && <Skeleton className="h-3 w-3/4" />}
        </motion.div>
      ))}
    </motion.div>
  )
}

/* ──────────────────────────────────────────────
   SkeletonChart — chart area skeleton
   ────────────────────────────────────────────── */
export interface SkeletonChartProps {
  height?: number
  className?: string
}

export function SkeletonChart({ height = 280, className }: SkeletonChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`rounded-xl border border-white/[0.05] p-4 space-y-3 ${className || ''}`}
      style={{ background: '#111111' }}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton style={{ height }} className="w-full rounded-lg" />
    </motion.div>
  )
}

/* ──────────────────────────────────────────────
   SkeletonTable — table row skeletons
   ────────────────────────────────────────────── */
export interface SkeletonTableProps {
  rows?: number
  columns?: number
  className?: string
}

export function SkeletonTable({
  rows = 5,
  columns = 8,
  className,
}: SkeletonTableProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`rounded-xl border border-white/[0.05] p-4 space-y-3 ${className || ''}`}
      style={{ background: '#111111' }}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>

      {/* Header row */}
      <div
        className="grid gap-3 pb-2"
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
        }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-4 w-full" />
        ))}
      </div>

      {/* Data rows with stagger */}
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <motion.div
            key={rowIdx}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: rowIdx * 0.05, ease: [0.4, 0, 0.2, 1] }}
            className="grid gap-3 py-2"
            style={{
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              borderBottom:
                rowIdx < rows - 1
                  ? '1px solid rgba(255,255,255,0.04)'
                  : 'none',
            }}
          >
            {Array.from({ length: columns }).map((_, colIdx) => (
              <Skeleton
                key={`c-${rowIdx}-${colIdx}`}
                className="h-3"
                style={{
                  width: `${60 + (colIdx % 3) * 15}%`,
                }}
              />
            ))}
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

/* ──────────────────────────────────────────────
   SkeletonActivity — activity feed skeleton
   ────────────────────────────────────────────── */
export interface SkeletonActivityProps {
  rows?: number
  className?: string
}

export function SkeletonActivity({
  rows = 6,
  className,
}: SkeletonActivityProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`rounded-xl border border-white/[0.05] p-4 space-y-3 ${className || ''}`}
      style={{ background: '#111111' }}
    >
      <Skeleton className="h-5 w-32 mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] }}
          className="flex items-center gap-3 py-2"
        >
          <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}

/* ──────────────────────────────────────────────
   SkeletonGrid — grid card skeletons
   ────────────────────────────────────────────── */
export interface SkeletonGridProps {
  count?: number
  className?: string
}

export function SkeletonGrid({ count = 8, className }: SkeletonGridProps) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className || ''}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] }}
          className="rounded-xl p-4 space-y-3"
          style={{
            background: '#111111',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-8 rounded" />
            <Skeleton className="h-8 rounded" />
            <Skeleton className="h-8 rounded" />
          </div>
        </motion.div>
      ))}
    </div>
  )
}

/* ──────────────────────────────────────────────
   SkeletonPage — full page loading skeleton
   (combines KPI + charts + table for dashboard)
   ────────────────────────────────────────────── */
export interface SkeletonPageProps {
  kpiCount?: number
  className?: string
}

export function SkeletonPage({ kpiCount = 5, className }: SkeletonPageProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`space-y-6 ${className || ''}`}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex items-center justify-between"
      >
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </motion.div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: kpiCount }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <SkeletonKPI />
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <SkeletonChart height={280} />
        </motion.div>
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <SkeletonChart height={280} />
        </motion.div>
      </div>

      {/* Table row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <SkeletonTable rows={5} columns={9} />
        </motion.div>
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <SkeletonActivity rows={6} />
        </motion.div>
      </div>
    </motion.div>
  )
}
