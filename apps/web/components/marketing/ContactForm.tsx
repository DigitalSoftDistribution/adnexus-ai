'use client';

import { useState, type FormEvent } from 'react';
import { Send, CheckCircle2, Loader2 } from 'lucide-react';

export function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'fallback' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [fallbackEmail, setFallbackEmail] = useState('hello@adnexus.ai');
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' });

  const submitting = status === 'submitting';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);

      // No delivery channel configured — direct the user to email instead of
      // claiming a delivery that did not happen.
      if (res.status === 503 || data?.delivered === false) {
        if (data?.fallbackEmail) setFallbackEmail(data.fallbackEmail);
        setStatus('fallback');
        return;
      }

      if (!res.ok) {
        const firstError =
          data?.error && typeof data.error === 'object'
            ? Object.values(data.error).flat()[0]
            : undefined;
        throw new Error((firstError as string) || 'Something went wrong. Please try again.');
      }
      setStatus('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  if (status === 'success') {
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

  if (status === 'fallback') {
    const subject = encodeURIComponent('AdNexus AI — contact');
    const bodyText = encodeURIComponent(
      `Name: ${form.name}\nCompany: ${form.company}\n\n${form.message}`,
    );
    return (
      <div className="card-surface p-8 text-center">
        <Send size={36} className="mx-auto mb-4" style={{ color: '#c3f53b' }} aria-hidden="true" />
        <h3 className="text-lg font-semibold text-white mb-2">One quick step</h3>
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
          Send your message directly and we&apos;ll reply within one business day.
        </p>
        <a
          href={`mailto:${fallbackEmail}?subject=${subject}&body=${bodyText}`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold"
          style={{ background: '#c3f53b', color: '#0a0a0a' }}
        >
          Email {fallbackEmail}
          <Send size={15} aria-hidden="true" />
        </a>
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
      {status === 'error' && (
        <p className="text-[13px]" role="alert" style={{ color: 'var(--status-error)' }}>
          {errorMsg}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-transform hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: '#c3f53b', color: '#0a0a0a' }}
      >
        {submitting ? (
          <>
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            Sending…
          </>
        ) : (
          <>
            Send message
            <Send size={15} aria-hidden="true" />
          </>
        )}
      </button>
    </form>
  );
}
