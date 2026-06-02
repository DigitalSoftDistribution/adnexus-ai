'use client';

import { useState, type FormEvent } from 'react';
import { Twitter, Linkedin, Link as LinkIcon, Check, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const getShareUrl = () => (typeof window !== 'undefined' ? window.location.href : '');

  const handleCopyLink = () => {
    const url = getShareUrl();
    if (url) {
      navigator.clipboard.writeText(url).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openShare = (kind: 'twitter' | 'linkedin') => {
    const url = encodeURIComponent(getShareUrl());
    const href =
      kind === 'twitter'
        ? `https://twitter.com/intent/tweet?url=${url}&text=${encodeURIComponent(title)}`
        : `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  const btn =
    'inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-gray-400 transition-colors hover:text-white';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-2 text-xs font-medium uppercase tracking-wider text-gray-500">Share</span>
      <button type="button" onClick={() => openShare('twitter')} className={btn}>
        <Twitter size={14} aria-hidden="true" />
        Twitter
      </button>
      <button type="button" onClick={() => openShare('linkedin')} className={btn}>
        <Linkedin size={14} aria-hidden="true" />
        LinkedIn
      </button>
      <button
        type="button"
        onClick={handleCopyLink}
        className={cn(btn, copied && 'text-[#c3f53b]')}
      >
        {copied ? <Check size={14} aria-hidden="true" /> : <LinkIcon size={14} aria-hidden="true" />}
        {copied ? 'Copied' : 'Copy Link'}
      </button>
    </div>
  );
}

export function NewsletterCta() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(195,245,59,0.06),transparent_60%)]" />
      <div className="relative z-10">
        <Mail size={28} className="mx-auto mb-4 text-[#c3f53b]" aria-hidden="true" />
        <h3 className="mb-2 text-xl font-semibold text-white">Get AdNexus Updates</h3>
        <p className="mb-6 text-sm text-gray-400">
          New articles, product updates, and AI ad tech insights — delivered weekly.
        </p>
        {subscribed ? (
          <div className="flex items-center justify-center gap-2 py-3 text-sm font-medium text-[#c3f53b]">
            <Check size={16} aria-hidden="true" />
            You&apos;re subscribed!
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              aria-label="Email address"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-[#c3f53b]/60"
            />
            <button
              type="submit"
              className="rounded-lg bg-[#c3f53b] px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              Subscribe
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
