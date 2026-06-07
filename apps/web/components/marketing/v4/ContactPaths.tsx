'use client';

import { motion } from 'framer-motion';
import { Link } from '@/i18n/navigation';
import { Calendar, MessageSquare, Handshake, ArrowRight, Clock } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

const PATHS = [
  {
    icon: <Calendar size={22} style={{ color: '#c3f53b' }} />,
    title: 'Book a demo',
    desc: 'See the product in action with a 15-minute walkthrough.',
    cta: 'Schedule now',
    href: '/book-demo',
    response: 'Within 1 business day',
    color: '#c3f53b',
  },
  {
    icon: <MessageSquare size={22} style={{ color: '#2563EB' }} />,
    title: 'Get support',
    desc: 'Questions about your account, billing, or technical issues.',
    cta: 'Contact support',
    href: '/contact#contact-form',
    response: 'Within 4 hours',
    color: '#2563EB',
  },
  {
    icon: <Handshake size={22} style={{ color: '#A78BFA' }} />,
    title: 'Partnerships',
    desc: 'Agency partnerships, integrations, or press inquiries.',
    cta: 'Get in touch',
    href: '/contact#contact-form',
    response: 'Within 1 business day',
    color: '#A78BFA',
  },
];

export function ContactPaths() {
  const { ref, isVisible } = useScrollAnimation(0.15);

  return (
    <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
      {PATHS.map((path, i) => (
        <motion.div
          key={path.title}
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: i * 0.1, ease: easeSmooth }}
          className="card-surface p-6 flex flex-col"
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: `${path.color}15`, border: `1px solid ${path.color}30` }}>
            {path.icon}
          </div>
          <h3 className="text-base font-semibold text-white mb-2">{path.title}</h3>
          <p className="text-[13px] leading-relaxed mb-4 flex-1" style={{ color: 'var(--text-secondary)' }}>{path.desc}</p>
          <div className="flex items-center gap-1.5 mb-4">
            <Clock size={12} style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{path.response}</span>
          </div>
          <Link
            href={path.href}
            className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-white"
            style={{ color: path.color }}
          >
            {path.cta}
            <ArrowRight size={14} />
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
