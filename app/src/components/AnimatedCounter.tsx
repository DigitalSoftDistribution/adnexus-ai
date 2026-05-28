/**
 * AnimatedCounter.tsx
 *
 * Animated number counter for KPIs and metrics.
 * Animates from 0 to the target value on mount with easeOut easing.
 *
 * Formats:
 *   - currency  : $12,345
 *   - number    : 1,234
 *   - percentage: 3.2x
 *   - compact   : 1.2K, 3.4M
 */

import { useEffect, useState, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'

export type CounterFormat = 'currency' | 'number' | 'percentage' | 'compact'

export interface AnimatedCounterProps {
  value: number
  format?: CounterFormat
  prefix?: string
  suffix?: string
  decimals?: number
  duration?: number
  className?: string
  style?: React.CSSProperties
}

function formatValue(
  value: number,
  format: CounterFormat,
  prefix?: string,
  suffix?: string,
  decimals = 0
): string {
  const p = prefix ?? (format === 'currency' ? '$' : '')
  const s = suffix ?? (format === 'percentage' ? 'x' : '')

  if (format === 'compact') {
    const absVal = Math.abs(value)
    if (absVal >= 1_000_000) return `${p}${(value / 1_000_000).toFixed(decimals)}M${s}`
    if (absVal >= 1_000) return `${p}${(value / 1_000).toFixed(decimals)}K${s}`
    return `${p}${value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${s}`
  }

  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return `${p}${formatted}${s}`
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export default function AnimatedCounter({
  value,
  format = 'number',
  prefix,
  suffix,
  decimals = 0,
  duration = 1.5,
  className,
  style,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const reducedMotion = useReducedMotion()
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    // If reduced motion is preferred, jump to final value
    if (reducedMotion) {
      setDisplayValue(value)
      return
    }

    const startValue = 0
    startTimeRef.current = null

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp
      }

      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / (duration * 1000), 1)
      const easedProgress = easeOutCubic(progress)
      const currentValue = startValue + (value - startValue) * easedProgress

      setDisplayValue(currentValue)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [value, duration, reducedMotion])

  return (
    <span className={className} style={style}>
      {formatValue(displayValue, format, prefix, suffix, decimals)}
    </span>
  )
}
