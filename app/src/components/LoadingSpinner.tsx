// @ts-nocheck
/**
 * LoadingSpinner.tsx
 *
 * A centered, full-page loading spinner using the AdNexus AI brand
 * color (#c3f53b — acid lime). Includes a pulsing logo dot and a
 * subtle "Loading..." label. Uses Framer Motion for smooth entry
 * and a CSS spinning ring for the loader itself.
 *
 * Usage:
 *   <LoadingSpinner />
 *   <LoadingSpinner label="Fetching campaigns..." />
 *   <LoadingSpinner size="sm" />
 */

import { motion } from 'framer-motion'

export interface LoadingSpinnerProps {
  /** Optional custom label below the spinner (default: "Loading...") */
  label?: string
  /** Spinner size: sm, md, or lg (default: md) */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to take up full viewport height (default: true) */
  fullScreen?: boolean
  /** Additional CSS classes */
  className?: string
}

const SIZE_MAP = {
  sm: { ring: 32, dot: 6, stroke: 2, font: 'text-[11px]', labelMt: 'mt-2' },
  md: { ring: 48, dot: 8, stroke: 2.5, font: 'text-[13px]', labelMt: 'mt-3' },
  lg: { ring: 64, dot: 10, stroke: 3, font: 'text-sm', labelMt: 'mt-4' },
}

// AdNexus AI brand color — acid lime
const BRAND_COLOR = '#c3f53b'

export default function LoadingSpinner({
  label = 'Loading...',
  size = 'md',
  fullScreen = true,
  className,
}: LoadingSpinnerProps) {
  const s = SIZE_MAP[size]
  const half = s.ring / 2
  const r = half - s.stroke * 2
  const circumference = 2 * Math.PI * r

  const containerClasses = fullScreen
    ? `flex flex-col items-center justify-center min-h-[50vh] ${className || ''}`
    : `flex flex-col items-center justify-center py-8 ${className || ''}`

  return (
    <motion.div
      className={containerClasses}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="relative" style={{ width: s.ring, height: s.ring }}>
        {/* Outer spinning ring */}
        <svg
          width={s.ring}
          height={s.ring}
          viewBox={`0 0 ${s.ring} ${s.ring}`}
          className="animate-spin"
          style={{ animationDuration: '1s' }}
        >
          {/* Track ring (dimmed) */}
          <circle
            cx={half}
            cy={half}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={s.stroke}
          />
          {/* Active arc (brand color) */}
          <circle
            cx={half}
            cy={half}
            r={r}
            fill="none"
            stroke={BRAND_COLOR}
            strokeWidth={s.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * 0.25}
          />
        </svg>

        {/* Center brand dot with pulse */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <motion.div
            className="rounded-full"
            style={{
              width: s.dot,
              height: s.dot,
              backgroundColor: BRAND_COLOR,
              boxShadow: `0 0 12px ${BRAND_COLOR}40`,
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.7, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </motion.div>
      </div>

      {/* Label */}
      {label && (
        <motion.p
          className={`${s.labelMt} ${s.font} font-medium tracking-wide`}
          style={{ color: '#8A8F98' }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          {label}
        </motion.p>
      )}
    </motion.div>
  )
}
