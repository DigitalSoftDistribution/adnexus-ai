'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Search,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
  TrendingUp,
  Briefcase,
  Lightbulb,
} from 'lucide-react';
import { BLOG_POSTS } from '@/lib/marketing/blog-posts';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

/* ─── categories ─── */
const categories = ['All', 'Product', 'AI', 'Case Studies', 'Tips'] as const;
type Category = (typeof categories)[number];

const categoryMeta: Record<string, { icon: typeof BookOpen; color: string; bg: string }> = {
  All: { icon: BookOpen, color: '#FFFFFF', bg: 'rgba(255,255,255,0.08)' },
  Product: { icon: Sparkles, color: '#2563EB', bg: 'rgba(37,99,235,0.15)' },
  AI: { icon: TrendingUp, color: '#A78BFA', bg: 'rgba(139,92,246,0.15)' },
  'Case Studies': { icon: Briefcase, color: '#34D399', bg: 'rgba(16,185,129,0.15)' },
  Tips: { icon: Lightbulb, color: '#FBBF24', bg: 'rgba(245,158,11,0.15)' },
};

/* ─── posts data (single source of truth) ─── */
const posts = BLOG_POSTS;


const POSTS_PER_PAGE = 6;

/* ─── page component ─── */

export function BlogContent() {
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  /* filter posts */
  const filteredPosts = useMemo(() => {
    let result = posts;
    if (activeCategory !== 'All') {
      result = result.filter((p) => p.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.author.toLowerCase().includes(q)
      );
    }
    return result;
  }, [activeCategory, searchQuery]);

  /* pagination */
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  /* featured post = first filtered post */
  const featuredPost = filteredPosts[0];
  const gridPosts =
    currentPage === 1 && !searchQuery && activeCategory === 'All'
      ? paginatedPosts.slice(1)
      : paginatedPosts;

  /* reset page on filter change */
  const handleCategoryChange = (cat: Category) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  };

  return (
    <>
    <div className="min-h-[100dvh]" style={{ background: 'var(--bg-primary)' }}>
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-6 pt-20 pb-12">
        <div className="absolute inset-0 opacity-25">
          <div
            className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full blur-[150px]"
            style={{ background: 'var(--accent-glow)' }}
          />
          <div
            className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-[120px]"
            style={{ background: 'rgba(139,92,246,0.08)' }}
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeSmooth }}
          >
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase mb-6"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <BookOpen size={14} style={{ color: 'var(--accent)' }} />
              AdNexus Blog
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: easeSmooth }}
            className="font-space text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-5"
          >
            <span style={{ color: 'var(--text-primary)' }}>Insights for </span>
            <span className="text-gradient-blue">Modern Agencies</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: easeSmooth }}
            className="font-inter text-lg max-w-xl mx-auto mb-10"
            style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}
          >
            Product updates, AI research, case studies, and tips for scaling ad operations.
          </motion.p>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3, ease: easeSmooth }}
            className="max-w-md mx-auto"
          >
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 focus-within:border-[var(--accent)]"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Search size={18} style={{ color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search articles..."
                className="flex-1 bg-transparent outline-none font-inter text-sm"
                style={{ color: 'var(--text-primary)' }}
              />
              {searchQuery && (
                <span
                  className="font-inter text-xs"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {filteredPosts.length}
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Category Pills ─── */}
      <section className="px-6 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35, ease: easeSmooth }}
          className="max-w-5xl mx-auto flex flex-wrap justify-center gap-2"
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            const meta = categoryMeta[cat];
            const Icon = meta.icon;
            return (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-inter text-sm font-medium transition-all duration-200"
                style={{
                  background: isActive ? meta.bg : 'transparent',
                  color: isActive ? meta.color : 'var(--text-secondary)',
                  border: `1px solid ${isActive ? meta.bg : 'var(--border-subtle)'}`,
                }}
              >
                <Icon size={14} />
                {cat}
              </button>
            );
          })}
        </motion.div>
      </section>

      {/* ─── Featured Post ─── */}
      <AnimatePresence mode="wait">
        {featuredPost &&
          currentPage === 1 &&
          !searchQuery &&
          activeCategory === 'All' && (
            <section className="px-6 pb-12" key="featured">
              <div className="max-w-6xl mx-auto">
                <motion.article
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, ease: easeSmooth }}
                  className="group relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-0.5"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2">
                    {/* Thumbnail */}
                    <Link href={`/blog/${featuredPost.slug}`} className="relative block h-64 lg:h-auto">
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${featuredPost.gradient} flex items-center justify-center`}
                      >
                        <div
                          className="absolute inset-0"
                          style={{
                            background:
                              'radial-gradient(ellipse at top left, rgba(255,255,255,0.05) 0%, transparent 60%)',
                          }}
                        />
                        <BookOpen
                          size={64}
                          className="relative z-10 opacity-20"
                          style={{ color: categoryMeta[featuredPost.category]?.color || '#fff' }}
                        />
                      </div>
                      <div
                        className="absolute top-4 left-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          background: categoryMeta[featuredPost.category]?.bg,
                          color: categoryMeta[featuredPost.category]?.color,
                          border: `1px solid ${categoryMeta[featuredPost.category]?.bg}`,
                        }}
                      >
                        Featured
                      </div>
                    </Link>

                    {/* Content */}
                    <div className="flex flex-col justify-center p-8 lg:p-10">
                      <span
                        className="inline-flex self-start items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mb-4"
                        style={{
                          background: categoryMeta[featuredPost.category]?.bg,
                          color: categoryMeta[featuredPost.category]?.color,
                        }}
                      >
                        {featuredPost.category}
                      </span>

                      <Link href={`/blog/${featuredPost.slug}`} className="block mb-3">
                        <h2
                          className="font-space text-2xl lg:text-3xl font-bold leading-tight group-hover:opacity-80 transition-opacity"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {featuredPost.title}
                        </h2>
                      </Link>

                      <p
                        className="font-inter text-sm leading-relaxed mb-6 line-clamp-3"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {featuredPost.excerpt}
                      </p>

                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center font-space text-xs font-semibold"
                          style={{
                            background: 'var(--bg-hover)',
                            color: categoryMeta[featuredPost.category]?.color,
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {featuredPost.initials}
                        </div>
                        <div>
                          <p
                            className="font-inter text-sm font-medium"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {featuredPost.author}
                          </p>
                          <div
                            className="flex items-center gap-2 font-inter text-xs"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            <span>{featuredPost.role}</span>
                            <span>·</span>
                            <span>{featuredPost.date}</span>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock size={11} />
                              {featuredPost.readTime}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Link
                        href={`/blog/${featuredPost.slug}`}
                        className="inline-flex items-center gap-2 mt-6 font-inter text-sm font-medium transition-opacity hover:opacity-70"
                        style={{ color: 'var(--accent)' }}
                      >
                        Read Article
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </motion.article>
              </div>
            </section>
          )}
      </AnimatePresence>

      {/* ─── Recent Posts Grid ─── */}
      <section className="px-6 pb-12">
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeCategory}-${searchQuery}-${currentPage}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: easeSmooth }}
            >
              {/* Section header */}
              {(activeCategory !== 'All' || searchQuery) && (
                <div className="mb-8">
                  <h2
                    className="font-space text-xl font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {searchQuery
                      ? `Search Results for "${searchQuery}"`
                      : `${activeCategory} Articles`}
                  </h2>
                  <p className="font-inter text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {filteredPosts.length} article{filteredPosts.length !== 1 ? 's' : ''} found
                  </p>
                </div>
              )}
              {activeCategory === 'All' && !searchQuery && (
                <h2
                  className="font-space text-xl font-semibold mb-8"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Recent Posts
                </h2>
              )}

              {filteredPosts.length === 0 ? (
                <div
                  className="text-center py-20 rounded-xl"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <Search size={40} className="mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
                  <p className="font-inter text-base" style={{ color: 'var(--text-secondary)' }}>
                    No articles match your search
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActiveCategory('All');
                    }}
                    className="font-inter text-sm mt-3 transition-opacity hover:opacity-70"
                    style={{ color: 'var(--accent)' }}
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {gridPosts.map((post, i) => (
                    <motion.article
                      key={post.slug}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.4, ease: easeSmooth }}
                      className="group flex flex-col overflow-hidden rounded-xl transition-all duration-300 hover:-translate-y-1"
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {/* Thumbnail */}
                      <Link href={`/blog/${post.slug}`} className="block">
                        <div
                          className={`relative h-44 bg-gradient-to-br ${post.gradient} flex items-center justify-center overflow-hidden`}
                        >
                          <div
                            className="absolute inset-0"
                            style={{
                              background:
                                'radial-gradient(ellipse at top, rgba(255,255,255,0.05) 0%, transparent 70%)',
                            }}
                          />
                          <BookOpen
                            size={36}
                            className="relative z-10 opacity-25"
                            style={{ color: categoryMeta[post.category]?.color || '#fff' }}
                          />
                        </div>
                      </Link>

                      {/* Content */}
                      <div className="flex flex-col flex-1 p-5">
                        {/* Category badge */}
                        <div className="mb-3">
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              background: categoryMeta[post.category]?.bg,
                              color: categoryMeta[post.category]?.color,
                            }}
                          >
                            {post.category}
                          </span>
                        </div>

                        {/* Title */}
                        <Link href={`/blog/${post.slug}`} className="block mb-2">
                          <h3
                            className="font-space text-base font-semibold leading-snug group-hover:opacity-80 transition-opacity"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {post.title}
                          </h3>
                        </Link>

                        {/* Excerpt */}
                        <p
                          className="font-inter text-sm leading-relaxed mb-4 flex-1 line-clamp-2"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {post.excerpt}
                        </p>

                        {/* Meta */}
                        <div
                          className="flex items-center gap-3 pt-3"
                          style={{ borderTop: '1px solid var(--border-subtle)' }}
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center font-space text-xs font-semibold"
                            style={{
                              background: 'var(--bg-hover)',
                              color: categoryMeta[post.category]?.color,
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            {post.initials}
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="font-inter text-xs font-medium truncate"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {post.author}
                            </span>
                            <span
                              className="font-inter text-xs shrink-0"
                              style={{ color: 'var(--text-tertiary)' }}
                            >
                              {post.date}
                            </span>
                          </div>
                          <div className="ml-auto flex items-center gap-1 shrink-0">
                            <Clock size={12} style={{ color: 'var(--text-tertiary)' }} />
                            <span
                              className="font-inter text-xs"
                              style={{ color: 'var(--text-tertiary)' }}
                            >
                              {post.readTime}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ─── Pagination ─── */}
      {totalPages > 1 && (
        <section className="px-6 pb-24">
          <div className="max-w-6xl mx-auto flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg font-inter text-sm font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <ChevronLeft size={16} />
              Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className="w-9 h-9 rounded-lg font-inter text-sm font-medium transition-all duration-150"
                style={{
                  background: currentPage === page ? 'var(--accent)' : 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: currentPage === page ? '#0a0a0a' : 'var(--text-secondary)',
                }}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg font-inter text-sm font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </section>
      )}

      {/* ─── Utility Styles ─── */}
      <style>{`
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
        .text-gradient-blue {
          background: linear-gradient(135deg, #2563EB 0%, #60A5FA 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>
    </div>
    </>
  );
}
