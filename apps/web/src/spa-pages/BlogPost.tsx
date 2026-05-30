// @ts-nocheck
import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
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

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

/* ─── category meta ─── */
const categoryMeta: Record<string, { icon: typeof BookOpen; color: string; bg: string }> = {
  Product: { icon: Sparkles, color: '#2563EB', bg: 'rgba(37,99,235,0.15)' },
  AI: { icon: TrendingUp, color: '#A78BFA', bg: 'rgba(139,92,246,0.15)' },
  'Case Studies': { icon: Briefcase, color: '#34D399', bg: 'rgba(16,185,129,0.15)' },
  Tips: { icon: Lightbulb, color: '#FBBF24', bg: 'rgba(245,158,11,0.15)' },
};

/* ─── posts data ─── */
const allPosts = [
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
    gradient: 'from-blue-600/40 to-indigo-600/30',
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
    gradient: 'from-emerald-600/40 to-teal-600/30',
  },
  {
    slug: 'google-ads-api-standard-access-guide',
    title: 'Google Ads API Standard Access: What You Need to Know',
    excerpt:
      'A complete guide to obtaining and maintaining Standard Access for the Google Ads API.',
    category: 'Tips',
    date: 'May 8, 2026',
    readTime: '10 min',
    author: 'Priya Patel',
    initials: 'PP',
    role: 'API Specialist',
    gradient: 'from-red-600/40 to-orange-600/30',
  },
  {
    slug: 'why-120-mcp-tools-is-a-problem',
    title: 'Why 120 MCP Tools is a Problem (And 30 is the Sweet Spot)',
    excerpt: 'Tool bloat hurts LLM reasoning. Here is the data on why a curated 30-tool surface beats a sprawling 120+ tool API.',
    category: 'AI',
    date: 'May 5, 2026',
    readTime: '7 min',
    author: 'Alex Kim',
    initials: 'AK',
    role: 'Head of Product',
    gradient: 'from-violet-600/40 to-purple-600/30',
  },
  {
    slug: 'tiktok-creative-fatigue-detection',
    title: 'TikTok Creative Fatigue: Detection Strategies That Work',
    excerpt: 'TikTok creatives fatigue faster than any other platform. Here are the metrics and thresholds we use.',
    category: 'Tips',
    date: 'May 1, 2026',
    readTime: '9 min',
    author: 'Sofia Chen',
    initials: 'SC',
    role: 'Growth Strategist',
    gradient: 'from-cyan-600/40 to-blue-600/30',
  },
  {
    slug: 'morning-brief-proactive-ai-saves-5hrs',
    title: 'Morning Brief: How Proactive AI Agents Save 5 Hours/Week',
    excerpt: 'What if your AI told you what happened overnight before you asked?',
    category: 'Product',
    date: 'Apr 25, 2026',
    readTime: '5 min',
    author: 'Jordan Lee',
    initials: 'JL',
    role: 'Lead Engineer',
    gradient: 'from-rose-600/40 to-pink-600/30',
  },
  {
    slug: 'cross-platform-attribution-guide',
    title: 'Cross-Platform Attribution Without Breaking the Bank',
    excerpt: 'You do not need a $50K/year attribution tool. Here is how to build cross-platform attribution on a budget.',
    category: 'Tips',
    date: 'Apr 20, 2026',
    readTime: '8 min',
    author: 'Priya Patel',
    initials: 'PP',
    role: 'API Specialist',
    gradient: 'from-fuchsia-600/40 to-rose-600/30',
  },
  {
    slug: 'solo-agency-playbook-50-clients',
    title: 'The Solo Agency Playbook: Automating 50 Client Accounts',
    excerpt: 'How one solo operator manages fifty client accounts across four platforms without burning out.',
    category: 'Case Studies',
    date: 'Apr 28, 2026',
    readTime: '12 min',
    author: 'Marcus Rivera',
    initials: 'MR',
    role: 'Agency Advisor',
    gradient: 'from-amber-600/40 to-yellow-600/30',
  },
  {
    slug: 'from-pipeboard-to-adnexus-migration-story',
    title: 'From Pipeboard to AdNexus: A Migration Story',
    excerpt: 'Why we left Pipeboard after 18 months and what we gained.',
    category: 'Case Studies',
    date: 'Apr 15, 2026',
    readTime: '6 min',
    author: 'Sarah Chen',
    initials: 'SC',
    role: 'Media Buyer',
    gradient: 'from-sky-600/40 to-blue-600/30',
  },
];

/* ─── article content ─── */

function ArticleContent() {
  return (
    <article className="prose-custom">
      <p className="lead">
        On May 8, 2026, Meta did something unexpected. They released an official MCP (Model Context Protocol) server for their Marketing API — completely free, open-source, and maintained by the Meta engineering team itself. For an industry that has spent the last decade building proprietary walled gardens around ad data, this is a seismic shift.
      </p>

      <p>
        The implications go far beyond a new API wrapper. The Meta MCP server represents a fundamental change in how ad platforms think about data accessibility, AI integration, and the relationship between advertisers and their own campaign data. After spending the past week integrating it into AdNexus AI and testing it across $2M in monthly ad spend, I can say with confidence: this changes everything.
      </p>

      <h2>What Meta's MCP Server Actually Does</h2>

      <p>
        At its core, the Meta MCP server is a standardized protocol layer that sits between large language models (Claude, ChatGPT, Cursor, etc.) and the Meta Marketing API. Instead of writing custom API integrations for every tool, the MCP server exposes Meta ad data through a universal interface that any MCP-compatible client can consume.
      </p>

      <p>
        What this means in practice: you can now ask Claude to &ldquo;show me all campaigns with CPA over $50 this week&rdquo; and get an instant, accurate response pulled live from your Meta ad accounts. No code. No SQL. No dashboard navigation. Just natural language translated into structured API calls through the MCP protocol.
      </p>

      <p>
        The server supports the full Meta Marketing API surface — campaigns, ad sets, ads, insights, creatives, audiences, and conversion tracking. It handles pagination, rate limiting, error retry logic, and OAuth token refresh automatically. This is not a hacky community wrapper; this is production-grade infrastructure from Meta's own Platform Engineering team.
      </p>

      <h2>Why This Matters for Ad Management Tools</h2>

      <p>
        For the past two years, every AI-powered ad tool has faced the same architectural challenge: how do you let LLMs interact with ad platforms safely, reliably, and at scale? The approaches have fallen into three categories:
      </p>

      <ul>
        <li><strong>Chat-only interfaces</strong> (Pipeboard-style) where the AI talks to the API but you never see the data visually</li>
        <li><strong>Massive tool surfaces</strong> (120+ tools) where every API endpoint gets its own function definition, overwhelming the LLM's reasoning capacity</li>
        <li><strong>Proprietary middleware</strong> that locks you into a specific vendor's AI stack</li>
      </ul>

      <p>
        Meta's MCP server solves the protocol problem at the source. Instead of every tool vendor building their own Meta integration layer, there's now a single, authoritative bridge. This means:
      </p>

      <ul>
        <li><strong>Faster development:</strong> We went from zero to full Meta integration in 48 hours instead of three weeks</li>
        <li><strong>Better reliability:</strong> Official maintenance means fewer breaking changes and faster bug fixes</li>
        <li><strong>Lower costs:</strong> Shared infrastructure reduces the per-request overhead that gets passed to customers</li>
        <li><strong>Standardized safety:</strong> The MCP protocol includes built-in permission scoping and audit logging</li>
      </ul>

      <h2>The Safety Model: Why Draft-First Still Matters</h2>

      <p>
        Here's where I need to add a critical caveat. The MCP server makes it incredibly easy for LLMs to <em>read</em> your Meta data. But it also makes it easy for them to <em>write</em> — create campaigns, change budgets, pause ads. Without proper guardrails, this is terrifying.
      </p>

      <p>
        Meta's MCP server includes basic permission scopes, but it doesn't enforce a draft-first workflow by default. When we integrated it into AdNexus AI, we built an additional safety layer: every write action gets staged as a draft that requires human approval before deployment. The MCP server handles the API communication; our draft system handles the decision-making.
      </p>

      <p>
        This combination — Meta's official MCP server for data access, plus AdNexus's draft-first workflow for write safety — is what we believe is the correct architecture for AI-driven ad management. You get the reliability of official infrastructure with the safety of staged approvals.
      </p>

      <blockquote>
        &ldquo;The future of ad management isn't more dashboards. It's better interfaces between human intent, AI reasoning, and platform data.&rdquo;
      </blockquote>

      <h2>What Happens Next</h2>

      <p>
        I expect two things to happen in the next six months. First, Google and TikTok will release their own official MCP servers. The protocol is gaining momentum fast — there are now over 1,200 community MCP servers, and major platforms are realizing that making their data accessible to AI agents is a competitive advantage, not a risk.
      </p>

      <p>
        Second, the ad management tool landscape will bifurcate. Tools that embrace MCP and build intelligent safety layers on top of it will thrive. Tools that try to maintain proprietary integration layers or compete on raw API access will become obsolete. The moat is no longer &ldquo;we can connect to Meta&rdquo; — it's &ldquo;we can help you use AI safely and effectively once you're connected.&rdquo;
      </p>

      <h2>How to Try It</h2>

      <p>
        If you want to experiment with Meta's MCP server directly, it's available on GitHub at <code>facebook/meta-mcp-server</code>. You'll need a Meta Business account with Marketing API access, and you'll need to generate a System User token with the appropriate permissions.
      </p>

      <p>
        If you'd rather not deal with the setup, AdNexus AI now includes Meta's MCP server as a native integration. Connect your Meta account, enable the MCP layer, and you can start querying your ad data through Claude or ChatGPT immediately — with full draft-first protection on all write operations.
      </p>

      <p>
        The future of ad management isn't more dashboards. It's better interfaces between human intent, AI reasoning, and platform data. Meta's MCP server just accelerated that future by about two years.
      </p>
    </article>
  );
}

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

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const post = allPosts.find((p) => p.slug === slug);
  const isFullArticle = slug === 'how-metas-free-mcp-server-changes-everything';

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
            to="/blog"
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
    <SEO
      title="Blog Post"
      description="Read the latest article from the AdNexus AI blog about AI-powered advertising and campaign optimization."
      keywords="blog post, article, AI advertising, marketing guide"
    />
    <div className="min-h-[100dvh]" style={{ background: 'var(--bg-primary)' }}>
      {/* ─── Back link ─── */}
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            to="/blog"
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
          {isFullArticle ? <ArticleContent /> : <ComingSoon />}
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
                      color: 'white',
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
                    <Link to={`/blog/${rp.slug}`} className="block">
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
                      <Link to={`/blog/${rp.slug}`} className="block mb-2 flex-1">
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
