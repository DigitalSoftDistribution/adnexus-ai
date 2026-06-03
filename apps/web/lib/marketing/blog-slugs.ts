/**
 * Re-exported from the single blog source of truth (blog-posts.ts) so the
 * dynamic /blog/[slug] route keeps a stable import path.
 */
export { BLOG_SLUGS, isKnownBlogSlug } from '@/lib/marketing/blog-posts';
