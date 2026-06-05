'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
}

export function GlowCard({ children, className = '', glowColor = 'rgba(99, 102, 241, 0.15)' }: GlowCardProps) {
  return (
    <motion.div
      className={`card-surface ${className}`}
      whileHover={{
        y: -3,
        boxShadow: `0 12px 32px rgba(0, 0, 0, 0.4), 0 0 30px ${glowColor}`,
        borderColor: 'rgba(99, 102, 241, 0.3)',
      }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
