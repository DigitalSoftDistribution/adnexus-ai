/**
 * SkeletonTable.tsx
 *
 * A reusable table skeleton loader with 5 rows of pulsing content.
 * Includes an animated header row and staggered shimmer bars per column.
 * Dark-theme compatible with the AdNexus AI design system.
 *
 * Usage:
 *   <SkeletonTable columns={8} rows={5} showHeader />
 *   <SkeletonTable columns={6} rows={3} className="my-4" />
 */

import { motion } from 'framer-motion'

export interface SkeletonTableProps {
  /** Number of data rows to render (default: 5) */
  rows?: number
  /** Number of columns to render (default: 8) */
  columns?: number
  /** Whether to show a header row (default: true) */
  showHeader?: boolean
  /** Whether to show the card wrapper with title area (default: true) */
  showCard?: boolean
  /** Card title placeholder (default: none) */
  cardTitle?: string
  /** Optional card action placeholder (default: none) */
  cardAction?: string
  /** Additional CSS classes */
  className?: string
}

/* ─── Shimmer bar with animated gradient sweep ─── */
function ShimmerBar({ height = 10, width = '100%', delay = 0, rounded = 'sm' }: { height?: number; width?: string | number; delay?: number; rounded?: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-white/[0.06] rounded-${rounded}`}
      style={{ height, width: typeof width === 'number' ? `${width}px` : width }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
        }}
        animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
          delay,
        }}
      />
    </div>
  )
}

/* ─── Individual table row ─── */
function TableRow({ columns, isHeader, delayOffset = 0 }: { columns: number; isHeader?: boolean; delayOffset?: number }) {
  // Column width distribution — first column is wider (typically "Name")
  const getWidth = (colIdx: number) => {
    if (colIdx === 0) return '85%'
    const mod = colIdx % 3
    if (mod === 0) return '70%'
    if (mod === 1) return '55%'
    return '60%'
  }

  return (
    <div
      className="grid gap-3 items-center"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        borderBottom: isHeader
          ? '1px solid rgba(255,255,255,0.06)'
          : '1px solid rgba(255,255,255,0.035)',
        padding: isHeader ? '10px 0' : '12px 0',
      }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <ShimmerBar
          key={i}
          height={isHeader ? 12 : 10}
          width={getWidth(i)}
          delay={delayOffset + i * 0.08}
          rounded={isHeader ? 'sm' : 'sm'}
        />
      ))}
    </div>
  )
}

/* ─── Main SkeletonTable component ─── */
export default function SkeletonTable({
  rows = 5,
  columns = 8,
  showHeader = true,
  showCard = true,
  cardTitle,
  cardAction,
  className,
}: SkeletonTableProps) {
  const tableContent = (
    <div className={`w-full ${className || ''}`}>
      {/* Optional card title + action */}
      {showCard && (cardTitle || cardAction) && (
        <div className="flex items-center justify-between mb-4">
          {cardTitle ? (
            <ShimmerBar height={18} width={140} delay={0} rounded="md" />
          ) : (
            <div />
          )}
          {cardAction ? (
            <ShimmerBar height={10} width={64} delay={0.05} rounded="sm" />
          ) : (
            <div />
          )}
        </div>
      )}

      {/* Header row */}
      {showHeader && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <TableRow columns={columns} isHeader delayOffset={0} />
        </motion.div>
      )}

      {/* Data rows — staggered entrance */}
      <div className="space-y-0">
        {Array.from({ length: rows }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.25,
              delay: i * 0.06,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            <TableRow columns={columns} delayOffset={i * 0.15} />
          </motion.div>
        ))}
      </div>
    </div>
  )

  if (!showCard) return tableContent

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-xl border border-white/[0.05] p-4"
      style={{ background: '#111111' }}
    >
      {tableContent}
    </motion.div>
  )
}
