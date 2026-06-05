'use client';

import { motion, useInView, useSpring, useTransform } from 'framer-motion';
import { useRef, useEffect } from 'react';

interface CounterAnimationProps {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  /** Decimal places to display. Defaults to the precision of `value`. */
  decimals?: number;
  className?: string;
}

export function CounterAnimation({
  value,
  suffix = '',
  prefix = '',
  duration = 2,
  decimals,
  className = '',
}: CounterAnimationProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const springValue = useSpring(0, { duration: duration * 1000, bounce: 0 });

  // Preserve the value's own precision (e.g. 99.9 -> "99.9") unless an explicit
  // decimals count is given. Rounding to integers would misstate stats like a
  // 99.9% uptime SLA as 100%.
  const fractionDigits =
    decimals ?? (Number.isInteger(value) ? 0 : (value.toString().split('.')[1]?.length ?? 0));

  const displayValue = useTransform(springValue, (v) =>
    `${prefix}${v.toLocaleString(undefined, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })}${suffix}`
  );

  useEffect(() => {
    if (isInView) {
      springValue.set(value);
    }
  }, [isInView, value, springValue]);

  return (
    <span ref={ref} className={className}>
      <motion.span>{displayValue}</motion.span>
    </span>
  );
}
