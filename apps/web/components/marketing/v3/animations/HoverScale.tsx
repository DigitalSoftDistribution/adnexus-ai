'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface HoverScaleProps {
  children: ReactNode;
  className?: string;
  scale?: number;
  y?: number;
}

export function HoverScale({
  children,
  className = '',
  scale = 1.02,
  y = -4,
}: HoverScaleProps) {
  return (
    <motion.div
      whileHover={{ scale, y }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
