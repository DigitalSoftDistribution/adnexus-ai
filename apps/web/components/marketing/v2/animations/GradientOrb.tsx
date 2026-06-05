'use client';

import { motion } from 'framer-motion';
import { floatingOrb } from '@/lib/marketing/animations';

interface GradientOrbProps {
  color?: string;
  size?: number;
  blur?: number;
  opacity?: number;
  className?: string;
  delay?: number;
}

export function GradientOrb({
  color = 'rgba(195,245,59,0.08)',
  size = 384,
  blur = 80,
  opacity = 1,
  className = '',
  delay = 0,
}: GradientOrbProps) {
  return (
    <motion.div
      className={`absolute rounded-full pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color}, transparent 70%)`,
        filter: `blur(${blur}px)`,
        opacity,
      }}
      animate={floatingOrb.animate}
      transition={{ ...floatingOrb.animate.transition, delay }}
    />
  );
}
