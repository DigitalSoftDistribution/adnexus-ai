/**
 * EmptyState.tsx
 *
 * Beautiful empty state component for when no data is available.
 * (No campaigns, no drafts, no reports, etc.)
 *
 * Features:
 *   - Configurable Lucide icon
 *   - Title and description
 *   - Optional CTA button with action callback
 *   - Dark theme with subtle glow accents
 *   - Entrance animation via Framer Motion
 *   - Reduced motion support
 */

import { motion, useReducedMotion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

export interface EmptyStateProps {
  /** Lucide icon component to display */
  icon?: LucideIcon
  /** Heading text */
  title: string
  /** Subtext description */
  description?: string
  /** CTA button label (if provided, onAction must also be provided) */
  actionLabel?: string
  /** CTA button click handler */
  onAction?: () => void
  /** Additional CSS classes */
  className?: string
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const reducedMotion = useReducedMotion()

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
      className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className || ''}`}
    >
      {/* Icon circle with subtle glow */}
      {Icon && (
        <motion.div
          initial={reducedMotion ? false : { scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.05, ease: [0.34, 1.56, 0.64, 1] }}
          className="flex items-center justify-center w-[72px] h-[72px] rounded-2xl mb-5"
          style={{
            background: 'radial-gradient(circle at 50% 40%, rgba(195,245,59,0.06) 0%, rgba(255,255,255,0.02) 70%)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 0 40px rgba(195,245,59,0.03)',
          }}
        >
          <Icon
            size={32}
            className="text-[#555B66]"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </motion.div>
      )}

      {/* Title */}
      <motion.h3
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="text-[15px] font-semibold mb-1.5 tracking-tight"
        style={{ color: '#FFFFFF' }}
      >
        {title}
      </motion.h3>

      {/* Description */}
      {description && (
        <motion.p
          initial={reducedMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="text-[13px] text-center max-w-[340px] mb-6 leading-relaxed"
          style={{ color: '#8A8F98' }}
        >
          {description}
        </motion.p>
      )}

      {/* Action button */}
      {actionLabel && onAction && (
        <motion.button
          initial={reducedMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onAction}
          className="
            flex items-center gap-2 h-9 px-5 rounded-lg
            text-[13px] font-semibold text-[#0a0a0a]
            transition-colors duration-200
            hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#c3f53b] focus:ring-offset-2 focus:ring-offset-[#0a0a0a]
          "
          style={{ background: '#c3f53b' }}
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  )
}
