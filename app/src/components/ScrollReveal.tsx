/**
 * ScrollReveal.tsx
 *
 * Scroll-triggered reveal wrapper for page sections.
 *
 * When element enters viewport (20% visibility threshold):
 *   - fades in (opacity 0 -> 1)
 *   - slides up (translateY 30px -> 0)
 *   - duration: 0.5s
 *   - stagger children: 0.1s delay between each
 *
 * Respects prefers-reduced-motion.
 */

import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef, type ReactNode } from 'react'

export interface ScrollRevealProps {
  children: ReactNode
  className?: string
  staggerChildren?: number
  duration?: number
  y?: number
  threshold?: number
  once?: boolean
  delay?: number
}

const containerVariants = {
  hidden: {},
  visible: (staggerChildren: number) => ({
    transition: {
      staggerChildren,
    },
  }),
}

const itemVariants = {
  hidden: (y: number) => ({
    opacity: 0,
    y,
  }),
  visible: (duration: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  }),
}

export default function ScrollReveal({
  children,
  className,
  staggerChildren = 0.1,
  duration = 0.5,
  y = 30,
  threshold = 0.2,
  once = true,
  delay = 0,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once, amount: threshold })
  const reducedMotion = useReducedMotion()

  // If reduced motion is preferred, render without animation
  if (reducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      custom={staggerChildren}
      className={className}
      style={{ willChange: 'opacity, transform' }}
      transition={{ delayChildren: delay }}
    >
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              custom={y}
              style={{ willChange: 'opacity, transform' }}
            >
              {child}
            </motion.div>
          ))
        : (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            custom={y}
            style={{ willChange: 'opacity, transform' }}
            transition={{ duration, delay }}
          >
            {children}
          </motion.div>
        )}
    </motion.div>
  )
}

/* ──────────────────────────────────────────────
   ScrollRevealItem — single child item
   (use inside ScrollReveal for staggered children)
   ────────────────────────────────────────────── */
export interface ScrollRevealItemProps {
  children: ReactNode
  className?: string
  duration?: number
  y?: number
}

export function ScrollRevealItem({
  children,
  className,
  duration = 0.5,
  y = 30,
}: ScrollRevealItemProps) {
  const reducedMotion = useReducedMotion()

  if (reducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      variants={itemVariants}
      custom={y}
      style={{ willChange: 'opacity, transform' }}
      transition={{ duration }}
    >
      {children}
    </motion.div>
  )
}
