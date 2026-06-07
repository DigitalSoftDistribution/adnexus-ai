'use client';

import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

const TEAM = [
  { name: 'Founder & CEO', role: 'Product, Strategy', color: '#c3f53b' },
  { name: 'Head of Engineering', role: 'Platform, AI Agent', color: '#2563EB' },
  { name: 'Lead Designer', role: 'UX, Marketing', color: '#A78BFA' },
  { name: 'Senior Engineer', role: 'Integrations, MCP', color: '#34D399' },
  { name: 'Growth Lead', role: 'Marketing, Sales', color: '#F59E0B' },
  { name: 'Customer Success', role: 'Onboarding, Support', color: '#EF4444' },
];

export function TeamGrid() {
  const { ref, isVisible } = useScrollAnimation(0.15);

  return (
    <div ref={ref} className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
      {TEAM.map((member, i) => (
        <motion.div
          key={member.name}
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: i * 0.06, ease: easeSmooth }}
          className="card-surface p-5 text-center"
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: `${member.color}15`, border: `1px solid ${member.color}30` }}>
            <User size={20} style={{ color: member.color }} />
          </div>
          <h3 className="text-sm font-semibold text-white mb-0.5">{member.name}</h3>
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{member.role}</p>
        </motion.div>
      ))}
    </div>
  );
}
