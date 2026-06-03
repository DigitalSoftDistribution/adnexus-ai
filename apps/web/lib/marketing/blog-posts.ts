/**
 * Single source of truth for blog post metadata.
 * Consumed by BlogContent (index), BlogPostContent (article), and the
 * /blog/[slug] route (generateStaticParams + 404 guard).
 *
 * Pre-launch honesty: a single "AdNexus Team" byline (no invented author
 * personas) and excerpts free of fabricated customer metrics.
 */

export type BlogCategory = 'AI' | 'Product' | 'Tips' | 'Case Studies';

export interface BlogPostMeta {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  date: string;
  readTime: string;
  author: string;
  initials: string;
  role: string;
  gradient: string;
}

export const BLOG_POSTS: BlogPostMeta[] = [
  {
    slug: 'how-metas-free-mcp-server-changes-everything',
    title: "How Meta's Free MCP Server Changes Everything for Ad Tools",
    excerpt:
      'Meta released an official MCP server. Here is what it means for ad management tools, agency workflows, and the future of AI-driven advertising.',
    category: 'AI',
    date: 'May 15, 2026',
    readTime: '8 min',
    author: 'AdNexus Team',
    initials: 'AN',
    role: 'Product & Engineering',
    gradient: 'from-blue-600/40 to-indigo-600/30',
  },
  {
    slug: 'building-a-draft-first-ad-agent',
    title: 'Building a Draft-First Ad Agent: Why Approval Comes First',
    excerpt:
      'Staging every AI action as a draft before it touches a live campaign is the difference between an assistant you trust and one you fear. Here is how we built it.',
    category: 'Product',
    date: 'May 12, 2026',
    readTime: '6 min',
    author: 'AdNexus Team',
    initials: 'AN',
    role: 'Product & Engineering',
    gradient: 'from-emerald-600/40 to-teal-600/30',
  },
  {
    slug: 'google-ads-api-standard-access-guide',
    title: 'Google Ads API Standard Access: What You Need to Know',
    excerpt:
      'A practical guide to obtaining and maintaining Standard Access for the Google Ads API — the gate every serious automation tool has to pass.',
    category: 'Tips',
    date: 'May 8, 2026',
    readTime: '10 min',
    author: 'AdNexus Team',
    initials: 'AN',
    role: 'Product & Engineering',
    gradient: 'from-red-600/40 to-orange-600/30',
  },
  {
    slug: 'why-120-mcp-tools-is-a-problem',
    title: 'Why 120 MCP Tools is a Problem (And ~30 is the Sweet Spot)',
    excerpt:
      'Tool bloat hurts LLM reasoning. Here is why a curated, well-named tool surface beats a sprawling 120+ tool API for AI ad management.',
    category: 'AI',
    date: 'May 5, 2026',
    readTime: '7 min',
    author: 'AdNexus Team',
    initials: 'AN',
    role: 'Product & Engineering',
    gradient: 'from-violet-600/40 to-purple-600/30',
  },
  {
    slug: 'tiktok-creative-fatigue-detection',
    title: 'TikTok Creative Fatigue: Detection Strategies That Work',
    excerpt:
      'TikTok creative fatigues faster than any other platform. Here are the signals and thresholds worth watching before your ROAS falls off a cliff.',
    category: 'Tips',
    date: 'May 1, 2026',
    readTime: '9 min',
    author: 'AdNexus Team',
    initials: 'AN',
    role: 'Product & Engineering',
    gradient: 'from-cyan-600/40 to-blue-600/30',
  },
  {
    slug: 'morning-brief-proactive-ai-saves-5hrs',
    title: 'The Morning Brief: Proactive AI Beats Reactive Chat',
    excerpt:
      'What if your AI told you what happened overnight before you had to ask? The case for a proactive agent over a chat box you have to prompt.',
    category: 'Product',
    date: 'Apr 25, 2026',
    readTime: '5 min',
    author: 'AdNexus Team',
    initials: 'AN',
    role: 'Product & Engineering',
    gradient: 'from-rose-600/40 to-pink-600/30',
  },
  {
    slug: 'cross-platform-attribution-guide',
    title: 'Cross-Platform Attribution Without Breaking the Bank',
    excerpt:
      'You do not need a five-figure attribution suite to understand which channel drove the sale. Here is a pragmatic approach to cross-platform attribution.',
    category: 'Tips',
    date: 'Apr 20, 2026',
    readTime: '8 min',
    author: 'AdNexus Team',
    initials: 'AN',
    role: 'Product & Engineering',
    gradient: 'from-fuchsia-600/40 to-rose-600/30',
  },
  {
    slug: 'solo-agency-playbook-50-clients',
    title: 'The Solo-Agency Playbook: Running Many Accounts Without Burning Out',
    excerpt:
      'An illustrative playbook for how one operator can manage dozens of client accounts across four platforms with draft-first automation doing the heavy lifting.',
    category: 'Case Studies',
    date: 'Apr 28, 2026',
    readTime: '12 min',
    author: 'AdNexus Team',
    initials: 'AN',
    role: 'Agency Workflows',
    gradient: 'from-amber-600/40 to-yellow-600/30',
  },
  {
    slug: 'from-pipeboard-to-adnexus-migration-story',
    title: 'Moving From a Chat-Only Tool to a Draft-First Workspace',
    excerpt:
      'An illustrative walkthrough of what it looks like to move from an MCP chat connector to a visual, draft-first workspace — what changes, and what to expect.',
    category: 'Case Studies',
    date: 'Apr 15, 2026',
    readTime: '6 min',
    author: 'AdNexus Team',
    initials: 'AN',
    role: 'Agency Workflows',
    gradient: 'from-sky-600/40 to-blue-600/30',
  },
];

export const BLOG_SLUGS = BLOG_POSTS.map((p) => p.slug);

export function isKnownBlogSlug(slug: string): boolean {
  return BLOG_SLUGS.includes(slug);
}

export function getBlogPost(slug: string): BlogPostMeta | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
