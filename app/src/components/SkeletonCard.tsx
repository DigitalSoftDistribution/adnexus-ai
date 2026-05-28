/**
 * SkeletonCard.tsx
 *
 * A reusable skeleton card component with shimmer effect for loading states.
 * Supports flexible sizing and circular (avatar) mode.
 *
 * Props:
 *   - height:    Height of the skeleton (number = px, string = any CSS value)
 *   - width:     Width of the skeleton (number = px, string = any CSS value)
 *   - circle:    If true, renders a circular avatar-style skeleton
 *   - className: Additional CSS classes
 */

import { motion, useReducedMotion } from 'framer-motion'

export interface SkeletonCardProps {
  height?: number | string
  width?: number | string
  circle?: boolean
  className?: string
}

export default function SkeletonCard({
  height = 120,
  width = '100%',
  circle = false,
  className,
}: SkeletonCardProps) {
  const reducedMotion = useReducedMotion()

  const h = typeof height === 'number' ? `${height}px` : height
  const w = typeof width === 'number' ? `${width}px` : width

  if (circle) {
    const size = typeof height === 'number' ? height : 48
    return (
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={`skeleton-shimmer rounded-full flex-shrink-0 inline-block ${className || ''}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
        }}
        aria-hidden="true"
        data-testid="skeleton-circle"
      />
    )
  }

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`skeleton-shimmer rounded-xl ${className || ''}`}
      style={{
        width: w,
        height: h,
      }}
      aria-hidden="true"
      data-testid="skeleton-card"
    />
  )
}
