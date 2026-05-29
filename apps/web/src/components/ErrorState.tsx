/**
 * ErrorState.tsx
 *
 * Reusable error state component for when API calls fail.
 *
 * Features:
 *   - Error icon (AlertTriangle)
 *   - Error title + message
 *   - "Retry" button with loading state
 *   - Dark theme compatible
 *   - Subtle entrance animation
 */

import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'

export interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void | Promise<void>
  retryLabel?: string
  children?: ReactNode
  className?: string
}

export default function ErrorState({
  title = 'Something went wrong',
  message = 'Failed to load data. Please check your connection and try again.',
  onRetry,
  retryLabel = 'Retry',
  children,
  className,
}: ErrorStateProps) {
  const [isRetrying, setIsRetrying] = useState(false)
  const reducedMotion = useReducedMotion()

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return
    setIsRetrying(true)
    try {
      await onRetry()
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
      className={`flex flex-col items-center justify-center py-16 px-4 ${className || ''}`}
    >
      {/* Error icon */}
      <motion.div
        className="flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
        style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.15)',
        }}
        animate={
          reducedMotion
            ? {}
            : { scale: [1, 1.05, 1] }
        }
        transition={
          reducedMotion
            ? {}
            : { duration: 2, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        <AlertTriangle size={28} style={{ color: '#EF4444' }} />
      </motion.div>

      {/* Title */}
      <h3
        className="text-[15px] font-semibold mb-1 text-center"
        style={{ color: '#FFFFFF' }}
      >
        {title}
      </h3>

      {/* Message */}
      {message && (
        <p
          className="text-[13px] text-center max-w-[360px] mb-5"
          style={{ color: '#8A8F98' }}
        >
          {message}
        </p>
      )}

      {/* Retry button */}
      {onRetry && (
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="flex items-center gap-2 h-9 px-4 rounded-lg text-[13px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: '#2563EB' }}
        >
          <motion.span
            animate={isRetrying ? { rotate: 360 } : {}}
            transition={
              isRetrying
                ? { duration: 1, repeat: Infinity, ease: 'linear' }
                : {}
            }
          >
            <RefreshCw size={14} />
          </motion.span>
          {isRetrying ? 'Retrying...' : retryLabel}
        </button>
      )}

      {/* Custom content */}
      {children}
    </motion.div>
  )
}
