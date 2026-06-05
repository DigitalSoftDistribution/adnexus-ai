'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { CounterAnimation } from './animations';
import { staggerContainer, staggerItem } from '@/lib/marketing/animations';

const STATS = [
  { value: 4, suffix: '', label: 'Ad Platforms', prefix: '' },
  { value: 99.9, suffix: '%', label: 'Uptime SLA', prefix: '' },
  { value: 24, suffix: '/7', label: 'AI Monitoring', prefix: '' },
  { value: 2, suffix: 'min', label: 'Setup Time', prefix: '<' },
];

export function SocialProofSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      ref={ref}
      className="w-full py-16 px-6"
      style={{
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate={isInView ? 'animate' : 'initial'}
          className="grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {STATS.map((stat) => (
            <motion.div
              key={stat.label}
              variants={staggerItem}
              className="text-center"
            >
              <div className="font-mono-data text-3xl md:text-4xl font-bold text-white mb-2">
                {stat.prefix}
                <CounterAnimation
                  value={stat.value}
                  suffix={stat.suffix}
                  duration={2}
                />
              </div>
              <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
