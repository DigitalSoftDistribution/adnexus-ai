import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import {
  ArrowLeft, Settings, Check, X, ChevronDown, ChevronUp,
  Bot, TrendingUp, Volume2, VolumeX, CheckCircle2,
  LayoutDashboard, Megaphone, AlertCircle, ArrowRightLeft,
  ThumbsUp, ThumbsDown, Clock, Sparkles,
  BarChart3, Target, Users, Eye,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type Platform = 'Meta' | 'Google' | 'TikTok' | 'Snap' | 'All';
type ActionType = 'Budget Change' | 'Pause' | 'Scale' | 'Creative Refresh' | 'Budget Reallocation';

interface ApprovalCard {
  id: number;
  platform: Platform;
  actionType: ActionType;
  campaignName: string;
  before: string;
  after: string;
  isIncrease: boolean | null;
  aiReasoning: string;
  impactEstimate: string;
  impactPositive: boolean;
  actor: string;
  timeAgo: string;
  confidence: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  details: {
    diffTable: { label: string; before: string; after: string }[];
    sparklineData: number[];
    relatedDrafts: number;
    aiExplanation: string;
    similarChanges: number;
    successRate: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const PLATFORM_COLORS: Record<Platform, string> = {
  Meta: '#1877F2',
  Google: '#DB4437',
  TikTok: '#00F2EA',
  Snap: '#FFFC00',
  All: '#8B5CF6',
};

const ACTION_COLORS: Record<ActionType, string> = {
  'Budget Change': '#F59E0B',
  Pause: '#EF4444',
  Scale: '#10B981',
  'Creative Refresh': '#3B82F6',
  'Budget Reallocation': '#8B5CF6',
};

const RISK_COLORS: Record<string, string> = {
  Low: '#10B981',
  Medium: '#F59E0B',
  High: '#EF4444',
};

const INITIAL_CARDS: ApprovalCard[] = [
  {
    id: 1, platform: 'Meta', actionType: 'Budget Change', campaignName: 'Summer Sale Blitz',
    before: '$500/day', after: '$650/day', isIncrease: true,
    aiReasoning: 'ROAS is 4.2x (above 3.0x threshold). Scaling budget should capture more conversions at similar efficiency.',
    impactEstimate: '+45 conv/wk', impactPositive: true,
    actor: 'AI Agent', timeAgo: '15 min ago', confidence: 94, riskLevel: 'Low',
    details: {
      diffTable: [
        { label: 'Daily Budget', before: '$500', after: '$650' },
        { label: 'Bid Strategy', before: 'Lowest Cost', after: 'Lowest Cost' },
        { label: 'Target ROAS', before: '3.0x', after: '3.0x' },
      ],
      sparklineData: [320, 340, 310, 380, 400, 420, 450],
      relatedDrafts: 2,
      aiExplanation: 'Over the past 7 days, this campaign has consistently exceeded the ROAS threshold of 3.0x, reaching 4.2x in the last 48 hours. Increasing budget by 30% should capture additional conversions at a similar efficiency level. Similar changes have succeeded 87% of the time.',
      similarChanges: 24,
      successRate: 87,
    },
  },
  {
    id: 2, platform: 'Google', actionType: 'Pause', campaignName: 'Display Remarketing',
    before: 'Active', after: 'Paused', isIncrease: null,
    aiReasoning: 'CPA $72 exceeds $50 threshold for 3+ days. Pausing will reallocate spend to better performers.',
    impactEstimate: 'Save $200/wk', impactPositive: true,
    actor: 'AI Agent', timeAgo: '32 min ago', confidence: 98, riskLevel: 'Low',
    details: {
      diffTable: [
        { label: 'Status', before: 'Active', after: 'Paused' },
        { label: 'CPA (7d avg)', before: '$72', after: '\u2014' },
        { label: 'Daily Spend', before: '$150', after: '$0' },
      ],
      sparklineData: [45, 52, 68, 72, 75, 70, 72],
      relatedDrafts: 0,
      aiExplanation: 'The CPA has been above the $50 threshold for 3 consecutive days, reaching $72. This campaign is no longer efficient. Pausing it will save $200/week that can be reallocated to better-performing campaigns. Historical data shows 92% success rate for pause recommendations at this threshold.',
      similarChanges: 18,
      successRate: 92,
    },
  },
  {
    id: 3, platform: 'TikTok', actionType: 'Scale', campaignName: 'Hook Challenge UGC',
    before: '$300/day', after: '$450/day', isIncrease: true,
    aiReasoning: 'CTR 3.2% trending up with strong creative momentum. Capturing window before fatigue sets in.',
    impactEstimate: '+52 conv/wk', impactPositive: true,
    actor: 'AI Agent', timeAgo: '1 hr ago', confidence: 89, riskLevel: 'Medium',
    details: {
      diffTable: [
        { label: 'Daily Budget', before: '$300', after: '$450' },
        { label: 'CTR', before: '2.1%', after: '3.2%' },
        { label: 'Frequency', before: '1.4', after: '1.6' },
      ],
      sparklineData: [120, 145, 160, 180, 210, 240, 280],
      relatedDrafts: 1,
      aiExplanation: 'CTR has increased from 2.1% to 3.2% over the past week, indicating strong creative-audience fit. Scaling budget by 50% now will capture more conversions while creative is still fresh. Monitor frequency to catch early fatigue signals.',
      similarChanges: 15,
      successRate: 83,
    },
  },
  {
    id: 4, platform: 'Meta', actionType: 'Creative Refresh', campaignName: 'Flash Sale Carousel',
    before: 'Current Creative', after: 'New Creative Set', isIncrease: null,
    aiReasoning: 'Frequency 2.8, CTR down 34% from peak. Creative fatigue detected. Fresh creative should restore performance.',
    impactEstimate: '+15% CTR recovery', impactPositive: true,
    actor: 'AI Agent', timeAgo: '2 hr ago', confidence: 96, riskLevel: 'Low',
    details: {
      diffTable: [
        { label: 'Frequency', before: '1.2', after: '2.8' },
        { label: 'CTR', before: '2.4%', after: '1.6%' },
        { label: 'Creative Age', before: '3 days', after: '12 days' },
      ],
      sparklineData: [2.4, 2.3, 2.1, 1.9, 1.8, 1.7, 1.6],
      relatedDrafts: 3,
      aiExplanation: 'Creative has been running for 12 days with frequency reaching 2.8. CTR has dropped 34% from its peak. Uploading fresh creative is recommended to combat fatigue and restore CTR to baseline. 3 new creatives are already drafted and ready.',
      similarChanges: 31,
      successRate: 91,
    },
  },
  {
    id: 5, platform: 'All', actionType: 'Budget Reallocation', campaignName: 'Cross-Platform Shift',
    before: '$500 Google', after: '$500 \u2192 TikTok', isIncrease: null,
    aiReasoning: 'TikTok ROAS 3.8x vs Google 2.1x. Better allocation improves blended ROAS significantly.',
    impactEstimate: '+$340 rev/wk', impactPositive: true,
    actor: 'AI Agent', timeAgo: '3 hr ago', confidence: 85, riskLevel: 'Medium',
    details: {
      diffTable: [
        { label: 'Google Budget', before: '$500/day', after: '$0/day' },
        { label: 'TikTok Budget', before: '$300/day', after: '$800/day' },
        { label: 'Blended ROAS', before: '2.1x', after: 'Est. 3.2x' },
      ],
      sparklineData: [2100, 2200, 2050, 2300, 2400, 2500, 2600],
      relatedDrafts: 2,
      aiExplanation: 'TikTok campaigns are delivering 3.8x ROAS compared to Google\'s 2.1x. Shifting $500/day from Google to TikTok should increase overall revenue by $340/week while maintaining efficiency. Gradual shift over 3 days is recommended.',
      similarChanges: 8,
      successRate: 78,
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Sparkline Component                                                */
/* ------------------------------------------------------------------ */
function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 120;
  const height = 30;
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((v - min) / range) * height,
  }));
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const color = positive ? '#10B981' : '#EF4444';

  return (
    <svg width={width} height={height + 4} viewBox={`0 0 ${width} ${height + 4}`} className="opacity-70">
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */
function SkeletonCard() {
  return (
    <div className="card-surface overflow-hidden animate-pulse" style={{ borderTop: '4px solid var(--border-subtle)' }}>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="w-20 h-3 rounded" style={{ background: 'var(--bg-hover)' }} />
          <div className="w-16 h-3 rounded" style={{ background: 'var(--bg-hover)' }} />
        </div>
        <div className="h-5 rounded w-3/4" style={{ background: 'var(--bg-hover)' }} />
        <div className="h-3 rounded w-full" style={{ background: 'var(--bg-hover)' }} />
        <div className="h-3 rounded w-2/3" style={{ background: 'var(--bg-hover)' }} />
        <div className="h-8 rounded w-full" style={{ background: 'var(--bg-hover)' }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function MobileApproval() {
  const [cards, setCards] = useState<ApprovalCard[]>(INITIAL_CARDS);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [justApproved, setJustApproved] = useState<number | null>(null);
  const [justRejected, setJustRejected] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPlatform, setFilterPlatform] = useState<Platform | 'All'>('All');
  const [showApproveConfirm, setShowApproveConfirm] = useState<number | null>(null);
  const [showRejectConfirm, setShowRejectConfirm] = useState<number | null>(null);

  const [settings, setSettings] = useState({
    autoApproveBudget20: false,
    autoApproveCPA2x: false,
    requireConfirmation: true,
    notificationSound: true,
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleApprove = useCallback((id: number) => {
    setJustApproved(id);
    setTimeout(() => {
      setCards((prev) => prev.filter((c) => c.id !== id));
      setJustApproved(null);
      setExpandedId(null);
      setShowApproveConfirm(null);
    }, 400);
  }, []);

  const handleReject = useCallback((id: number) => {
    setJustRejected(id);
    setTimeout(() => {
      setCards((prev) => prev.filter((c) => c.id !== id));
      setJustRejected(null);
      setExpandedId(null);
      setShowRejectConfirm(null);
    }, 400);
  }, []);

  const toggleExpand = useCallback((id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleSwipe = useCallback(
    (id: number, info: PanInfo) => {
      if (info.offset.x > 120) {
        handleApprove(id);
      } else if (info.offset.x < -120) {
        handleReject(id);
      }
    },
    [handleApprove, handleReject]
  );

  const filteredCards = filterPlatform === 'All'
    ? cards
    : cards.filter(c => c.platform === filterPlatform);

  const allCaughtUp = filteredCards.length === 0 && !isLoading;

  return (
    <>
    <SEO
      title="Mobile Approval"
      description="Review and approve campaigns, creatives, and budget changes on the go. Mobile-friendly approval workflows for busy teams."
      keywords="mobile approval, on-the-go approval, campaign approval, quick review"
    />
    <div className="min-h-[100dvh] flex justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md flex flex-col min-h-[100dvh]">
        {/* ==================== HEADER ==================== */}
        <div
          className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between"
          style={{
            background: 'rgba(10,10,10,0.9)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="p-2 -ml-2 rounded-lg transition-colors" style={{ color: 'var(--text-primary)' }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                Pending Approvals
              </h1>
              {!allCaughtUp && (
                <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  Swipe right to approve, left to reject
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!allCaughtUp && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5" style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {filteredCards.length} pending
              </span>
            )}
            <button onClick={() => setSettingsOpen(true)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }}>
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Platform Filter */}
        {!isLoading && !allCaughtUp && (
          <div className="px-4 py-3 flex gap-1.5 overflow-x-auto" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            {(['All', 'Meta', 'Google', 'TikTok', 'Snap'] as Platform[]).map((p) => (
              <button
                key={p}
                onClick={() => setFilterPlatform(p)}
                className="px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all flex-shrink-0 cursor-pointer"
                style={{
                  background: filterPlatform === p ? PLATFORM_COLORS[p] : 'var(--bg-secondary)',
                  color: filterPlatform === p ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${filterPlatform === p ? PLATFORM_COLORS[p] : 'var(--border-subtle)'}`,
                }}
              >
                {p === 'All' ? 'All' : p}
              </button>
            ))}
          </div>
        )}

        {/* ==================== CONTENT ==================== */}
        <div className="flex-1 px-4 py-4 space-y-3">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <AnimatePresence mode="popLayout">
              {allCaughtUp ? (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12, delay: 0.1 }}
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                    style={{ background: 'rgba(16,185,129,0.15)' }}
                  >
                    <CheckCircle2 className="w-10 h-10" style={{ color: 'var(--status-active)' }} />
                  </motion.div>
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-xl font-space font-medium mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    All caught up!
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm mb-6"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    No pending approvals. Great job staying on top of things.
                  </motion.p>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Link to="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-white" style={{ background: 'var(--accent)', boxShadow: '0 0 30px rgba(37,99,235,0.2)' }}>
                      <LayoutDashboard className="w-4 h-4" /> Back to Dashboard
                    </Link>
                  </motion.div>
                </motion.div>
              ) : (
                filteredCards.map((card, index) => {
                  const isApproved = justApproved === card.id;
                  const isRejected = justRejected === card.id;

                  return (
                    <motion.div
                      key={card.id}
                      layout
                      initial={{ opacity: 0, y: 40 }}
                      animate={{
                        opacity: isApproved || isRejected ? 0 : 1,
                        y: isApproved ? -60 : isRejected ? 60 : 0,
                        x: isApproved ? 100 : isRejected ? -100 : 0,
                        scale: isApproved || isRejected ? 0.9 : 1,
                      }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{
                        duration: 0.4,
                        delay: isApproved || isRejected ? 0 : index * 0.06,
                        ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
                      }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.3}
                      onDragEnd={(_, info) => handleSwipe(card.id, info)}
                      className="relative select-none"
                    >
                      {/* Swipe Background Hints */}
                      <div className="absolute inset-0 flex justify-between items-center px-4 pointer-events-none">
                        <div className="w-12 h-12 rounded-full items-center justify-center hidden md:flex" style={{ background: 'rgba(16,185,129,0.2)' }}>
                          <Check className="w-6 h-6" style={{ color: 'var(--status-active)' }} />
                        </div>
                        <div className="w-12 h-12 rounded-full items-center justify-center hidden md:flex" style={{ background: 'rgba(239,68,68,0.2)' }}>
                          <X className="w-6 h-6" style={{ color: 'var(--status-error)' }} />
                        </div>
                      </div>

                      {/* Card */}
                      <div className="card-surface overflow-hidden" style={{ borderTop: `4px solid ${PLATFORM_COLORS[card.platform]}` }}>
                        {/* Top Row: Platform + Action */}
                        <div className="p-4 pb-0">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${PLATFORM_COLORS[card.platform]}15` }}>
                                {card.platform === 'Meta' && <Megaphone className="w-3.5 h-3.5" style={{ color: PLATFORM_COLORS[card.platform] }} />}
                                {card.platform === 'Google' && <TrendingUp className="w-3.5 h-3.5" style={{ color: PLATFORM_COLORS[card.platform] }} />}
                                {card.platform === 'TikTok' && <Target className="w-3.5 h-3.5" style={{ color: PLATFORM_COLORS[card.platform] }} />}
                                {card.platform === 'Snap' && <Eye className="w-3.5 h-3.5" style={{ color: PLATFORM_COLORS[card.platform] }} />}
                                {card.platform === 'All' && <ArrowRightLeft className="w-3.5 h-3.5" style={{ color: PLATFORM_COLORS[card.platform] }} />}
                              </div>
                              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{card.platform}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: `${RISK_COLORS[card.riskLevel]}15`, color: RISK_COLORS[card.riskLevel] }}>
                                {card.riskLevel} Risk
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: `${ACTION_COLORS[card.actionType]}15`, color: ACTION_COLORS[card.actionType] }}>
                                {card.actionType}
                              </span>
                            </div>
                          </div>

                          {/* Campaign Name */}
                          <h3 className="text-lg font-semibold mb-3 leading-snug" style={{ color: 'var(--text-primary)' }}>
                            {card.campaignName}
                          </h3>

                          {/* Before / After */}
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{card.before}</span>
                            <ArrowRightLeft className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                            <span className="text-sm font-bold" style={{ color: card.isIncrease === true ? 'var(--status-active)' : card.isIncrease === false ? 'var(--status-error)' : 'var(--accent)' }}>
                              {card.after}
                            </span>
                          </div>

                          {/* AI Reasoning */}
                          <div className="rounded-lg p-3 mb-3" style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.12)' }}>
                            <div className="flex items-center gap-1 mb-1">
                              <Sparkles className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                              <span className="text-[10px] font-semibold" style={{ color: 'var(--accent)' }}>AI Reasoning</span>
                            </div>
                            <p className="text-xs italic leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                              &ldquo;{card.aiReasoning}&rdquo;
                            </p>
                          </div>

                          {/* Metrics Row */}
                          <div className="flex items-center gap-3 mb-1">
                            <div className="flex items-center gap-1">
                              <BarChart3 className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
                              <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{card.confidence}% confidence</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
                              <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{card.timeAgo}</span>
                            </div>
                          </div>

                          {/* Impact + Actor */}
                          <div className="flex items-center justify-between mb-1 mt-2">
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1" style={{ background: card.impactPositive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: card.impactPositive ? 'var(--status-active)' : 'var(--status-error)' }}>
                              Est. {card.impactEstimate}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Bot className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                              <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{card.actor}</span>
                            </div>
                          </div>
                        </div>

                        {/* Expandable Details */}
                        <button onClick={() => toggleExpand(card.id)} className="w-full flex items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors" style={{ color: 'var(--text-tertiary)' }}>
                          {expandedId === card.id ? <>Hide Details <ChevronUp className="w-3 h-3" /></> : <>View Details <ChevronDown className="w-3 h-3" /></>}
                        </button>

                        <AnimatePresence>
                          {expandedId === card.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="px-4 pb-4 space-y-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                {/* Diff Table */}
                                <div className="pt-3">
                                  <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>Change Details</h4>
                                  <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                                    {card.details.diffTable.map((row, i) => (
                                      <div key={i} className="flex items-center justify-between px-3 py-2 text-[11px]" style={{ borderBottom: i < card.details.diffTable.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                                        <div className="flex items-center gap-3">
                                          <span style={{ color: 'var(--text-secondary)' }}>{row.before}</span>
                                          <ArrowRightLeft className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
                                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{row.after}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Sparkline + Stats */}
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>7-Day Trend</h4>
                                    <MiniSparkline data={card.details.sparklineData} positive={card.impactPositive} />
                                  </div>
                                  <div className="text-right space-y-1">
                                    <div>
                                      <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-tertiary)' }}>Related Drafts</h4>
                                      <span className="text-lg font-mono-data font-bold" style={{ color: 'var(--text-primary)' }}>{card.details.relatedDrafts}</span>
                                    </div>
                                    <div>
                                      <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-tertiary)' }}>Success Rate</h4>
                                      <span className="text-sm font-mono-data font-bold" style={{ color: 'var(--status-active)' }}>{card.details.successRate}%</span>
                                    </div>
                                  </div>
                                </div>

                                {/* AI Explanation */}
                                <div>
                                  <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                                    <AlertCircle className="w-3 h-3" /> Why was this suggested?
                                  </h4>
                                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{card.details.aiExplanation}</p>
                                </div>

                                {/* Similar Changes */}
                                <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'rgba(16,185,129,0.06)' }}>
                                  <Users className="w-3.5 h-3.5" style={{ color: 'var(--status-active)' }} />
                                  <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                                    <span className="font-semibold">{card.details.similarChanges}</span> similar changes made in the past 30 days
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Action Buttons - Large Touch Targets */}
                        <div className="p-3 pt-0 flex gap-2">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => settings.requireConfirmation ? setShowApproveConfirm(card.id) : handleApprove(card.id)}
                            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                            style={{ background: 'var(--status-active)', color: '#050505' }}
                          >
                            <ThumbsUp className="w-4 h-4" />
                            Approve
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => settings.requireConfirmation ? setShowRejectConfirm(card.id) : handleReject(card.id)}
                            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold border-2 transition-all active:scale-95"
                            style={{ borderColor: 'var(--status-error)', color: 'var(--status-error)', background: 'transparent' }}
                          >
                            <ThumbsDown className="w-4 h-4" />
                            Reject
                          </motion.button>
                        </div>
                      </div>

                      {/* Approve Confirmation Overlay */}
                      <AnimatePresence>
                        {showApproveConfirm === card.id && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                            style={{ background: 'rgba(0,0,0,0.7)' }}
                            onClick={(e) => { if (e.target === e.currentTarget) setShowApproveConfirm(null); }}
                          >
                            <motion.div
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.9, opacity: 0 }}
                              className="card-surface w-full max-w-sm p-6 text-center"
                            >
                              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(16,185,129,0.15)' }}>
                                <ThumbsUp className="w-7 h-7" style={{ color: 'var(--status-active)' }} />
                              </div>
                              <h3 className="font-space text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Approve this change?</h3>
                              <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{card.campaignName}</p>
                              <p className="text-xs mb-5" style={{ color: 'var(--text-tertiary)' }}>{card.before} &rarr; {card.after}</p>
                              <div className="flex gap-3">
                                <button onClick={() => setShowApproveConfirm(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border cursor-pointer" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>Cancel</button>
                                <button onClick={() => handleApprove(card.id)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer" style={{ background: 'var(--status-active)', color: '#050505' }}>Confirm Approve</button>
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Reject Confirmation Overlay */}
                      <AnimatePresence>
                        {showRejectConfirm === card.id && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                            style={{ background: 'rgba(0,0,0,0.7)' }}
                            onClick={(e) => { if (e.target === e.currentTarget) setShowRejectConfirm(null); }}
                          >
                            <motion.div
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.9, opacity: 0 }}
                              className="card-surface w-full max-w-sm p-6 text-center"
                            >
                              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.15)' }}>
                                <ThumbsDown className="w-7 h-7" style={{ color: 'var(--status-error)' }} />
                              </div>
                              <h3 className="font-space text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Reject this change?</h3>
                              <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{card.campaignName}</p>
                              <p className="text-xs mb-5" style={{ color: 'var(--text-tertiary)' }}>{card.before} &rarr; {card.after}</p>
                              <div className="flex gap-3">
                                <button onClick={() => setShowRejectConfirm(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border cursor-pointer" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>Cancel</button>
                                <button onClick={() => handleReject(card.id)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer" style={{ background: 'var(--status-error)' }}>Confirm Reject</button>
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ==================== SETTINGS SHEET ==================== */}
      <AnimatePresence>
        {settingsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSettingsOpen(false)}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.5)' }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 md:max-w-md md:mx-auto md:left-1/2 md:-translate-x-1/2 md:rounded-t-2xl"
              style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-subtle)' }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-8 h-1 rounded-full" style={{ background: 'var(--text-muted)' }} />
              </div>

              <div className="px-5 pb-8">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Approval Settings</h3>
                  <button onClick={() => setSettingsOpen(false)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-tertiary)' }}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Auto-approve budget increases</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Under 20% change</p>
                    </div>
                    <button onClick={() => setSettings((s) => ({ ...s, autoApproveBudget20: !s.autoApproveBudget20 }))} className="w-12 h-7 rounded-full relative transition-colors" style={{ background: settings.autoApproveBudget20 ? 'var(--status-active)' : 'var(--bg-hover)' }}>
                      <motion.div animate={{ x: settings.autoApproveBudget20 ? 20 : 2 }} className="absolute top-1 w-5 h-5 rounded-full bg-white shadow" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Auto-approve pauses</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>For CPA {'>'} 2x threshold</p>
                    </div>
                    <button onClick={() => setSettings((s) => ({ ...s, autoApproveCPA2x: !s.autoApproveCPA2x }))} className="w-12 h-7 rounded-full relative transition-colors" style={{ background: settings.autoApproveCPA2x ? 'var(--status-active)' : 'var(--bg-hover)' }}>
                      <motion.div animate={{ x: settings.autoApproveCPA2x ? 20 : 2 }} className="absolute top-1 w-5 h-5 rounded-full bg-white shadow" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Require confirmation</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>For all changes</p>
                    </div>
                    <button onClick={() => setSettings((s) => ({ ...s, requireConfirmation: !s.requireConfirmation }))} className="w-12 h-7 rounded-full relative transition-colors" style={{ background: settings.requireConfirmation ? 'var(--accent)' : 'var(--bg-hover)' }}>
                      <motion.div animate={{ x: settings.requireConfirmation ? 20 : 2 }} className="absolute top-1 w-5 h-5 rounded-full bg-white shadow" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {settings.notificationSound ? <Volume2 className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} /> : <VolumeX className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />}
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Notification sound</p>
                        <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>On new approvals</p>
                      </div>
                    </div>
                    <button onClick={() => setSettings((s) => ({ ...s, notificationSound: !s.notificationSound }))} className="w-12 h-7 rounded-full relative transition-colors" style={{ background: settings.notificationSound ? 'var(--accent)' : 'var(--bg-hover)' }}>
                      <motion.div animate={{ x: settings.notificationSound ? 20 : 2 }} className="absolute top-1 w-5 h-5 rounded-full bg-white shadow" />
                    </button>
                  </div>
                </div>

                <motion.button whileTap={{ scale: 0.98 }} onClick={() => setSettingsOpen(false)} className="w-full mt-6 py-3.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--accent)' }}>
                  Save Preferences
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}
