'use client';

import { motion } from 'framer-motion';
import { Cable, Bot, MessageSquare, Terminal } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

const CLIENTS = [
  { name: 'Claude', icon: <Bot size={16} />, color: '#D4A574', status: 'Connected' },
  { name: 'ChatGPT', icon: <MessageSquare size={16} />, color: '#10A37F', status: 'Connected' },
  { name: 'Cursor', icon: <Terminal size={16} />, color: '#2563EB', status: 'Connected' },
];

export function MCPShowcase() {
  const { ref, isVisible } = useScrollAnimation(0.15);

  return (
    <div ref={ref} className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isVisible ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: easeSmooth }}
        className="card-surface p-6 sm:p-8"
      >
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(195,245,59,0.1)', color: '#c3f53b' }}>
            <Cable size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white mb-1">Model Context Protocol</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              AdNexus exposes a native MCP server. Ask Claude, ChatGPT, or Cursor to check campaign status,
              generate reports, or draft optimizations — all through natural language.
            </p>
          </div>
        </div>

        {/* Client badges */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {CLIENTS.map((client) => (
            <span
              key={client.name}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
            >
              <span style={{ color: client.color }}>{client.icon}</span>
              {client.name}
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#10B981' }} />
            </span>
          ))}
        </div>

        {/* Code snippet */}
        <div className="rounded-lg p-4 font-mono-data text-[11px] leading-relaxed overflow-x-auto" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-tertiary)' }}># Ask Claude about your campaigns</span><br />
          <span style={{ color: '#c3f53b' }}>$</span> claude mcp adnexus status --campaigns<br />
          <span style={{ color: 'var(--text-tertiary)' }}># ROAS: 4.2x | Spend: $24.8K | 3 drafts awaiting approval</span><br />
          <br />
          <span style={{ color: 'var(--text-tertiary)' }}># Ask ChatGPT to generate a report</span><br />
          <span style={{ color: '#c3f53b' }}>$</span> chatgpt mcp adnexus report --last-7-days<br />
          <span style={{ color: 'var(--text-tertiary)' }}># Generating cross-platform performance report...</span>
        </div>
      </motion.div>
    </div>
  );
}
