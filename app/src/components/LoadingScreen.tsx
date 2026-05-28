/**
 * LoadingScreen.tsx
 *
 * Full-page loading screen used during auth checks and data loading.
 * Features:
 *   - Animated AdNexus AI logo (pulsing + rotating ring)
 *   - Loading spinner
 *   - Optional loading message
 *   - Respects prefers-reduced-motion
 */

import { motion, useReducedMotion } from 'framer-motion'
import { Zap } from 'lucide-react'

export interface LoadingScreenProps {
  message?: string
  submessage?: string
  fullScreen?: boolean
}

export default function LoadingScreen({
  message = 'Loading...',
  submessage,
  fullScreen = true,
}: LoadingScreenProps) {
  const reducedMotion = useReducedMotion()

  const containerClass = fullScreen
    ? 'fixed inset-0 z-[100] flex flex-col items-center justify-center'
    : 'flex flex-col items-center justify-center py-20'

  return (
    <div
      className={containerClass}
      style={{ background: fullScreen ? '#0a0a0a' : 'transparent' }}
    >
      {/* Logo + Spinner */}
      <div className="relative flex items-center justify-center mb-8">
        {/* Outer rotating ring */}
        <motion.div
          className="absolute w-20 h-20 rounded-full border-2 border-transparent"
          style={{
            borderTopColor: '#2563EB',
            borderRightColor: '#2563EB',
          }}
          animate={
            reducedMotion
              ? {}
              : { rotate: 360 }
          }
          transition={
            reducedMotion
              ? {}
              : { duration: 1.2, repeat: Infinity, ease: 'linear' }
          }
        />

        {/* Inner pulsing logo */}
        <motion.div
          className="relative flex items-center justify-center w-14 h-14 rounded-xl"
          style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}
          animate={
            reducedMotion
              ? {}
              : { scale: [1, 1.05, 1] }
          }
          transition={
            reducedMotion
              ? {}
              : { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
          }
        >
          <Zap size={24} style={{ color: '#2563EB' }} />
        </motion.div>
      </div>

      {/* App name */}
      <motion.div
        className="flex items-center gap-2 mb-2"
        animate={
          reducedMotion
            ? {}
            : { opacity: [0.6, 1, 0.6] }
        }
        transition={
          reducedMotion
            ? {}
            : { duration: 2, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        <span className="text-sm font-semibold tracking-tight" style={{ color: '#FFFFFF' }}>
          AdNexus AI
        </span>
      </motion.div>

      {/* Loading message */}
      {message && (
        <p className="text-[13px] font-medium" style={{ color: '#8A8F98' }}>
          {message}
        </p>
      )}

      {/* Sub-message */}
      {submessage && (
        <p className="text-[11px] mt-1" style={{ color: '#555B66' }}>
          {submessage}
        </p>
      )}

      {/* Progress dots */}
      <div className="flex items-center gap-1.5 mt-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#2563EB' }}
            animate={
              reducedMotion
                ? {}
                : { opacity: [0.2, 1, 0.2] }
            }
            transition={
              reducedMotion
                ? {}
                : {
                    duration: 1.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.2,
                  }
            }
          />
        ))}
      </div>
    </div>
  )
}
