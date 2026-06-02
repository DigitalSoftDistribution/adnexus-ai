'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Clock, ArrowRight, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BLOG_CATEGORIES,
  BLOG_POSTS,
  CATEGORY_META,
  POSTS_PER_PAGE,
  type BlogCategory,
} from './_posts';

export function BlogList() {
  const [activeCategory, setActiveCategory] = useState<BlogCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredPosts = useMemo(() => {
    let result = BLOG_POSTS;
    if (activeCategory !== 'All') {
      result = result.filter((p) => p.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.author.toLowerCase().includes(q),
      );
    }
    return result;
  }, [activeCategory, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE,
  );

  const isDefaultView = currentPage === 1 && !searchQuery && activeCategory === 'All';
  const featuredPost = filteredPosts[0];
  const gridPosts = isDefaultView ? paginatedPosts.slice(1) : paginatedPosts;

  const handleCategoryChange = (cat: BlogCategory) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-[100dvh] bg-[#050505]">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-20 pb-12 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(195,245,59,0.08),transparent_60%)]" />
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-300">
            <BookOpen size={14} className="text-[#c3f53b]" aria-hidden="true" />
            AdNexus Blog
          </span>
          <h1 className="mb-5 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Insights for <span className="text-[#c3f53b]">Modern Agencies</span>
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-gray-400">
            Product updates, AI research, case studies, and tips for scaling ad operations.
          </p>

          {/* Search */}
          <div className="mx-auto max-w-md">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 transition-colors focus-within:border-[#c3f53b]/60">
              <Search size={18} className="text-gray-500" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search articles..."
                aria-label="Search articles"
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
              />
              {searchQuery && <span className="text-xs text-gray-500">{filteredPosts.length}</span>}
            </div>
          </div>
        </div>
      </section>

      {/* Category pills */}
      <section className="px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-2">
          {BLOG_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            const meta = CATEGORY_META[cat];
            const Icon = meta.icon;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryChange(cat)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'text-white'
                    : 'border border-white/10 text-gray-400 hover:text-white',
                )}
                style={isActive ? { background: meta.bg, color: meta.color } : undefined}
              >
                <Icon size={14} aria-hidden="true" />
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Featured */}
      {featuredPost && isDefaultView && (
        <section className="px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <article className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition-transform duration-300 hover:-translate-y-0.5">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <Link
                  href={`/blog/${featuredPost.slug}`}
                  className={cn(
                    'relative block h-64 bg-gradient-to-br lg:h-auto',
                    featuredPost.gradient,
                  )}
                >
                  <span className="flex h-full items-center justify-center">
                    <BookOpen
                      size={64}
                      className="opacity-20"
                      style={{ color: CATEGORY_META[featuredPost.category].color }}
                      aria-hidden="true"
                    />
                  </span>
                  <span
                    className="absolute left-4 top-4 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      background: CATEGORY_META[featuredPost.category].bg,
                      color: CATEGORY_META[featuredPost.category].color,
                    }}
                  >
                    Featured
                  </span>
                </Link>

                <div className="flex flex-col justify-center p-8 lg:p-10">
                  <span
                    className="mb-4 inline-flex self-start items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{
                      background: CATEGORY_META[featuredPost.category].bg,
                      color: CATEGORY_META[featuredPost.category].color,
                    }}
                  >
                    {featuredPost.category}
                  </span>
                  <Link href={`/blog/${featuredPost.slug}`} className="mb-3 block">
                    <h2 className="text-2xl font-bold leading-tight text-white transition-opacity group-hover:opacity-80 lg:text-3xl">
                      {featuredPost.title}
                    </h2>
                  </Link>
                  <p className="mb-6 text-sm leading-relaxed text-gray-400">{featuredPost.excerpt}</p>
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold"
                      style={{ color: CATEGORY_META[featuredPost.category].color }}
                    >
                      {featuredPost.initials}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-white">{featuredPost.author}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{featuredPost.role}</span>
                        <span>·</span>
                        <span>{featuredPost.date}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} aria-hidden="true" />
                          {featuredPost.readTime}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/blog/${featuredPost.slug}`}
                    className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#c3f53b] transition-opacity hover:opacity-70"
                  >
                    Read Article
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          </div>
        </section>
      )}

      {/* Grid */}
      <section className="px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {(activeCategory !== 'All' || searchQuery) && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white">
                {searchQuery ? `Search Results for "${searchQuery}"` : `${activeCategory} Articles`}
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                {filteredPosts.length} article{filteredPosts.length !== 1 ? 's' : ''} found
              </p>
            </div>
          )}
          {isDefaultView && (
            <h2 className="mb-8 text-xl font-semibold text-white">Recent Posts</h2>
          )}

          {filteredPosts.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] py-20 text-center">
              <Search size={40} className="mx-auto mb-4 text-gray-500" aria-hidden="true" />
              <p className="text-base text-gray-400">No articles match your search</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('All');
                }}
                className="mt-3 text-sm text-[#c3f53b] transition-opacity hover:opacity-70"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {gridPosts.map((post) => (
                <article
                  key={post.slug}
                  className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition-transform duration-300 hover:-translate-y-1"
                >
                  <Link href={`/blog/${post.slug}`} className="block">
                    <div
                      className={cn(
                        'relative flex h-44 items-center justify-center bg-gradient-to-br',
                        post.gradient,
                      )}
                    >
                      <BookOpen
                        size={36}
                        className="opacity-25"
                        style={{ color: CATEGORY_META[post.category].color }}
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-3">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{
                          background: CATEGORY_META[post.category].bg,
                          color: CATEGORY_META[post.category].color,
                        }}
                      >
                        {post.category}
                      </span>
                    </div>
                    <Link href={`/blog/${post.slug}`} className="mb-2 block">
                      <h3 className="text-base font-semibold leading-snug text-white transition-opacity group-hover:opacity-80">
                        {post.title}
                      </h3>
                    </Link>
                    <p className="mb-4 flex-1 text-sm leading-relaxed text-gray-400">{post.excerpt}</p>
                    <div className="flex items-center gap-3 border-t border-white/10 pt-3">
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold"
                        style={{ color: CATEGORY_META[post.category].color }}
                      >
                        {post.initials}
                      </span>
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-xs font-medium text-white">{post.author}</span>
                        <span className="shrink-0 text-xs text-gray-500">{post.date}</span>
                      </div>
                      <div className="ml-auto flex shrink-0 items-center gap-1">
                        <Clock size={12} className="text-gray-500" aria-hidden="true" />
                        <span className="text-xs text-gray-500">{post.readTime}</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Pagination */}
      {totalPages > 1 && (
        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-6xl items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm font-medium text-gray-400 transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft size={16} aria-hidden="true" />
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={cn(
                  'h-9 w-9 rounded-lg border border-white/10 text-sm font-medium transition-colors',
                  currentPage === page
                    ? 'bg-[#c3f53b] text-black'
                    : 'bg-white/[0.02] text-gray-400 hover:text-white',
                )}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm font-medium text-gray-400 transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Next
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
