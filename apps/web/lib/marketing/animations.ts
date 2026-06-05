/**
 * AdNexus AI — Marketing v2 Animation Tokens
 * ------------------------------------------
 * Shared Framer Motion configurations for scroll-driven, staggered,
 * and interactive animations across the marketing site.
 */

import type { Transition } from 'framer-motion';

/* ───────── Easing curves ───────── */
export const easeSmooth: [number, number, number, number] = [0.4, 0, 0.2, 1];
export const easeBounce: [number, number, number, number] = [0.34, 1.56, 0.64, 1];
export const easeExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const easeSpring = { type: 'spring' as const, stiffness: 150, damping: 15 };

/* ───────── Reusable transitions ───────── */
export const fadeTransition: Transition = {
  duration: 0.6,
  ease: easeSmooth,
};

export const slideTransition: Transition = {
  duration: 0.7,
  ease: easeExpo,
};

export const scaleTransition: Transition = {
  duration: 0.5,
  ease: easeBounce,
};

/* ───────── Direction presets ───────── */
const directionMap = {
  up: { y: 40, x: 0 },
  down: { y: -40, x: 0 },
  left: { y: 0, x: -40 },
  right: { y: 0, x: 40 },
};

export type Direction = keyof typeof directionMap;

export function getDirectionOffset(direction: Direction) {
  return directionMap[direction];
}

/* ───────── Variants (without transition key) ───────── */
export const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
};

export const fadeInLeft = {
  initial: { opacity: 0, x: -40 },
  animate: { opacity: 1, x: 0 },
};

export const fadeInRight = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
};

export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 30 },
  animate: {
    opacity: 1,
    y: 0,
    transition: fadeTransition,
  },
};

/* ───────── Scroll-triggered section variants ───────── */
export function scrollRevealVariants(direction: Direction = 'up') {
  return {
    initial: { opacity: 0, ...directionMap[direction] },
    animate: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: fadeTransition,
    },
  };
}

/* ───────── Glow pulse animation ───────── */
export const glowPulse = {
  animate: {
    boxShadow: [
      '0 0 20px rgba(195,245,59,0.1)',
      '0 0 40px rgba(195,245,59,0.2)',
      '0 0 20px rgba(195,245,59,0.1)',
    ],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const },
  },
};

/* ───────── Floating orb animation ───────── */
export const floatingOrb = {
  animate: {
    x: [0, 30, 0],
    y: [0, -20, 0],
    scale: [1, 1.1, 1],
    transition: { duration: 8, repeat: Infinity, ease: 'easeInOut' as const },
  },
};

/* ───────── Chat button pulse ───────── */
export const chatPulse = {
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(195,245,59,0.4)',
      '0 0 0 20px rgba(195,245,59,0)',
    ],
    transition: { duration: 2, repeat: Infinity, ease: 'easeOut' as const },
  },
};

/* ───────── Text reveal (word-by-word) ───────── */
export const textRevealContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const textRevealChild = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: easeSmooth },
  },
};

/* ───────── Reduced motion helper ───────── */
export function getReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ───────── Counter animation config ───────── */
export const counterConfig = {
  duration: 2,
  ease: easeSmooth,
};
