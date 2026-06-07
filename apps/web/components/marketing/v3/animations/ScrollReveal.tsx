'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { ReactNode, useRef } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  duration?: number;
  delay?: number;
}

export function ScrollReveal({
  children,
  className = '',
  direction = 'up',
  distance = 40,
  duration = 0.7,
  delay = 0,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'center center'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [0, 1]);
  const y = useTransform(
    scrollYProgress,
    [0, 0.5],
    direction === 'up' ? [distance, 0] : direction === 'down' ? [-distance, 0] : [0, 0]
  );
  const x = useTransform(
    scrollYProgress,
    [0, 0.5],
    direction === 'left' ? [distance, 0] : direction === 'right' ? [-distance, 0] : [0, 0]
  );

  return (
    <motion.div
      ref={ref}
      style={{ opacity, y, x }}
      transition={{ duration, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
