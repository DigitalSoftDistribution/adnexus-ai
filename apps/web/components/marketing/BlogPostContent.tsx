'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Twitter,
  Linkedin,
  Link as LinkIcon,
  Check,
  Clock,
  Calendar,
  ArrowLeft,
  Cpu,
  Mail,
  BookOpen,
  Sparkles,
  TrendingUp,
  Briefcase,
  Lightbulb,
} from 'lucide-react';
import { BLOG_POSTS } from '@/lib/marketing/blog-posts';
import { getArticleBody } from '@/components/marketing/blog-articles';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

/* ─── category meta ─── */
const categoryMeta: Record<string, { icon: typeof BookOpen; color: string; bg: string }> = {
  Product: { icon: Sparkles, color: '#2563EB', bg: 'rgba(37,99,235,0.15)' },
  AI: { icon: TrendingUp, color: '#A78BFA', bg: 'rgba(139,92,246,0.15)' },
  'Case Studies': { icon: Briefcase, color: '#34D399', bg: 'rgba(16,185,129,0.15)' },
  Tips: { icon: Lightbulb, color: '#FBBF24', bg: 'rgba(245,158,11,0.15)' },
};

const allPosts = BLOG_POSTS;


/* ─── article content ─── */

function ComingSoon() {
  return (
    <div className="text-center py-16">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <Cpu size={28} style={{ color: 'var(--accent)' }} />
      </div>
      <h2
        className="font-space text-2xl font-semibold mb-3"
        style={{ color: 'var(--text-primary)' }}
      >
        Article Coming Soon
      </h2>
      <p
        className="font-inter text-base max-w-md mx-auto"
        style={{ color: 'var(--text-secondary)' }}
      >
        We&apos;re putting the finishing touches on this article. Check back soon or subscribe to our newsletter to get notified.
      </p>
    </div>
  );
}

/* ─── page component ─── */

export function BlogPostContent({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const post = allPosts.find((p) => p.slug === slug);
  const articleBody = getArticleBody(slug);

  /* Related posts — pick 3 different posts, prioritizing same category */
  const relatedPosts = useMemo(() => {
    if (!post) return [];
    const sameCategory = allPosts.filter(
      (p) => p.category === post.category && p.slug !== slug
    );
    const others = allPosts.filter(
      (p) => p.category !== post.category && p.slug !== slug
    );
    return [...sameCategory, ...others].slice(0, 3);
  }, [slug, post]);

  if (!post) {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center"
        style={{ background: 'var(--bg-primary)' }}
      >
        <div className="text-center">
          <h2
            className="font-space text-2xl font-semibold mb-4"
            style={{ color: 'var(--text-primary)' }}
          >
            Article Not Found
          </h2>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 font-inter text-sm"
            style={{ color: 'var(--accent)' }}
          >
            <ArrowLeft size={16} />
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  const meta = categoryMeta[post.category] || {
    icon: BookOpen,
    color: '#8A8F98',
    bg: 'rgba(138,143,152,0.15)',
  };
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <>
    <div className="min-h-[100dvh]" style={{ background: 'var(--bg-primary)' }}>
      {/* ─── Back link ─── */}
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 font-inter text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={16} />
            Back to Blog
          </Link>
        </motion.div>
      </div>

      {/* ─── Header Image ─── */}
      <div className="max-w-4xl mx-auto px-6 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeSmooth }}
          className={`relative h-56 sm:h-80 rounded-2xl bg-gradient-to-br ${post.gradient} flex items-center justify-center overflow-hidden`}
          style={{ border: '1px solid var(--border-subtle)' }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at top, rgba(255,255,255,0.05) 0%, transparent 70%)',
            }}
          />
          <BookOpen size={72} className="relative z-10 opacity-25" style={{ color: meta.color }} />
        </motion.div>
      </div>

      {/* ─── Article Header ─── */}
      <div className="max-w-3xl mx-auto px-6 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: easeSmooth }}
        >
          {/* Category */}
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-5"
            style={{ background: meta.bg, color: meta.color }}
          >
            <meta.icon size={12} />
            {post.category}
          </span>

          {/* Title */}
          <h1
            className="font-space text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight mb-6"
            style={{ color: 'var(--text-primary)', lineHeight: 1.15 }}
          >
            {post.title}
          </h1>

          {/* Author + Meta */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center font-space text-sm font-semibold"
                style={{
                  background: 'var(--bg-hover)',
                  color: meta.color,
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {post.initials}
              </div>
              <div>
                <p
                  className="font-inter text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {post.author}
                </p>
                <p className="font-inter text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {post.role}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 ml-auto">
              <span
                className="flex items-center gap-1.5 font-inter text-xs"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <Calendar size={14} />
                {post.date}
              </span>
              <span
                className="flex items-center gap-1.5 font-inter text-xs"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <Clock size={14} />
                {post.readTime} read
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ─── Share Buttons ─── */}
      <div className="max-w-3xl mx-auto px-6 pb-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex flex-wrap items-center gap-2"
        >
          <span
            className="font-inter text-xs font-medium uppercase tracking-wider mr-2"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Share
          </span>
          <button
            onClick={() => {
              window.open(
                `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post.title)}`,
                '_blank'
              );
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-inter text-xs transition-all duration-150 hover:scale-[1.02]"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <Twitter size={14} />
            Twitter
          </button>
          <button
            onClick={() => {
              window.open(
                `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
                '_blank'
              );
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-inter text-xs transition-all duration-150 hover:scale-[1.02]"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <Linkedin size={14} />
            LinkedIn
          </button>
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-inter text-xs transition-all duration-150 hover:scale-[1.02]"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: copied ? 'var(--status-active)' : 'var(--text-secondary)',
            }}
          >
            {copied ? <Check size={14} /> : <LinkIcon size={14} />}
            {copied ? 'Copied' : 'Copy Link'}
          </button>
        </motion.div>
      </div>

      {/* ─── Article Body ─── */}
      <div className="max-w-3xl mx-auto px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: easeSmooth }}
        >
          {articleBody ?? <ComingSoon />}
        </motion.div>
      </div>

      {/* ─── Newsletter CTA ─── */}
      <section className="px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5, ease: easeSmooth }}
          className="max-w-xl mx-auto"
        >
          <div
            className="relative overflow-hidden rounded-xl p-8 text-center"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse at top, rgba(37,99,235,0.06) 0%, transparent 60%)',
              }}
            />
            <div className="relative z-10">
              <Mail size={28} className="mx-auto mb-4" style={{ color: 'var(--accent)' }} />
              <h3
                className="font-space text-xl font-semibold mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                Get AdNexus Updates
              </h3>
              <p
                className="font-inter text-sm mb-6"
                style={{ color: 'var(--text-secondary)' }}
              >
                New articles, product updates, and AI ad tech insights — delivered weekly.
              </p>
              {subscribed ? (
                <div
                  className="flex items-center justify-center gap-2 py-3 rounded-lg font-inter text-sm font-medium"
                  style={{ color: 'var(--status-active)' }}
                >
                  <Check size={16} />
                  You&apos;re subscribed!
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="flex-1 px-4 py-2.5 rounded-lg font-inter text-sm outline-none transition-colors"
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-lg font-inter text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
                    style={{
                      background: 'var(--accent)',
                      color: '#0a0a0a',
                    }}
                  >
                    Subscribe
                  </button>
                </form>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── Related Posts ─── */}
      {relatedPosts.length > 0 && (
        <section className="px-6 pb-24">
          <div className="max-w-6xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, ease: easeSmooth }}
              className="font-space text-2xl font-semibold mb-8"
              style={{ color: 'var(--text-primary)' }}
            >
              Related Posts
            </motion.h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((rp, i) => {
                const rpMeta = categoryMeta[rp.category] || {
                  icon: BookOpen,
                  color: '#8A8F98',
                  bg: 'rgba(138,143,152,0.15)',
                };
                return (
                  <motion.article
                    key={rp.slug}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.4, ease: easeSmooth }}
                    className="group flex flex-col overflow-hidden rounded-xl transition-all duration-300 hover:-translate-y-1"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <Link href={`/blog/${rp.slug}`} className="block">
                      <div
                        className={`relative h-36 bg-gradient-to-br ${rp.gradient} flex items-center justify-center`}
                      >
                        <BookOpen
                          size={32}
                          className="opacity-25"
                          style={{ color: rpMeta.color }}
                        />
                      </div>
                    </Link>
                    <div className="p-5 flex flex-col flex-1">
                      <span
                        className="inline-flex self-start items-center px-2 py-0.5 rounded-full text-xs font-semibold mb-2"
                        style={{ background: rpMeta.bg, color: rpMeta.color }}
                      >
                        <rpMeta.icon size={10} className="mr-1" />
                        {rp.category}
                      </span>
                      <Link href={`/blog/${rp.slug}`} className="block mb-2 flex-1">
                        <h3
                          className="font-space text-sm font-semibold leading-snug group-hover:opacity-80 transition-opacity"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {rp.title}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="font-inter text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {rp.date}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>·</span>
                        <span className="font-inter text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {rp.readTime}
                        </span>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── Custom Prose Styles ─── */}
      <style>{`
        .prose-custom { }
        .prose-custom .lead {
          font-size: 18px;
          line-height: 1.75;
          color: var(--text-secondary);
          margin-bottom: 28px;
        }
        .prose-custom p {
          font-family: 'Inter', sans-serif;
          font-size: 15.5px;
          line-height: 1.8;
          color: var(--text-secondary);
          margin-bottom: 20px;
        }
        .prose-custom h2 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 26px;
          font-weight: 600;
          color: var(--text-primary);
          margin-top: 48px;
          margin-bottom: 18px;
          letter-spacing: -0.02em;
          line-height: 1.25;
        }
        .prose-custom ul {
          margin-bottom: 24px;
          padding-left: 20px;
        }
        .prose-custom ul li {
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          line-height: 1.8;
          color: var(--text-secondary);
          margin-bottom: 10px;
          list-style-type: disc;
        }
        .prose-custom ul li strong {
          color: var(--text-primary);
          font-weight: 600;
        }
        .prose-custom code {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          background: var(--bg-secondary);
          padding: 2px 8px;
          border-radius: 6px;
          color: var(--text-primary);
          border: 1px solid var(--border-subtle);
        }
        .prose-custom blockquote {
          margin: 36px 0;
          padding: 24px 28px;
          border-left: 3px solid var(--accent);
          border-radius: 0 12px 12px 0;
          background: var(--bg-elevated);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 18px;
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1.6;
          font-style: italic;
        }
        .prose-custom blockquote::before {
          content: '"';
          font-size: 48px;
          line-height: 0;
          color: var(--accent);
          opacity: 0.3;
          display: block;
          margin-bottom: 12px;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
    </>
  );
}
