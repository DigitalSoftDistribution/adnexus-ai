import type { LucideIcon } from 'lucide-react';
import { BookOpen, Sparkles, TrendingUp, Briefcase, Lightbulb } from 'lucide-react';

export const BLOG_CATEGORIES = ['All', 'Product', 'AI', 'Case Studies', 'Tips'] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number];
export type PostCategory = Exclude<BlogCategory, 'All'>;

export interface CategoryMeta {
  icon: LucideIcon;
  color: string;
  bg: string;
}

export const CATEGORY_META: Record<BlogCategory, CategoryMeta> = {
  All: { icon: BookOpen, color: '#FFFFFF', bg: 'rgba(255,255,255,0.08)' },
  Product: { icon: Sparkles, color: '#2563EB', bg: 'rgba(37,99,235,0.15)' },
  AI: { icon: TrendingUp, color: '#A78BFA', bg: 'rgba(139,92,246,0.15)' },
  'Case Studies': { icon: Briefcase, color: '#34D399', bg: 'rgba(16,185,129,0.15)' },
  Tips: { icon: Lightbulb, color: '#FBBF24', bg: 'rgba(245,158,11,0.15)' },
};

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: PostCategory;
  date: string;
  readTime: string;
  author: string;
  initials: string;
  role: string;
  gradient: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'how-metas-free-mcp-server-changes-everything',
    title: "How Meta's Free MCP Server Changes Everything for Ad Tools",
    excerpt:
      'Meta released an official MCP server. Here is what it means for ad management tools, agency workflows, and the future of AI-driven advertising.',
    category: 'AI',
    date: 'May 15, 2026',
    readTime: '8 min',
    author: 'Alex Kim',
    initials: 'AK',
    role: 'Head of Product',
    gradient: 'from-blue-600/30 to-indigo-600/20',
  },
  {
    slug: 'building-a-draft-first-ad-agent',
    title: 'Building a Draft-First Ad Agent: Lessons from 47 Optimizations',
    excerpt:
      'Why staging every AI action as a draft before deployment saved our clients $40K in misconfigured campaigns.',
    category: 'Product',
    date: 'May 12, 2026',
    readTime: '6 min',
    author: 'Jordan Lee',
    initials: 'JL',
    role: 'Lead Engineer',
    gradient: 'from-emerald-600/30 to-teal-600/20',
  },
  {
    slug: 'google-ads-api-standard-access-guide',
    title: 'Google Ads API Standard Access: What You Need to Know',
    excerpt:
      'A complete guide to obtaining and maintaining Standard Access for the Google Ads API including compliance checklists.',
    category: 'Tips',
    date: 'May 8, 2026',
    readTime: '10 min',
    author: 'Priya Patel',
    initials: 'PP',
    role: 'API Specialist',
    gradient: 'from-red-600/30 to-orange-600/20',
  },
  {
    slug: 'why-120-mcp-tools-is-a-problem',
    title: 'Why 120 MCP Tools is a Problem (And 30 is the Sweet Spot)',
    excerpt:
      'Tool bloat hurts LLM reasoning. Here is the data on why a curated 30-tool surface beats a sprawling 120+ tool API.',
    category: 'AI',
    date: 'May 5, 2026',
    readTime: '7 min',
    author: 'Alex Kim',
    initials: 'AK',
    role: 'Head of Product',
    gradient: 'from-violet-600/30 to-purple-600/20',
  },
  {
    slug: 'tiktok-creative-fatigue-detection',
    title: 'TikTok Creative Fatigue: Detection Strategies That Work',
    excerpt:
      'TikTok creatives fatigue faster than any other platform. Here are the metrics and thresholds we use to catch it early.',
    category: 'Tips',
    date: 'May 1, 2026',
    readTime: '9 min',
    author: 'Sofia Chen',
    initials: 'SC',
    role: 'Growth Strategist',
    gradient: 'from-cyan-600/30 to-blue-600/20',
  },
  {
    slug: 'solo-agency-playbook-50-clients',
    title: 'The Solo Agency Playbook: Automating 50 Client Accounts',
    excerpt:
      'How one solo operator uses AdNexus AI to manage fifty client accounts across four platforms without burning out.',
    category: 'Case Studies',
    date: 'Apr 28, 2026',
    readTime: '12 min',
    author: 'Marcus Rivera',
    initials: 'MR',
    role: 'Agency Advisor',
    gradient: 'from-amber-600/30 to-yellow-600/20',
  },
  {
    slug: 'morning-brief-proactive-ai-saves-5hrs',
    title: 'Morning Brief: How Proactive AI Agents Save 5 Hours/Week',
    excerpt:
      'What if your AI told you what happened overnight before you asked? Inside the Morning Brief feature.',
    category: 'Product',
    date: 'Apr 25, 2026',
    readTime: '5 min',
    author: 'Jordan Lee',
    initials: 'JL',
    role: 'Lead Engineer',
    gradient: 'from-rose-600/30 to-pink-600/20',
  },
  {
    slug: 'cross-platform-attribution-guide',
    title: 'Cross-Platform Attribution Without Breaking the Bank',
    excerpt:
      'You do not need a $50K/year attribution tool. Here is how to build cross-platform attribution on a budget.',
    category: 'Tips',
    date: 'Apr 20, 2026',
    readTime: '8 min',
    author: 'Priya Patel',
    initials: 'PP',
    role: 'API Specialist',
    gradient: 'from-fuchsia-600/30 to-rose-600/20',
  },
  {
    slug: 'from-pipeboard-to-adnexus-migration-story',
    title: 'From Pipeboard to AdNexus: A Migration Story',
    excerpt:
      'Why we left Pipeboard after 18 months, what we gained, and the exact migration timeline from chat-only to dashboard-driven.',
    category: 'Case Studies',
    date: 'Apr 15, 2026',
    readTime: '6 min',
    author: 'Sarah Chen',
    initials: 'SC',
    role: 'Media Buyer',
    gradient: 'from-sky-600/30 to-blue-600/20',
  },
];

export const POSTS_PER_PAGE = 6;

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

/** Up to `limit` related posts, preferring the same category. */
export function getRelatedPosts(slug: string, limit = 3): BlogPost[] {
  const current = getPostBySlug(slug);
  if (!current) return BLOG_POSTS.slice(0, limit);
  const sameCategory = BLOG_POSTS.filter(
    (p) => p.slug !== slug && p.category === current.category,
  );
  const others = BLOG_POSTS.filter(
    (p) => p.slug !== slug && p.category !== current.category,
  );
  return [...sameCategory, ...others].slice(0, limit);
}
