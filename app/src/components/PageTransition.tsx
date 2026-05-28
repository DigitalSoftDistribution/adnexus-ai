/**
 * PageTransition.tsx
 *
 * Wraps each page route with a Framer Motion AnimatePresence-compatible
 * exit/enter transition. Uses fade + subtle upward slide for a polished,
 * app-like feel during navigation.
 *
 * Exit:  fade out (opacity 1 -> 0, duration 0.18s)
 * Enter: fade in + slide up (opacity 0 -> 1, y: 24 -> 0, duration 0.35s)
 * Ease:  [0.25, 0.46, 0.45, 0.94] (smooth deceleration)
 */

import { motion, type Variants, type Transition } from 'framer-motion'
import type { ReactNode } from 'react'

export interface PageTransitionProps {
  children: ReactNode
  className?: string
}

const pageTransition: Transition = {
  duration: 0.35,
  ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
}

const exitTransition: Transition = {
  duration: 0.18,
  ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
}

const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 24,
    scale: 0.995,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: pageTransition,
  },
  exit: {
    opacity: 0,
    y: -12,
    scale: 0.998,
    transition: exitTransition,
  },
}

export default function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
      style={{ willChange: 'opacity, transform' }}
    >
      {children}
    </motion.div>
  )
}
