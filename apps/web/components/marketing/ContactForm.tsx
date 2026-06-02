'use client';

import { useState, type FormEvent } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // No backend endpoint wired yet — acknowledge locally and let the user know.
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="card-surface p-8 text-center">
        <CheckCircle2 size={40} className="mx-auto mb-4" style={{ color: '#c3f53b' }} aria-hidden="true" />
        <h3 className="text-lg font-semibold text-white mb-2">Thanks — we&apos;ll be in touch</h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Our team responds within one business day. You can also email{' '}
          <a href="mailto:hello@adnexus.ai" className="underline" style={{ color: '#c3f53b' }}>
            hello@adnexus.ai
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-surface p-6 sm:p-8 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Name</span>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Work email</span>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
          />
        </label>
      </div>
      <label className="block">
        <span className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Company</span>
        <input
          type="text"
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
          className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>How can we help?</span>
        <textarea
          required
          rows={4}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none resize-none"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
        />
      </label>
      <button
        type="submit"
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-transform hover:scale-[1.01]"
        style={{ background: '#c3f53b', color: '#0a0a0a' }}
      >
        Send message
        <Send size={15} aria-hidden="true" />
      </button>
    </form>
  );
}
