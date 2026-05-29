import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';
import {
  ChevronDown,
  ChevronRight,
  Shield,
  AlertTriangle,
  Check,
  Copy,
  Terminal,
  Eye,
  Edit3,
  Bot,
  Zap,
  Search,
  ExternalLink,
  BookOpen,
} from 'lucide-react';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

/* ─── tool data ─── */

interface ToolParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface Tool {
  name: string;
  description: string;
  platforms: string[];
  safety: 'read-only' | 'draft-first' | 'requires-approval' | 'safe';
  params: ToolParam[];
}

const readTools: Tool[] = [
  {
    name: 'list_campaigns',
    description: 'List all campaigns with optional filters by status, date range, or platform.',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'read-only',
    params: [
      { name: 'platform', type: 'string', required: false, description: 'Filter by platform (meta, google, tiktok, snap)' },
      { name: 'status', type: 'string', required: false, description: 'Filter by campaign status (active, paused, draft)' },
      { name: 'limit', type: 'number', required: false, description: 'Maximum number of results (default 50)' },
    ],
  },
  {
    name: 'get_campaign',
    description: 'Get detailed information for a single campaign including settings and performance.',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'read-only',
    params: [
      { name: 'campaign_id', type: 'string', required: true, description: 'Unique campaign identifier' },
      { name: 'platform', type: 'string', required: true, description: 'Source platform' },
    ],
  },
  {
    name: 'list_adsets',
    description: 'List ad sets within a campaign with targeting and budget details.',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'read-only',
    params: [
      { name: 'campaign_id', type: 'string', required: true, description: 'Parent campaign ID' },
      { name: 'platform', type: 'string', required: true, description: 'Source platform' },
    ],
  },
  {
    name: 'get_adset',
    description: 'Get ad set details including targeting, budget, bid strategy, and schedule.',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'read-only',
    params: [
      { name: 'adset_id', type: 'string', required: true, description: 'Unique ad set identifier' },
      { name: 'platform', type: 'string', required: true, description: 'Source platform' },
    ],
  },
  {
    name: 'list_ads',
    description: 'List ads with creative info, status, and performance summary.',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'read-only',
    params: [
      { name: 'adset_id', type: 'string', required: false, description: 'Filter by parent ad set' },
      { name: 'platform', type: 'string', required: true, description: 'Source platform' },
      { name: 'status', type: 'string', required: false, description: 'Filter by ad status' },
    ],
  },
  {
    name: 'get_ad',
    description: 'Get ad details including creative assets, copy, and performance metrics.',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'read-only',
    params: [
      { name: 'ad_id', type: 'string', required: true, description: 'Unique ad identifier' },
      { name: 'platform', type: 'string', required: true, description: 'Source platform' },
    ],
  },
  {
    name: 'query_metrics',
    description: 'Flexible metrics query with custom dimensions, filters, and aggregations.',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'read-only',
    params: [
      { name: 'metrics', type: 'string[]', required: true, description: 'Metrics to retrieve (impressions, clicks, spend, cpa, roas, etc.)' },
      { name: 'dimensions', type: 'string[]', required: false, description: 'Breakdown dimensions (platform, campaign, date, etc.)' },
      { name: 'date_range', type: 'object', required: true, description: 'Start and end dates' },
      { name: 'filters', type: 'object', required: false, description: 'Optional filters' },
    ],
  },
  {
    name: 'get_insights',
    description: 'Get performance insights for any campaign, ad set, or ad with trend analysis.',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'read-only',
    params: [
      { name: 'object_id', type: 'string', required: true, description: 'Campaign, ad set, or ad ID' },
      { name: 'object_type', type: 'string', required: true, description: 'Type of object (campaign, adset, ad)' },
      { name: 'date_range', type: 'object', required: true, description: 'Analysis period' },
    ],
  },
  {
    name: 'list_creatives',
    description: 'List creative assets with thumbnails, format info, and usage stats.',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'read-only',
    params: [
      { name: 'platform', type: 'string', required: true, description: 'Source platform' },
      { name: 'format', type: 'string', required: false, description: 'Filter by creative format' },
      { name: 'limit', type: 'number', required: false, description: 'Maximum results' },
    ],
  },
  {
    name: 'get_audience',
    description: 'Get audience and targeting details including demographics, interests, and reach estimates.',
    platforms: ['Meta', 'Google'],
    safety: 'read-only',
    params: [
      { name: 'audience_id', type: 'string', required: true, description: 'Audience identifier' },
      { name: 'platform', type: 'string', required: true, description: 'Meta or Google' },
    ],
  },
  {
    name: 'get_budget',
    description: 'Get budget and pacing information including daily spend and remaining allocation.',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'read-only',
    params: [
      { name: 'object_id', type: 'string', required: true, description: 'Campaign or ad set ID' },
      { name: 'platform', type: 'string', required: true, description: 'Source platform' },
    ],
  },
  {
    name: 'get_attribution',
    description: 'Get cross-platform attribution data with conversion path analysis.',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'read-only',
    params: [
      { name: 'conversion_type', type: 'string', required: true, description: 'Type of conversion to attribute' },
      { name: 'date_range', type: 'object', required: true, description: 'Attribution window' },
      { name: 'model', type: 'string', required: false, description: 'Attribution model (first_click, last_click, linear)' },
    ],
  },
];

const writeDraftTools: Tool[] = [
  {
    name: 'create_campaign',
    description: 'Create a new campaign (staged as a draft for approval).',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'draft-first',
    params: [
      { name: 'name', type: 'string', required: true, description: 'Campaign name' },
      { name: 'objective', type: 'string', required: true, description: 'Campaign objective' },
      { name: 'budget', type: 'number', required: true, description: 'Daily or lifetime budget' },
      { name: 'platform', type: 'string', required: true, description: 'Target platform' },
    ],
  },
  {
    name: 'update_campaign',
    description: 'Update campaign settings (staged as a draft for approval).',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'draft-first',
    params: [
      { name: 'campaign_id', type: 'string', required: true, description: 'Campaign to update' },
      { name: 'updates', type: 'object', required: true, description: 'Fields to update' },
    ],
  },
  {
    name: 'update_budget',
    description: 'Change campaign or ad set budget (staged as a draft for approval).',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'draft-first',
    params: [
      { name: 'object_id', type: 'string', required: true, description: 'Campaign or ad set ID' },
      { name: 'new_budget', type: 'number', required: true, description: 'New budget amount' },
      { name: 'budget_type', type: 'string', required: true, description: 'daily or lifetime' },
    ],
  },
  {
    name: 'update_status',
    description: 'Pause or activate a campaign, ad set, or ad (staged as a draft).',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'draft-first',
    params: [
      { name: 'object_id', type: 'string', required: true, description: 'Object to update' },
      { name: 'status', type: 'string', required: true, description: 'active or paused' },
    ],
  },
  {
    name: 'update_bid',
    description: 'Adjust bid strategy or amount (staged as a draft for approval).',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'draft-first',
    params: [
      { name: 'adset_id', type: 'string', required: true, description: 'Ad set to update' },
      { name: 'bid_strategy', type: 'string', required: false, description: 'New bid strategy' },
      { name: 'bid_amount', type: 'number', required: false, description: 'New bid amount' },
    ],
  },
  {
    name: 'update_targeting',
    description: 'Modify audience targeting (staged as a draft for approval).',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'draft-first',
    params: [
      { name: 'adset_id', type: 'string', required: true, description: 'Ad set to update' },
      { name: 'targeting', type: 'object', required: true, description: 'New targeting spec' },
    ],
  },
  {
    name: 'upload_creative',
    description: 'Upload a new creative asset (staged as a draft for approval).',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'draft-first',
    params: [
      { name: 'file_url', type: 'string', required: true, description: 'URL to creative asset' },
      { name: 'format', type: 'string', required: true, description: 'Asset format type' },
      { name: 'name', type: 'string', required: true, description: 'Creative name' },
    ],
  },
  {
    name: 'duplicate_campaign',
    description: 'Clone an existing campaign (staged as a draft for approval).',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'draft-first',
    params: [
      { name: 'campaign_id', type: 'string', required: true, description: 'Campaign to clone' },
      { name: 'new_name', type: 'string', required: false, description: 'Name for the duplicate' },
    ],
  },
  {
    name: 'create_ab_test',
    description: 'Set up an A/B test (staged as a draft for approval).',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'draft-first',
    params: [
      { name: 'campaign_id', type: 'string', required: true, description: 'Base campaign' },
      { name: 'test_variables', type: 'object', required: true, description: 'Variables to test' },
      { name: 'duration', type: 'number', required: true, description: 'Test duration in days' },
    ],
  },
  {
    name: 'apply_optimization',
    description: 'Apply an AI-suggested optimization (staged as a draft for approval).',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'draft-first',
    params: [
      { name: 'suggestion_id', type: 'string', required: true, description: 'Optimization suggestion ID' },
      { name: 'params', type: 'object', required: false, description: 'Override parameters' },
    ],
  },
];

const writeImmediateTools: Tool[] = [
  {
    name: 'approve_draft',
    description: 'Approve and deploy a pending draft to the live account.',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'requires-approval',
    params: [
      { name: 'draft_id', type: 'string', required: true, description: 'Draft to approve' },
      { name: 'notes', type: 'string', required: false, description: 'Approval notes' },
    ],
  },
  {
    name: 'reject_draft',
    description: 'Reject a pending draft with optional feedback.',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'safe',
    params: [
      { name: 'draft_id', type: 'string', required: true, description: 'Draft to reject' },
      { name: 'reason', type: 'string', required: false, description: 'Rejection reason' },
    ],
  },
  {
    name: 'cancel_scheduled',
    description: 'Cancel a scheduled action before it executes.',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'safe',
    params: [
      { name: 'schedule_id', type: 'string', required: true, description: 'Scheduled action ID' },
    ],
  },
  {
    name: 'send_report',
    description: 'Send or schedule a performance report via email or Slack.',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'safe',
    params: [
      { name: 'report_type', type: 'string', required: true, description: 'Type of report' },
      { name: 'recipients', type: 'string[]', required: true, description: 'Email or Slack channels' },
      { name: 'schedule', type: 'object', required: false, description: 'Optional recurring schedule' },
    ],
  },
];

const agentTools: Tool[] = [
  {
    name: 'run_audit',
    description: 'Trigger a comprehensive performance audit across connected accounts.',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'safe',
    params: [
      { name: 'scope', type: 'string', required: true, description: 'Audit scope (account, campaign, platform)' },
      { name: 'focus_areas', type: 'string[]', required: false, description: 'Specific areas to audit' },
    ],
  },
  {
    name: 'detect_anomalies',
    description: 'Run anomaly detection across accounts to find unusual patterns.',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'safe',
    params: [
      { name: 'date_range', type: 'object', required: true, description: 'Detection window' },
      { name: 'sensitivity', type: 'string', required: false, description: 'low, medium, or high' },
    ],
  },
  {
    name: 'generate_brief',
    description: 'Generate a creative brief based on campaign performance data.',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'safe',
    params: [
      { name: 'campaign_id', type: 'string', required: true, description: 'Reference campaign' },
      { name: 'objective', type: 'string', required: false, description: 'Brief objective' },
    ],
  },
  {
    name: 'get_recommendations',
    description: 'Get AI-generated optimization recommendations with confidence scores.',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    safety: 'safe',
    params: [
      { name: 'object_id', type: 'string', required: true, description: 'Target object' },
      { name: 'goal', type: 'string', required: false, description: 'Optimization goal (cpa, roas, ctr)' },
    ],
  },
];

/* ─── platform badge colors ─── */

const platformStyles: Record<string, { bg: string; text: string }> = {
  Meta: { bg: 'rgba(24,119,242,0.15)', text: '#60A5FA' },
  Google: { bg: 'rgba(219,68,55,0.15)', text: '#F87171' },
  TikTok: { bg: 'rgba(0,242,234,0.15)', text: '#22D3EE' },
  Snap: { bg: 'rgba(255,252,0,0.15)', text: '#FDE047' },
};

const safetyBadge = (safety: Tool['safety']) => {
  switch (safety) {
    case 'read-only':
      return {
        icon: Eye,
        label: 'Read',
        bg: 'rgba(16,185,129,0.12)',
        text: '#34D399',
        border: 'rgba(16,185,129,0.2)',
      };
    case 'draft-first':
      return {
        icon: Edit3,
        label: 'Write',
        bg: 'rgba(245,158,11,0.12)',
        text: '#FBBF24',
        border: 'rgba(245,158,11,0.2)',
      };
    case 'requires-approval':
      return {
        icon: AlertTriangle,
        label: 'Immediate',
        bg: 'rgba(249,115,22,0.12)',
        text: '#FB923C',
        border: 'rgba(249,115,22,0.2)',
      };
    case 'safe':
      return {
        icon: Shield,
        label: 'Safe',
        bg: 'rgba(59,130,246,0.12)',
        text: '#60A5FA',
        border: 'rgba(59,130,246,0.2)',
      };
  }
};

/* ─── Tool Card ─── */

function ToolCard({ tool, index }: { tool: Tool; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const badge = safetyBadge(tool.safety);
  const SafetyIcon = badge.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.4, ease: easeSmooth }}
      className="group overflow-hidden rounded-xl transition-all duration-300 hover:-translate-y-1"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="p-5">
        {/* Header: name + safety badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3
            className="font-mono text-sm font-bold leading-snug"
            style={{ color: 'var(--text-primary)' }}
          >
            {tool.name}
          </h3>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0"
            style={{
              background: badge.bg,
              color: badge.text,
              border: `1px solid ${badge.border}`,
            }}
          >
            <SafetyIcon size={11} />
            {badge.label}
          </span>
        </div>

        {/* Description */}
        <p
          className="font-inter text-sm leading-relaxed mb-3"
          style={{ color: 'var(--text-secondary)' }}
        >
          {tool.description}
        </p>

        {/* Platform tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tool.platforms.map((p) => (
            <span
              key={p}
              className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{
                background: platformStyles[p]?.bg || 'var(--bg-hover)',
                color: platformStyles[p]?.text || 'var(--text-secondary)',
              }}
            >
              {p}
            </span>
          ))}
        </div>

        {/* Expandable params */}
        {tool.params.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1.5 font-inter text-xs font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {tool.params.length} parameter{tool.params.length > 1 ? 's' : ''}
          </button>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: easeSmooth }}
            className="overflow-hidden"
          >
            <div
              className="px-5 pb-4"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <div className="pt-3 space-y-2">
                {tool.params.map((param) => (
                  <div key={param.name} className="flex items-start gap-2">
                    <span
                      className="font-mono text-xs font-medium mt-0.5"
                      style={{ color: 'var(--text-primary)', minWidth: 100 }}
                    >
                      {param.name}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className="font-mono text-xs"
                          style={{ color: 'var(--accent)' }}
                        >
                          {param.type}
                        </span>
                        {param.required ? (
                          <span
                            className="text-xs font-medium"
                            style={{ color: 'var(--status-error)' }}
                          >
                            required
                          </span>
                        ) : (
                          <span
                            className="text-xs"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            optional
                          </span>
                        )}
                      </div>
                      <p
                        className="font-inter text-xs"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {param.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── category filter tabs ─── */

type CategoryKey = 'read' | 'writeDraft' | 'writeImmediate' | 'agent';

const categoryTabs: { key: CategoryKey; label: string; count: number; icon: typeof Eye; color: string; bg: string; tools: Tool[] }[] = [
  { key: 'read', label: 'Read', count: 12, icon: Eye, color: '#34D399', bg: 'rgba(16,185,129,0.15)', tools: readTools },
  { key: 'writeDraft', label: 'Write', count: 10, icon: Edit3, color: '#FBBF24', bg: 'rgba(245,158,11,0.15)', tools: writeDraftTools },
  { key: 'writeImmediate', label: 'Immediate', count: 4, icon: Zap, color: '#FB923C', bg: 'rgba(249,115,22,0.15)', tools: writeImmediateTools },
  { key: 'agent', label: 'Agent', count: 4, icon: Bot, color: '#60A5FA', bg: 'rgba(59,130,246,0.15)', tools: agentTools },
];

const mcpConfig = `{
  "mcpServers": {
    "adnexus": {
      "url": "https://api.adnexus.ai/mcp/v1",
      "auth": { "type": "oauth2" }
    }
  }
}`;

/* ─── page component ─── */

export default function ToolExplorer() {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('read');
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const activeTools = categoryTabs.find((c) => c.key === activeCategory)?.tools || [];
  const filteredTools = searchQuery
    ? activeTools.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : activeTools;

  const totalTools = categoryTabs.reduce((sum, c) => sum + c.count, 0);

  const handleCopy = () => {
    navigator.clipboard.writeText(mcpConfig).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
    <SEO
      title="Tool Explorer"
      description="Explore all the tools and features in AdNexus AI. Discover AI-powered capabilities for campaign management, optimization, and reporting."
      keywords="tool explorer, features, capabilities, AI tools, marketing tools"
    />
    <div className="min-h-[100dvh]" style={{ background: 'var(--bg-primary)' }}>
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-6 pt-20 pb-8">
        <div className="absolute inset-0 opacity-20">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[150px]"
            style={{ background: 'var(--accent-glow)' }}
          />
          <div
            className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-[120px]"
            style={{ background: 'rgba(139,92,246,0.08)' }}
          />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto text-center">
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
              <Terminal size={14} style={{ color: 'var(--accent)' }} />
              MCP Reference
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: easeSmooth }}
            className="font-space text-4xl sm:text-5xl font-bold tracking-tight mb-4"
          >
            <span className="text-gradient-blue">MCP Tool Explorer</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: easeSmooth }}
            className="font-inter text-lg max-w-xl mx-auto"
            style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}
          >
            {totalTools} curated tools your AI agent can use to manage ad campaigns across Meta, Google, TikTok, and Snap.
          </motion.p>
        </div>
      </section>

      {/* ─── Category Tabs + Search ─── */}
      <section className="px-6 pb-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25, ease: easeSmooth }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
          >
            {/* Category tabs */}
            <div className="flex flex-wrap gap-2 flex-1">
              {categoryTabs.map((cat) => {
                const isActive = activeCategory === cat.key;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.key}
                    onClick={() => {
                      setActiveCategory(cat.key);
                      setSearchQuery('');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-inter text-sm font-medium transition-all duration-200"
                    style={{
                      background: isActive ? cat.bg : 'transparent',
                      color: isActive ? cat.color : 'var(--text-secondary)',
                      border: `1px solid ${isActive ? cat.bg : 'var(--border-subtle)'}`,
                    }}
                  >
                    <Icon size={14} />
                    {cat.label}
                    <span
                      className="ml-0.5 font-mono text-xs"
                      style={{ color: isActive ? cat.color : 'var(--text-tertiary)' }}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search bar */}
            <div
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg sm:w-64 transition-all duration-200 focus-within:border-[var(--accent)]"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Search size={16} style={{ color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools..."
                className="flex-1 bg-transparent outline-none font-inter text-sm"
                style={{ color: 'var(--text-primary)' }}
              />
              {searchQuery && (
                <span
                  className="font-mono text-xs"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {filteredTools.length}
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Tool Grid ─── */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory + searchQuery}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: easeSmooth }}
            >
              {filteredTools.length === 0 ? (
                <div
                  className="text-center py-20 rounded-xl"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <Search
                    size={40}
                    className="mx-auto mb-4"
                    style={{ color: 'var(--text-tertiary)' }}
                  />
                  <p
                    className="font-inter text-base"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    No tools match your search
                  </p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="font-inter text-sm mt-3 transition-opacity hover:opacity-70"
                    style={{ color: 'var(--accent)' }}
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredTools.map((tool, i) => (
                    <ToolCard key={tool.name} tool={tool} index={i} />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ─── Try with Claude CTA ─── */}
      <section className="px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, ease: easeSmooth }}
          className="max-w-3xl mx-auto"
        >
          <div
            className="relative overflow-hidden rounded-xl"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-active)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div className="flex items-center gap-3">
                <Terminal size={16} style={{ color: 'var(--accent)' }} />
                <span
                  className="font-inter text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Try with Claude
                </span>
              </div>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-inter text-xs font-medium transition-all duration-150 hover:scale-[1.02]"
                style={{
                  background: copied ? 'rgba(16,185,129,0.15)' : 'var(--bg-hover)',
                  color: copied ? '#10B981' : 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Code */}
            <div className="p-5 overflow-x-auto">
              <pre className="font-mono text-sm leading-relaxed">
                <code style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>{'{'}</span>
                  {'\n'}
                  <span style={{ color: 'var(--text-primary)' }}>  </span>
                  <span style={{ color: '#A78BFA' }}>&quot;mcpServers&quot;</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>: </span>
                  <span style={{ color: 'var(--text-tertiary)' }}>{'{'}</span>
                  {'\n'}
                  <span style={{ color: 'var(--text-primary)' }}>    </span>
                  <span style={{ color: '#A78BFA' }}>&quot;adnexus&quot;</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>: </span>
                  <span style={{ color: 'var(--text-tertiary)' }}>{'{'}</span>
                  {'\n'}
                  <span style={{ color: 'var(--text-primary)' }}>      </span>
                  <span style={{ color: '#A78BFA' }}>&quot;url&quot;</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>: </span>
                  <span style={{ color: '#34D399' }}>&quot;https://api.adnexus.ai/mcp/v1&quot;</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>,</span>
                  {'\n'}
                  <span style={{ color: 'var(--text-primary)' }}>      </span>
                  <span style={{ color: '#A78BFA' }}>&quot;auth&quot;</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>: </span>
                  <span style={{ color: 'var(--text-tertiary)' }}>{'{'}</span>
                  {'\n'}
                  <span style={{ color: 'var(--text-primary)' }}>        </span>
                  <span style={{ color: '#A78BFA' }}>&quot;type&quot;</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>: </span>
                  <span style={{ color: '#34D399' }}>&quot;oauth2&quot;</span>
                  {'\n'}
                  <span style={{ color: 'var(--text-primary)' }}>      </span>
                  <span style={{ color: 'var(--text-tertiary)' }}>{'}'}</span>
                  {'\n'}
                  <span style={{ color: 'var(--text-primary)' }}>    </span>
                  <span style={{ color: 'var(--text-tertiary)' }}>{'}'}</span>
                  {'\n'}
                  <span style={{ color: 'var(--text-primary)' }}>  </span>
                  <span style={{ color: 'var(--text-tertiary)' }}>{'}'}</span>
                  {'\n'}
                  <span style={{ color: 'var(--text-tertiary)' }}>{'}'}</span>
                </code>
              </pre>
            </div>

            {/* Footer CTA */}
            <div
              className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              style={{
                borderTop: '1px solid var(--border-subtle)',
                background: 'rgba(37,99,235,0.04)',
              }}
            >
              <div className="flex items-center gap-3">
                <BookOpen size={16} style={{ color: 'var(--accent)' }} />
                <span className="font-inter text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Add this to your Claude Desktop config to get started.
                </span>
              </div>
              <a
                href="https://claude.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-inter text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: 'var(--accent)',
                  color: 'white',
                }}
              >
                Open Claude
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Utility styles */}
      <style>{`
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
