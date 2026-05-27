// @ts-nocheck
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/* ──────────────────────────────────────────────
   Responsive Grid Utility Component

   Columns:
   - Mobile  (< 640px) : 1 column
   - Tablet  (640px)   : 2 columns
   - Desktop (1024px)  : 3 columns
   - Large   (1280px)  : 4 columns

   Gap: configurable via prop (default: 1rem / 16px)
   ────────────────────────────────────────────── */

interface ResponsiveGridProps {
  children: ReactNode
  gap?: number | string
  className?: string
}

export default function ResponsiveGrid({
  children,
  gap = 16,
  className,
}: ResponsiveGridProps) {
  const gapValue = typeof gap === 'number' ? `${gap}px` : gap

  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className
      )}
      style={{ gap: gapValue }}
    >
      {children}
    </div>
  )
}
