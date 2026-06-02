import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BLOG_POSTS,
  CATEGORY_META,
  getPostBySlug,
  getRelatedPosts,
} from '../_posts';
import { articleSchema, breadcrumbSchema, jsonLd } from '@/lib/structured-data';
import { MetaMcpArticle, ComingSoon } from './article-body';
import { ShareButtons, NewsletterCta } from './post-interactions';

const FULL_ARTICLE_SLUG = 'how-metas-free-mcp-server-changes-everything';

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPostBySlug(params.slug);
  if (!post) {
    return { title: 'Article Not Found' };
  }
  const canonical = `/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical },
    openGraph: {
      title: `${post.title} | AdNexus AI`,
      description: post.excerpt,
      url: canonical,
      type: 'article',
      authors: [post.author],
    },
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  if (!post) {
    notFound();
  }

  const meta = CATEGORY_META[post.category];
  const CategoryIcon = meta.icon;
  const relatedPosts = getRelatedPosts(post.slug, 3);
  const isFullArticle = post.slug === FULL_ARTICLE_SLUG;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(articleSchema(post)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'Blog', path: '/blog' },
              { name: post.title, path: `/blog/${post.slug}` },
            ]),
          ),
        }}
      />

      <div className="min-h-[100dvh] bg-[#050505]">
        {/* Back link */}
        <div className="mx-auto max-w-4xl px-4 pb-4 pt-20 sm:px-6 lg:px-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-gray-400 transition-opacity hover:opacity-70"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to Blog
          </Link>
        </div>

        {/* Header image */}
        <div className="mx-auto max-w-4xl px-4 pb-8 sm:px-6 lg:px-8">
          <div
            className={cn(
              'relative flex h-56 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br sm:h-80',
              post.gradient,
            )}
          >
            <BookOpen size={72} className="opacity-25" style={{ color: meta.color }} aria-hidden="true" />
          </div>
        </div>

        {/* Article header */}
        <div className="mx-auto max-w-3xl px-4 pb-8 sm:px-6 lg:px-8">
          <span
            className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: meta.bg, color: meta.color }}
          >
            <CategoryIcon size={12} aria-hidden="true" />
            {post.category}
          </span>
          <h1 className="mb-6 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold"
                style={{ color: meta.color }}
              >
                {post.initials}
              </span>
              <div>
                <p className="text-sm font-medium text-white">{post.author}</p>
                <p className="text-xs text-gray-500">{post.role}</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <Calendar size={14} aria-hidden="true" />
                {post.date}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock size={14} aria-hidden="true" />
                {post.readTime} read
              </span>
            </div>
          </div>
        </div>

        {/* Share */}
        <div className="mx-auto max-w-3xl px-4 pb-10 sm:px-6 lg:px-8">
          <ShareButtons title={post.title} />
        </div>

        {/* Body */}
        <div className="mx-auto max-w-3xl px-4 pb-20 sm:px-6 lg:px-8">
          {isFullArticle ? <MetaMcpArticle /> : <ComingSoon />}
        </div>

        {/* Newsletter */}
        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl">
            <NewsletterCta />
          </div>
        </section>

        {/* Related posts */}
        {relatedPosts.length > 0 && (
          <section className="px-4 pb-24 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <h2 className="mb-8 text-2xl font-semibold text-white">Related Posts</h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {relatedPosts.map((rp) => {
                  const rpMeta = CATEGORY_META[rp.category];
                  const RpIcon = rpMeta.icon;
                  return (
                    <article
                      key={rp.slug}
                      className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition-transform duration-300 hover:-translate-y-1"
                    >
                      <Link href={`/blog/${rp.slug}`} className="block">
                        <div
                          className={cn(
                            'relative flex h-36 items-center justify-center bg-gradient-to-br',
                            rp.gradient,
                          )}
                        >
                          <BookOpen
                            size={32}
                            className="opacity-25"
                            style={{ color: rpMeta.color }}
                            aria-hidden="true"
                          />
                        </div>
                      </Link>
                      <div className="flex flex-1 flex-col p-5">
                        <span
                          className="mb-2 inline-flex self-start items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                          style={{ background: rpMeta.bg, color: rpMeta.color }}
                        >
                          <RpIcon size={10} aria-hidden="true" />
                          {rp.category}
                        </span>
                        <Link href={`/blog/${rp.slug}`} className="mb-2 block flex-1">
                          <h3 className="text-sm font-semibold leading-snug text-white transition-opacity group-hover:opacity-80">
                            {rp.title}
                          </h3>
                        </Link>
                        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                          <span>{rp.date}</span>
                          <span>·</span>
                          <span>{rp.readTime}</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
