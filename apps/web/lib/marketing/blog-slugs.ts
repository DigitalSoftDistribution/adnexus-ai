/**
 * Canonical list of published blog post slugs.
 * Kept in sync with the post data in BlogContent / BlogPostContent.
 * Used by the dynamic /blog/[slug] route to 404 unknown slugs and to
 * pre-render the known set.
 */
export const BLOG_SLUGS = [
  'how-metas-free-mcp-server-changes-everything',
  'building-a-draft-first-ad-agent',
  'google-ads-api-standard-access-guide',
  'why-120-mcp-tools-is-a-problem',
  'tiktok-creative-fatigue-detection',
  'morning-brief-proactive-ai-saves-5hrs',
  'cross-platform-attribution-guide',
  'solo-agency-playbook-50-clients',
  'from-pipeboard-to-adnexus-migration-story',
] as const;

export function isKnownBlogSlug(slug: string): boolean {
  return (BLOG_SLUGS as readonly string[]).includes(slug);
}
