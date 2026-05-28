import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Sparkles, Copy, Check, ThumbsUp,
  Wand2, Zap, Loader2, BarChart3, Brain,
  TrendingUp, AlertTriangle, Target,
  MessageSquare, Palette, CreditCard,
  X, Trophy, Percent, Lightbulb, Image, ChevronRight,
  Film, Layers, Tag, Star, Eye, MousePointer,
  DollarSign, RefreshCw, Clock,
} from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../hooks/useToast';
import SEO from '../components/SEO';

/* ------------------------------------------------------------------ */
/*  DEMO MODE CHECK                                                   */
/* ------------------------------------------------------------------ */
const isDemo = !import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL === '';

/* ------------------------------------------------------------------ */
/*  DESIGN TOKENS                                                       */
/* ------------------------------------------------------------------ */
const C = {
  bgElevated: '#111111',
  bgHover: '#1a1a1a',
  borderSubtle: 'rgba(255,255,255,0.06)',
  textPrimary: '#FFFFFF',
  textSecondary: '#8A8F98',
  textTertiary: '#555B66',
  accent: '#2563EB',
  statusActive: '#10B981',
  statusWarning: '#F59E0B',
  statusError: '#EF4444',
  aiPurple: '#8B5CF6',
  aiPurpleGlow: 'rgba(139,92,246,0.12)',
  metaBlue: '#1877F2',
  googleRed: '#DB4437',
  tiktokCyan: '#00F2EA',
  snapYellow: '#FFFC00',
}

type StudioTab = 'analyze' | 'generate' | 'compare';
type Platform = 'Meta' | 'Google' | 'TikTok' | 'Snap';
type AssetType = 'image' | 'video' | 'carousel';

const PLATFORMS: Platform[] = ['Meta', 'Google', 'TikTok', 'Snap'];
const PLATFORM_COLORS: Record<Platform, string> = {
  Meta: C.metaBlue,
  Google: C.googleRed,
  TikTok: C.tiktokCyan,
  Snap: C.snapYellow,
};

/* ------------------------------------------------------------------ */
/*  MOCK DATA — ENRICHED CREATIVE ASSETS                                */
/* ------------------------------------------------------------------ */
interface MockCreativeAsset {
  id: string;
  name: string;
  platform: Platform;
  assetType: AssetType;
  thumbnailUrl: string;
  ctr: string;
  roas: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpa: string;
  creativeScore: number;
  aiTags: string[];
  fatigueLevel: 'low' | 'moderate' | 'high';
  engagementRate: string;
  videoCompletionRate?: string;
  frameCount?: number;
  duration?: string;
  bestPerformingFrame?: number;
}

const MOCK_ADS: MockCreativeAsset[] = [
  {
    id: 'ad-1', name: 'Summer Sale Carousel', platform: 'Meta', assetType: 'carousel',
    thumbnailUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop',
    ctr: '3.2%', roas: '4.5x', spend: 12400, impressions: 445000, clicks: 14240, conversions: 340,
    cpa: '$36.47', creativeScore: 87, aiTags: ['carousel', 'product-focus', 'sale-badge', 'bright-colors', 'ugc-style', 'summer-theme'],
    fatigueLevel: 'low', engagementRate: '4.8%', frameCount: 5, bestPerformingFrame: 2,
  },
  {
    id: 'ad-2', name: 'Flash Sale Video', platform: 'Meta', assetType: 'video',
    thumbnailUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400&h=300&fit=crop',
    ctr: '2.8%', roas: '3.9x', spend: 8200, impressions: 228000, clicks: 6384, conversions: 198,
    cpa: '$41.41', creativeScore: 78, aiTags: ['video', 'countdown-timer', 'discount-overlay', 'fast-paced', 'music-driven', 'hook-first-3s'],
    fatigueLevel: 'moderate', engagementRate: '5.2%', videoCompletionRate: '34%', duration: '0:15',
  },
  {
    id: 'ad-3', name: 'UGC Testimonial', platform: 'TikTok', assetType: 'video',
    thumbnailUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=400&h=300&fit=crop',
    ctr: '4.1%', roas: '5.2x', spend: 5600, impressions: 156000, clicks: 6396, conversions: 210,
    cpa: '$26.67', creativeScore: 94, aiTags: ['ugc', 'testimonial', 'authentic', 'voiceover', 'before-after', 'hook-first-3s', 'trending-audio'],
    fatigueLevel: 'low', engagementRate: '8.7%', videoCompletionRate: '52%', duration: '0:34',
  },
  {
    id: 'ad-4', name: 'Brand Search Ad', platform: 'Google', assetType: 'image',
    thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
    ctr: '4.5%', roas: '6.1x', spend: 15200, impressions: 312000, clicks: 14040, conversions: 584,
    cpa: '$26.03', creativeScore: 82, aiTags: ['search-ad', 'text-heavy', 'callout-extensions', 'sitelink-rich', 'brand-colors'],
    fatigueLevel: 'low', engagementRate: 'N/A',
  },
  {
    id: 'ad-5', name: 'Product Demo', platform: 'TikTok', assetType: 'video',
    thumbnailUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=300&fit=crop',
    ctr: '3.5%', roas: '4.1x', spend: 7800, impressions: 198000, clicks: 6930, conversions: 156,
    cpa: '$50.00', creativeScore: 85, aiTags: ['demo', 'product-showcase', 'tutorial-style', 'text-overlay', 'fast-cuts', 'music-sync'],
    fatigueLevel: 'moderate', engagementRate: '6.3%', videoCompletionRate: '41%', duration: '0:25',
  },
  {
    id: 'ad-6', name: 'Retargeting Static', platform: 'Meta', assetType: 'image',
    thumbnailUrl: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=400&h=300&fit=crop',
    ctr: '2.1%', roas: '3.2x', spend: 4200, impressions: 176000, clicks: 3696, conversions: 95,
    cpa: '$44.21', creativeScore: 65, aiTags: ['static-image', 'retargeting', 'discount-code', 'minimal-text', 'product-centric'],
    fatigueLevel: 'high', engagementRate: '3.1%',
  },
  {
    id: 'ad-7', name: 'Holiday Gift Guide', platform: 'Snap', assetType: 'carousel',
    thumbnailUrl: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=400&h=300&fit=crop',
    ctr: '2.4%', roas: '2.9x', spend: 3800, impressions: 142000, clicks: 3408, conversions: 78,
    cpa: '$48.72', creativeScore: 71, aiTags: ['carousel', 'holiday-theme', 'gift-idea', 'swipe-friendly', 'vertical-layout'],
    fatigueLevel: 'moderate', engagementRate: '3.6%', frameCount: 4, bestPerformingFrame: 1,
  },
  {
    id: 'ad-8', name: 'App Install Video', platform: 'Snap', assetType: 'video',
    thumbnailUrl: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=300&fit=crop',
    ctr: '3.8%', roas: '3.5x', spend: 6200, impressions: 189000, clicks: 7182, conversions: 198,
    cpa: '$31.31', creativeScore: 88, aiTags: ['app-install', 'screen-recording', 'ui-demo', 'feature-highlight', 'vertical-video'],
    fatigueLevel: 'low', engagementRate: '7.1%', videoCompletionRate: '48%', duration: '0:20',
  },
];

/* Pre-computed analysis results for demo mode */
const MOCK_ANALYZE_RESULTS: Record<string, AnalyzeResult> = {
  'ad-1': {
    fatigueScore: 28, predictedCtr: '3.5%',
    strengths: [
      'Strong hook in first 3 seconds drives high retention (72%)',
      'Color contrast draws attention in feed — bright summer palette',
      'Frame 2 (product close-up) has 18% higher swipe rate',
      'Clear product demonstration builds trust',
    ],
    weaknesses: [
      'CTA appears only on final frame — too late',
      'No social proof or testimonial element',
      'Text overlay on frame 4 may be hard to read on mobile',
    ],
    suggestions: [
      'Move CTA to frame 3 for better conversion (est. +12% CTR)',
      'Add a customer quote or star rating overlay on frame 2',
      'Increase font size by 20% for mobile readability',
      'Test opening with a question hook to boost engagement',
      'Add user-generated content snippet to frame 5',
    ],
    summary: 'This Summer Sale Carousel shows solid creative foundations with room for optimization. The fatigue risk is low — the carousel format naturally refreshes itself. Frame-level analysis shows strong mid-funnel engagement.',
  },
  'ad-2': {
    fatigueScore: 62, predictedCtr: '2.6%',
    strengths: [
      'Countdown timer creates urgency effectively',
      'Fast-paced editing matches platform expectations',
      'Discount overlay is prominent and clear',
    ],
    weaknesses: [
      'Video completion rate at 34% — below category average',
      'Audio dependency hurts mute viewers (65% of users)',
      'Fatigue signals rising — frequency >2.5x in retargeting',
    ],
    suggestions: [
      'Add captions/subtitles for mute viewing (+20% completion)',
      'Refresh opening hook with new visual angle',
      'Test 6-second cutdown for retargeting audiences',
      'Swap countdown timer for scarcity messaging ("Only 3 left")',
    ],
    summary: 'The Flash Sale Video is showing moderate fatigue signals after 3 weeks of rotation. The creative structure is sound but needs a refresh to maintain performance. Prioritize caption addition and hook variation.',
  },
  'ad-3': {
    fatigueScore: 18, predictedCtr: '4.4%',
    strengths: [
      'Authentic UGC style drives exceptional engagement (8.7%)',
      'Before/after format is highly compelling',
      'Voiceover adds credibility and emotional connection',
      '52% video completion rate — top 10% for category',
      'Trending audio boosts organic reach',
    ],
    weaknesses: [
      'Cta only appears at 28s mark — many drop before then',
      'No pinned comment with purchase link',
    ],
    suggestions: [
      'Add early soft CTA at 12s mark ("link in bio")',
      'Pin a comment with discount code and direct link',
      'Create 15s cutdown for colder audiences',
      'Repurpose best 5s as standalone hook ad',
    ],
    summary: 'This UGC Testimonial is a top-performing creative with excellent engagement and completion metrics. The fatigue risk is very low. Minor CTA timing optimization could push ROAS above 6x.',
  },
  'ad-4': {
    fatigueScore: 22, predictedCtr: '4.7%',
    strengths: [
      'Strong brand recognition drives high CTR',
      'Rich sitelink extensions improve quality score',
      'Callout extensions highlight key differentiators',
      'Consistent brand colors build trust',
    ],
    weaknesses: [
      'Limited visual differentiation from competitors',
      'No promotion extension active',
      'Headline 3 not utilizing responsive features',
    ],
    suggestions: [
      'Add promotion extension for seasonal offers',
      'Test responsive search ads with 10+ headlines',
      'Include price extension for competitive products',
    ],
    summary: 'The Brand Search Ad performs reliably with strong bottom-funnel metrics. Low fatigue risk due to intent-based targeting. Focus on extension enrichment for incremental gains.',
  },
  'ad-5': {
    fatigueScore: 55, predictedCtr: '3.3%',
    strengths: [
      'Tutorial format educates while entertaining',
      'Product showcase is clear and comprehensive',
      'Text overlays reinforce key features',
    ],
    weaknesses: [
      '41% completion rate — could be higher with tighter edit',
      'Music sync occasionally feels off-beat',
      'Frame transitions too slow for TikTok audience',
    ],
    suggestions: [
      'Trim to 15s with faster cuts (+15% completion est.)',
      'Replace music with trending audio from TikTok library',
      'Add jump cuts every 2-3s to maintain attention',
      'Overlay feature callouts with motion graphics',
    ],
    summary: 'The Product Demo has solid fundamentals but is approaching moderate fatigue. A tighter edit and audio refresh could extend its lifecycle by 2-3 weeks.',
  },
  'ad-6': {
    fatigueScore: 78, predictedCtr: '1.8%',
    strengths: [
      'Discount code is clearly visible',
      'Product-centric layout keeps focus on offer',
    ],
    weaknesses: [
      'High fatigue score — same creative running 5+ weeks',
      'Static format underperforms vs video on Meta',
      'No dynamic product feed personalization',
      'Creative looks dated compared to newer ads',
    ],
    suggestions: [
      'Urgently refresh with video or animation format',
      'Implement dynamic creative optimization (DCO)',
      'Test lifestyle imagery with product in context',
      'Add motion — even subtle animation lifts CTR 20%',
      'Create 3-5 variants for rotation to prevent future fatigue',
    ],
    summary: 'This Retargeting Static is showing high creative fatigue and needs immediate refresh. Consider transitioning to video/animation format for better retargeting performance.',
  },
  'ad-7': {
    fatigueScore: 58, predictedCtr: '2.6%',
    strengths: [
      'Holiday theme resonates with seasonal intent',
      'Swipe-friendly carousel format suits Snapchat',
      'Gift-oriented messaging aligns with audience need',
    ],
    weaknesses: [
      'Frame 1 underperforms — consider stronger opening',
      'ROAS below 3x threshold for profitability',
      'Limited product variety across frames',
    ],
    suggestions: [
      'Replace frame 1 with best-seller product',
      'Add price point to each frame for transparency',
      'Test single-image format with stronger hero shot',
      'Include "swipe up" CTA on every frame',
    ],
    summary: 'The Holiday Gift Guide shows moderate fatigue with room for improvement. Frame-level optimization and stronger opening could improve ROAS to profitable levels.',
  },
  'ad-8': {
    fatigueScore: 32, predictedCtr: '4.0%',
    strengths: [
      'Screen recording format feels authentic and native',
      'UI demo clearly shows app value proposition',
      '48% completion rate — strong for app install ads',
      'Feature highlight sequence is logical and compelling',
    ],
    weaknesses: [
      'No face or personality to build emotional connection',
      'Missing social proof (ratings, download count)',
    ],
    suggestions: [
      'Overlay App Store rating (4.8 stars) in corner',
      'Add "50K+ downloads" social proof badge',
      'Test opening with user testimonial voiceover',
      'Create feature-specific variants for audience segments',
    ],
    summary: 'The App Install Video is performing well with low fatigue risk. Adding social proof elements and segment-specific variants could push performance even higher.',
  },
};

const MOCK_COMPARE_RESULT: CompareResult = {
  winner: 'A',
  confidence: 89,
  significant: true,
  insights: [
    'Variant A has a stronger hook in the first 3 seconds (+28% retention)',
    'Variant B performs 22% better on mobile devices under 6"',
    'Both ads show declining CTR after frequency exceeds 2.5x',
    'Variant A\'s CTA placement at frame 3 drives 15% more clicks',
    'Variant B\'s color palette generates higher brand recall (+12%)',
  ],
  variantAStats: { ctr: '3.8%', roas: '4.5x', cpa: '$28' },
  variantBStats: { ctr: '3.2%', roas: '3.9x', cpa: '$34' },
};

/* ------------------------------------------------------------------ */
/*  TYPES                                                               */
/* ------------------------------------------------------------------ */
interface AnalyzeResult {
  fatigueScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  predictedCtr: string;
  summary: string;
}

interface GenerateResult {
  concept: string;
  headlines: string[];
  descriptions: string[];
  ctas: string[];
  visualDirection: string[];
}

interface CompareResult {
  winner: 'A' | 'B' | 'tie';
  confidence: number;
  significant: boolean;
  insights: string[];
  variantAStats: { ctr: string; roas: string; cpa: string };
  variantBStats: { ctr: string; roas: string; cpa: string };
}

/* ------------------------------------------------------------------ */
/*  CREDIT BADGE                                                        */
/* ------------------------------------------------------------------ */
function CreditBadge({ cost }: { cost: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: `${C.accent}15`, color: C.accent, border: `1px solid ${C.accent}30` }}
    >
      <CreditCard size={9} />
      {cost} credits
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  SKELETON CARD                                                       */
/* ------------------------------------------------------------------ */
function SkeletonCard() {
  return (
    <div className="rounded-xl p-4 animate-pulse" style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}>
      <div className="h-4 w-32 rounded mb-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="h-3 w-full rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CIRCULAR PROGRESS                                                   */
/* ------------------------------------------------------------------ */
function CircularProgress({ value, size = 80, strokeWidth = 6, color }: { value: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={color || C.accent}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <span className="absolute font-mono-data text-lg font-bold" style={{ color: C.textPrimary }}>
        {value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ASSET TYPE BADGE                                                    */
/* ------------------------------------------------------------------ */
function AssetTypeBadge({ type }: { type: AssetType }) {
  const icons = { image: Image, video: Film, carousel: Layers };
  const Icon = icons[type];
  const colors = {
    image: { bg: 'rgba(16,185,129,0.12)', text: '#10B981' },
    video: { bg: 'rgba(239,68,68,0.12)', text: '#EF4444' },
    carousel: { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B' },
  };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: colors[type].bg, color: colors[type].text }}>
      <Icon size={10} />
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  CREATIVE SCORE BADGE                                                */
/* ------------------------------------------------------------------ */
function CreativeScoreBadge({ score }: { score: number }) {
  const color = score >= 85 ? C.statusActive : score >= 70 ? C.statusWarning : C.statusError;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
      <Star size={10} />
      {score}/100
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                      */
/* ------------------------------------------------------------------ */
export default function AICreativeStudio() {
  const [activeTab, setActiveTab] = useState<StudioTab>('analyze');
  const { toast } = useToast();

  /* Credits */
  const creditsUsed = 245;
  const creditsTotal = 500;
  const creditPercent = (creditsUsed / creditsTotal) * 100;

  /* Tabs config */
  const tabs: { key: StudioTab; label: string; icon: typeof Brain }[] = [
    { key: 'analyze', label: 'Analyze', icon: Brain },
    { key: 'generate', label: 'Generate', icon: Sparkles },
    { key: 'compare', label: 'Compare', icon: BarChart3 },
  ];

  return (
    <>
    <SEO
      title="AI Creative Studio"
      description="Generate ad creatives with AI. Create compelling copy, headlines, and visual assets optimized for each platform and audience."
      keywords="AI creative studio, ad generation, AI copywriting, creative generation, ad design"
    />
    <div className="min-h-[100dvh]" style={{ background: 'var(--bg-primary)' }}>
      {/* ==================== HEADER ==================== */}
      <div className="px-6 py-6 border-b" style={{ borderColor: C.borderSubtle }}>
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-space text-[36px] font-semibold leading-tight tracking-tight" style={{ color: C.textPrimary }}>
              AI Creative Studio
            </h1>
            <p className="text-sm mt-1" style={{ color: C.textSecondary }}>
              Analyze, generate, and compare ad creatives with AI
            </p>
            {isDemo && (
              <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${C.statusWarning}15`, color: C.statusWarning, border: `1px solid ${C.statusWarning}30` }}>
                <Sparkles size={9} />
                Demo Mode — Mock Data Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-mono-data" style={{ color: C.textSecondary }}>
                  {creditsUsed} / {creditsTotal} credits
                </div>
                <div className="w-40 h-2 rounded-full mt-1 overflow-hidden" style={{ background: C.bgHover }}>
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${creditPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{
                      background: creditPercent > 80 ? C.statusWarning : `linear-gradient(90deg, ${C.accent}, ${C.aiPurple})`,
                    }}
                  />
                </div>
              </div>
            </div>
            <Link
              to="/credit-usage"
              className="text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors hover:bg-white/5"
              style={{ color: C.accent, border: `1px solid ${C.accent}30` }}
            >
              Buy Credits
            </Link>
          </div>
        </div>
      </div>

      {/* ==================== TABS ==================== */}
      <div className="max-w-[1400px] mx-auto px-6 pt-6">
        <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}>
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                background: activeTab === key ? C.accent : 'transparent',
                color: activeTab === key ? '#fff' : C.textSecondary,
                boxShadow: activeTab === key ? '0 0 20px rgba(37,99,235,0.2)' : 'none',
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ==================== TAB CONTENT ==================== */}
      <div className="max-w-[1400px] mx-auto px-6 pb-12">
        <AnimatePresence mode="wait">
          {activeTab === 'analyze' && <AnalyzeTab key="analyze" toast={toast} />}
          {activeTab === 'generate' && <GenerateTab key="generate" toast={toast} />}
          {activeTab === 'compare' && <CompareTab key="compare" toast={toast} />}
        </AnimatePresence>
      </div>
    </div>
    </>
  );
}

/* ================================================================== */
/*  ANALYZE TAB                                                       */
/* ================================================================== */
function AnalyzeTab({ toast }: { toast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void }) {
  const [selectedAd, setSelectedAd] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);

  const getDemoResult = useCallback((adId: string): AnalyzeResult => {
    return MOCK_ANALYZE_RESULTS[adId] || {
      fatigueScore: Math.round(35 + Math.random() * 40),
      predictedCtr: '2.8%',
      strengths: [
        'Strong hook in first 3 seconds drives high retention',
        'Color contrast draws attention in feed',
        'Clear product demonstration builds trust',
      ],
      weaknesses: [
        'CTA appears too late in the video',
        'No social proof or testimonial element',
        'Text overlay may be hard to read on mobile',
      ],
      suggestions: [
        'Move CTA to 5-second mark for better conversion',
        'Add a customer quote or review screenshot',
        'Increase font size by 20% for mobile readability',
        'Test opening with a question to boost engagement',
      ],
      summary: 'This ad shows solid creative foundations with room for optimization. The fatigue risk is moderate — consider refreshing within 2 weeks.',
    };
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!selectedAd) {
      toast('warning', 'Select an ad', 'Please choose an ad to analyze.');
      return;
    }
    setAnalyzing(true);
    setResult(null);

    if (isDemo) {
      await new Promise((r) => setTimeout(r, 1500));
      setResult(getDemoResult(selectedAd));
      setAnalyzing(false);
      return;
    }

    try {
      const res = await api.post('/studio/analyze', { adId: selectedAd });
      if (res.data) setResult(res.data);
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
      setResult(getDemoResult(selectedAd));
    } finally {
      setAnalyzing(false);
    }
  }, [selectedAd, toast, getDemoResult]);

  const selectedAsset = MOCK_ADS.find((a) => a.id === selectedAd);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT — Controls */}
        <div className="lg:w-[400px] flex-shrink-0">
          <div className="card-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain size={16} style={{ color: C.accent }} />
                <h3 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Ad Analysis</h3>
              </div>
              <CreditBadge cost={3} />
            </div>

            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: C.textSecondary }}>
              Select Creative Asset
            </label>
            <select
              value={selectedAd}
              onChange={(e) => { setSelectedAd(e.target.value); setResult(null); }}
              className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none transition-colors mb-4 cursor-pointer"
              style={{ background: 'var(--bg-secondary)', borderColor: C.borderSubtle, color: C.textPrimary }}
            >
              <option value="">Choose a creative asset...</option>
              {MOCK_ADS.map((ad) => (
                <option key={ad.id} value={ad.id}>
                  [{ad.platform}] {ad.name} — Score {ad.creativeScore}
                </option>
              ))}
            </select>

            {/* Asset Preview Card */}
            {selectedAsset && (
              <div className="rounded-lg overflow-hidden mb-4" style={{ border: `1px solid ${C.borderSubtle}` }}>
                <div className="relative">
                  <img
                    src={selectedAsset.thumbnailUrl}
                    alt={selectedAsset.name}
                    className="w-full h-36 object-cover"
                    loading="lazy"
                  />
                  <div className="absolute top-2 left-2 flex gap-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${PLATFORM_COLORS[selectedAsset.platform]}20`, color: PLATFORM_COLORS[selectedAsset.platform] }}>
                      {selectedAsset.platform}
                    </span>
                    <AssetTypeBadge type={selectedAsset.assetType} />
                  </div>
                  <div className="absolute top-2 right-2">
                    <CreativeScoreBadge score={selectedAsset.creativeScore} />
                  </div>
                </div>
                <div className="p-3" style={{ background: 'var(--bg-secondary)' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: C.textPrimary }}>{selectedAsset.name}</p>

                  {/* Performance mini-stats */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center">
                      <Eye size={12} className="mx-auto mb-0.5" style={{ color: C.textTertiary }} />
                      <div className="text-[10px] font-mono-data font-bold" style={{ color: C.textPrimary }}>{(selectedAsset.impressions / 1000).toFixed(0)}K</div>
                      <div className="text-[9px]" style={{ color: C.textTertiary }}>Impr.</div>
                    </div>
                    <div className="text-center">
                      <MousePointer size={12} className="mx-auto mb-0.5" style={{ color: C.textTertiary }} />
                      <div className="text-[10px] font-mono-data font-bold" style={{ color: C.textPrimary }}>{selectedAsset.ctr}</div>
                      <div className="text-[9px]" style={{ color: C.textTertiary }}>CTR</div>
                    </div>
                    <div className="text-center">
                      <DollarSign size={12} className="mx-auto mb-0.5" style={{ color: C.textTertiary }} />
                      <div className="text-[10px] font-mono-data font-bold" style={{ color: C.textPrimary }}>{selectedAsset.roas}</div>
                      <div className="text-[9px]" style={{ color: C.textTertiary }}>ROAS</div>
                    </div>
                  </div>

                  {/* AI Tags */}
                  <div className="flex flex-wrap gap-1">
                    {selectedAsset.aiTags.slice(0, 5).map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ background: C.aiPurpleGlow, color: C.aiPurple }}>
                        <Tag size={8} />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleAnalyze}
              disabled={analyzing}
              className="w-full py-3 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all"
              style={{ background: C.accent, opacity: analyzing ? 0.7 : 1, boxShadow: '0 0 30px rgba(37,99,235,0.2)' }}
            >
              {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
              {analyzing ? 'AI is analyzing...' : 'Analyze Creative'}
            </motion.button>
          </div>
        </div>

        {/* RIGHT — Results */}
        <div className="flex-1 min-w-0">
          {!result && !analyzing && (
            <div className="card-surface p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: C.aiPurpleGlow }}>
                <Brain className="w-8 h-8" style={{ color: C.aiPurple }} />
              </div>
              <h3 className="text-lg font-medium mb-1" style={{ color: C.textPrimary }}>Select a creative to analyze</h3>
              <p className="text-sm max-w-sm" style={{ color: C.textSecondary }}>
                The AI will evaluate creative fatigue, predict CTR, and suggest optimizations.
              </p>
            </div>
          )}

          {analyzing && (
            <div className="card-surface p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: C.aiPurpleGlow }}>
                <Brain className="w-6 h-6" style={{ color: C.aiPurple }} />
              </motion.div>
              <h3 className="text-lg font-medium mb-1" style={{ color: C.textPrimary }}>AI is analyzing your creative...</h3>
              <p className="text-sm" style={{ color: C.textSecondary }}>Evaluating fatigue risk, strengths, and opportunities</p>
              <div className="w-48 h-1.5 rounded-full mt-6 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${C.accent}, ${C.aiPurple})` }} animate={{ width: ['0%', '100%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
              </div>
            </div>
          )}

          {result && !analyzing && (
            <div className="space-y-4">
              {/* AI badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: C.aiPurpleGlow, color: C.aiPurple, border: `1px solid rgba(139,92,246,0.2)` }}>
                <Sparkles size={12} />
                AI-Generated Analysis {isDemo && '· Demo Mode'}
              </div>

              {/* Fatigue + Predicted CTR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="card-surface p-5 flex items-center gap-5">
                  <CircularProgress
                    value={result.fatigueScore}
                    color={result.fatigueScore > 60 ? C.statusError : result.fatigueScore > 40 ? C.statusWarning : C.statusActive}
                  />
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] block mb-1" style={{ color: C.textTertiary }}>Fatigue Risk</span>
                    <span className="text-lg font-bold" style={{ color: result.fatigueScore > 60 ? C.statusError : result.fatigueScore > 40 ? C.statusWarning : C.statusActive }}>
                      {result.fatigueScore > 60 ? 'High' : result.fatigueScore > 40 ? 'Moderate' : 'Low'}
                    </span>
                    <p className="text-xs mt-1" style={{ color: C.textSecondary }}>
                      {result.fatigueScore > 60 ? 'Refresh creative soon' : result.fatigueScore > 40 ? 'Monitor closely' : 'Performing well'}
                    </p>
                  </div>
                </div>
                <div className="card-surface p-5 flex items-center gap-5">
                  <div className="w-[80px] h-[80px] rounded-full flex items-center justify-center" style={{ background: `${C.accent}10`, border: `3px solid ${C.accent}` }}>
                    <TrendingUp size={28} style={{ color: C.accent }} />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] block mb-1" style={{ color: C.textTertiary }}>Predicted CTR</span>
                    <span className="text-2xl font-bold font-mono-data" style={{ color: C.textPrimary }}>{result.predictedCtr}</span>
                    <p className="text-xs mt-1" style={{ color: C.textSecondary }}>Based on creative analysis</p>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="card-surface p-5" style={{ background: `linear-gradient(90deg, rgba(139,92,246,0.04) 0%, ${C.bgElevated} 100%)` }}>
                <p className="text-sm leading-relaxed" style={{ color: C.textSecondary }}>{result.summary}</p>
              </div>

              {/* Strengths / Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card-surface p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <ThumbsUp size={14} style={{ color: C.statusActive }} />
                    <h4 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Strengths</h4>
                  </div>
                  <ul className="space-y-2">
                    {result.strengths.map((s, i) => (
                      <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="flex items-start gap-2 text-sm" style={{ color: C.textSecondary }}>
                        <Check size={14} className="mt-0.5 flex-shrink-0" style={{ color: C.statusActive }} />
                        {s}
                      </motion.li>
                    ))}
                  </ul>
                </div>
                <div className="card-surface p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={14} style={{ color: C.statusWarning }} />
                    <h4 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Weaknesses</h4>
                  </div>
                  <ul className="space-y-2">
                    {result.weaknesses.map((w, i) => (
                      <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="flex items-start gap-2 text-sm" style={{ color: C.textSecondary }}>
                        <X size={14} className="mt-0.5 flex-shrink-0" style={{ color: C.statusWarning }} />
                        {w}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Suggestions */}
              <div className="card-surface p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb size={14} style={{ color: C.aiPurple }} />
                  <h4 className="text-sm font-semibold" style={{ color: C.textPrimary }}>AI Suggestions</h4>
                </div>
                <div className="space-y-3">
                  {result.suggestions.map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-start gap-3 p-3 rounded-lg"
                      style={{ background: C.bgHover, borderLeft: `3px solid ${C.aiPurple}` }}
                    >
                      <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: C.aiPurpleGlow, color: C.aiPurple }}>
                        {i + 1}
                      </span>
                      <p className="text-sm" style={{ color: C.textSecondary }}>{s}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/*  GENERATE TAB                                                      */
/* ================================================================== */
function GenerateTab({ toast }: { toast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void }) {
  const [objective, setObjective] = useState('');
  const [audience, setAudience] = useState('');
  const [platform, setPlatform] = useState<Platform>('Meta');
  const [brandGuidelines, setBrandGuidelines] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const getDemoResult = useCallback((obj: string, aud: string, plat: Platform): GenerateResult => {
    const objectiveMap: Record<string, { concept: string; headlines: string[]; descriptions: string[]; ctas: string[]; visualDirection: string[] }> = {
      conversions: {
        concept: `A conversion-optimized campaign for ${plat} targeting ${aud}. The creative leverages urgency, social proof, and a clear value proposition to drive immediate purchase action. Focus on bottom-funnel messaging with retargeting-friendly formats.`,
        headlines: [
          'Transform Your Results in Just 30 Days',
          'Join 10,000+ Happy Customers Today',
          "Don't Miss Out: Limited Time Offer Inside",
          'The Secret to Effortless Success Is Here',
          'See Why 4.9/5 Customers Recommend Us',
        ],
        descriptions: [
          'Discover how our solution helps you achieve your goals faster and easier than ever before. Start your journey today.',
          'Trusted by thousands. Proven results. Backed by our 30-day satisfaction guarantee. See the difference for yourself.',
          'Simple, effective, and designed for you. Take the first step toward transforming your experience.',
        ],
        ctas: ['Shop Now', 'Learn More', 'Get Started', 'Claim Your Offer'],
        visualDirection: [
          `Bright, authentic UGC aesthetic with real people using the product — optimized for ${plat}`,
          'Warm color palette (orange-to-pink gradient) for energy and optimism',
          '15-30 second video format with product demonstration in first 3 seconds',
          'Clean text overlays with large, bold typography for mobile readability',
          'Include customer faces for trust — close-up testimonials perform 40% better',
        ],
      },
      awareness: {
        concept: `A brand awareness campaign for ${plat} designed to introduce the brand to ${aud}. The creative prioritizes emotional storytelling, brand recall, and shareability over direct response. Focus on memorable visual identity and narrative hook.`,
        headlines: [
          'Meet the Brand Changing Everything',
          'This Is Just the Beginning',
          'What If Everything Could Be Different?',
          'Discover What Millions Already Love',
        ],
        descriptions: [
          "We're on a mission to redefine what's possible. Follow along and see why people everywhere are making the switch.",
          'A new standard in quality and innovation. Experience the difference that thoughtful design makes.',
          'Join a growing community of forward-thinkers who refuse to settle for ordinary.',
        ],
        ctas: ['Learn More', 'Follow Us', 'Discover', 'Watch Now'],
        visualDirection: [
          'Cinematic, slow-motion product shots with dramatic lighting',
          'Brand color palette dominant — consistent visual identity across frames',
          '30-60 second storytelling format with emotional arc',
          'Minimal text overlays — let visuals speak',
          'Include brand logo watermark for recall reinforcement',
        ],
      },
      traffic: {
        concept: `A traffic-driving campaign for ${plat} targeting ${aud}. The creative uses curiosity gaps, listicle formats, and clear value exchange to maximize click-through rate. Every element optimized for the swipe/click action.`,
        headlines: [
          '7 Secrets You Need to Know ( #3 Will Shock You )',
          'The Ultimate Guide Is Here — Free Access',
          'Stop Scrolling — This Changes Everything',
          'Read This Before You Make Your Next Move',
        ],
        descriptions: [
          'Everything you need to know, all in one place. Click through for the full breakdown — no email required.',
          'The resource that thousands are reading right now. See what the buzz is about.',
        ],
        ctas: ['Read Now', 'Get Access', 'See Inside', 'Click to Learn'],
        visualDirection: [
          'Bold, high-contrast thumbnail style with large numbers',
          'Listicle format optimized for feed scrolling',
          'Use arrow graphics pointing to CTA area',
          'Bright background colors to stand out in feed',
        ],
      },
      engagement: {
        concept: `An engagement-first campaign for ${plat} targeting ${aud}. The creative invites participation through polls, questions, and shareable moments. Designed to trigger comments, shares, and saves — boosting algorithmic reach.`,
        headlines: [
          'Tag Someone Who Needs to See This',
          'Drop a Comment If You Agree',
          'Save This for Later — You\'ll Thank Us',
          'Which One Would You Choose? A or B?',
        ],
        descriptions: [
          'Double-tap if this resonates with you! Share your thoughts in the comments — we read every single one.',
          'Save this post for the next time you need inspiration. Your future self will appreciate it.',
        ],
        ctas: ['Comment Now', 'Share This', 'Save Post', 'Vote Here'],
        visualDirection: [
          'Interactive-style layouts with poll overlays',
          'Relatable, meme-inspired imagery for ${plat} culture',
          'Split-screen "A vs B" comparison format',
          'Bright, thumb-stopping colors with emoji accents',
        ],
      },
      leads: {
        concept: `A lead generation campaign for ${plat} targeting ${aud}. The creative builds authority and trust through educational content, then offers a high-value resource in exchange for contact information. Focus on value-first messaging.`,
        headlines: [
          'Get Your Free [Resource] — Limited Spots',
          'Download the Guide 500+ Marketers Swear By',
          '5 Strategies That Changed Everything [Free PDF]',
          'Join the Masterclass — Register Free Today',
        ],
        descriptions: [
          'Get instant access to the strategies top performers use every day. No credit card required — just value.',
          'This free guide breaks down exactly what works, backed by real data and case studies.',
        ],
        ctas: ['Download Free', 'Register Now', 'Get Access', 'Sign Up Free'],
        visualDirection: [
          'Clean, professional design with authority signals',
          'Mockup of the lead magnet (PDF, checklist, template)',
          'Text overlay: "FREE" in bold for attention',
          'Trust badges: no spam, instant download, 100% free',
        ],
      },
      app_installs: {
        concept: `An app install campaign for ${plat} targeting ${aud}. The creative showcases the app interface, key features, and user benefits through screen recordings and real usage scenarios. Focus on demonstrating value in under 15 seconds.`,
        headlines: [
          'Your New Favorite App — Download Free',
          'See Why We\'re #1 on the App Store',
          'Get More Done in Less Time [Free Download]',
          'Join 1M+ Users — Download Today',
        ],
        descriptions: [
          'Available on iOS and Android. Free to download, premium features unlocked. See what everyone is talking about.',
          'The highest-rated app in its category. Download now and experience the difference.',
        ],
        ctas: ['Download Now', 'Get the App', 'Install Free', 'Try It Now'],
        visualDirection: [
          'Screen recording with smooth finger gestures overlay',
          'App Store badge and 5-star rating prominently displayed',
          'Feature callouts with motion graphics (swipe, tap, scroll)',
          'User reaction clips interspersed with app demo',
          'End card with clear App Store / Google Play buttons',
        ],
      },
    };

    const mapped = objectiveMap[obj] || objectiveMap.conversions;

    return {
      concept: mapped.concept,
      headlines: mapped.headlines,
      descriptions: mapped.descriptions,
      ctas: mapped.ctas,
      visualDirection: mapped.visualDirection,
    };
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!objective || !audience) {
      toast('warning', 'Fill required fields', 'Campaign Objective and Target Audience are required.');
      return;
    }
    setGenerating(true);
    setResult(null);

    if (isDemo) {
      await new Promise((r) => setTimeout(r, 1800));
      setResult(getDemoResult(objective, audience, platform));
      setGenerating(false);
      return;
    }

    try {
      const res = await api.post('/studio/generate', { objective, audience, platform, brandGuidelines });
      if (res.data) setResult(res.data);
    } catch {
      await new Promise((r) => setTimeout(r, 2500));
      setResult(getDemoResult(objective, audience, platform));
    } finally {
      setGenerating(false);
    }
  }, [objective, audience, platform, brandGuidelines, toast, getDemoResult]);

  const copyToClipboard = useCallback(async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast('success', 'Copied to clipboard');
    setTimeout(() => setCopiedIndex(null), 2000);
  }, [toast]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT — Form */}
        <div className="lg:w-[420px] flex-shrink-0">
          <div className="card-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} style={{ color: C.accent }} />
                <h3 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Generate Brief</h3>
              </div>
              <CreditBadge cost={6} />
            </div>

            {/* Campaign Objective */}
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: C.textSecondary }}>
              Campaign Objective *
            </label>
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none transition-colors mb-4 cursor-pointer"
              style={{ background: 'var(--bg-secondary)', borderColor: C.borderSubtle, color: C.textPrimary }}
            >
              <option value="">Select objective...</option>
              <option value="conversions">Conversions / Sales</option>
              <option value="awareness">Brand Awareness</option>
              <option value="traffic">Website Traffic</option>
              <option value="engagement">Engagement</option>
              <option value="leads">Lead Generation</option>
              <option value="app_installs">App Installs</option>
            </select>

            {/* Target Audience */}
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: C.textSecondary }}>
              Target Audience *
            </label>
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g., Women 25-34, US, interested in fitness"
              className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none transition-colors mb-4"
              style={{ background: 'var(--bg-secondary)', borderColor: C.borderSubtle, color: C.textPrimary }}
            />

            {/* Platform */}
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: C.textSecondary }}>
              Platform
            </label>
            <div className="flex flex-wrap gap-2 mb-4">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-150 border"
                  style={{
                    background: platform === p ? `${PLATFORM_COLORS[p]}15` : 'transparent',
                    borderColor: platform === p ? `${PLATFORM_COLORS[p]}40` : C.borderSubtle,
                    color: platform === p ? PLATFORM_COLORS[p] : C.textSecondary,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Brand Guidelines */}
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: C.textSecondary }}>
              Brand Guidelines
            </label>
            <textarea
              value={brandGuidelines}
              onChange={(e) => setBrandGuidelines(e.target.value)}
              placeholder="Tone, colors, messaging rules, do's and don'ts..."
              rows={4}
              className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none transition-colors resize-none mb-4"
              style={{ background: 'var(--bg-secondary)', borderColor: C.borderSubtle, color: C.textPrimary }}
            />

            {/* Generate */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-3 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all"
              style={{ background: C.accent, opacity: generating ? 0.7 : 1, boxShadow: '0 0 30px rgba(37,99,235,0.2)' }}
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              {generating ? 'AI is thinking...' : 'Generate Brief'}
            </motion.button>
          </div>
        </div>

        {/* RIGHT — Results */}
        <div className="flex-1 min-w-0">
          {!result && !generating && (
            <div className="card-surface p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: C.aiPurpleGlow }}>
                <Sparkles className="w-8 h-8" style={{ color: C.aiPurple }} />
              </div>
              <h3 className="text-lg font-medium mb-1" style={{ color: C.textPrimary }}>Your creative brief will appear here</h3>
              <p className="text-sm max-w-sm" style={{ color: C.textSecondary }}>
                Fill in the campaign details and click Generate to create an AI-powered creative brief.
              </p>
              {isDemo && (
                <p className="text-xs mt-3 px-3 py-1 rounded-full" style={{ background: `${C.statusWarning}10`, color: C.statusWarning }}>
                  Demo Mode: Using AI-generated mock briefs
                </p>
              )}
            </div>
          )}

          {generating && (
            <div className="card-surface p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: C.aiPurpleGlow }}>
                <Sparkles className="w-6 h-6" style={{ color: C.aiPurple }} />
              </motion.div>
              <h3 className="text-lg font-medium mb-1" style={{ color: C.textPrimary }}>AI is generating your brief...</h3>
              <p className="text-sm" style={{ color: C.textSecondary }}>Crafting headlines, descriptions, and visual direction</p>
              <div className="w-48 h-1.5 rounded-full mt-6 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${C.accent}, ${C.aiPurple})` }} animate={{ width: ['0%', '100%'] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }} />
              </div>
            </div>
          )}

          {result && !generating && (
            <div className="space-y-4">
              {/* AI badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: C.aiPurpleGlow, color: C.aiPurple, border: `1px solid rgba(139,92,246,0.2)` }}>
                <Sparkles size={12} />
                AI-Generated Creative Brief · {platform}
                {isDemo && <span className="opacity-60">· Demo</span>}
              </div>

              {/* Concept */}
              <div className="card-surface p-5" style={{ background: `linear-gradient(90deg, rgba(139,92,246,0.04) 0%, ${C.bgElevated} 100%)` }}>
                <div className="flex items-center gap-2 mb-3">
                  <Target size={14} style={{ color: C.aiPurple }} />
                  <h4 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Concept</h4>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: C.textSecondary }}>{result.concept}</p>
              </div>

              {/* Headlines */}
              <div className="card-surface p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare size={14} style={{ color: C.accent }} />
                  <h4 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Headlines</h4>
                </div>
                <div className="space-y-2">
                  {result.headlines.map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg group hover:bg-white/[0.02] transition-colors"
                      style={{ background: C.bgHover }}
                    >
                      <p className="text-sm font-medium" style={{ color: C.textPrimary }}>{h}</p>
                      <button
                        onClick={() => copyToClipboard(h, i)}
                        className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: C.textTertiary }}
                      >
                        {copiedIndex === i ? <Check size={14} style={{ color: C.statusActive }} /> : <Copy size={14} />}
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Descriptions */}
              <div className="card-surface p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare size={14} style={{ color: C.statusActive }} />
                  <h4 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Descriptions</h4>
                </div>
                <div className="space-y-2">
                  {result.descriptions.map((d, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.06 }}
                      className="flex items-start justify-between gap-3 p-3 rounded-lg group hover:bg-white/[0.02] transition-colors"
                      style={{ background: C.bgHover }}
                    >
                      <p className="text-sm" style={{ color: C.textSecondary }}>{d}</p>
                      <button
                        onClick={() => copyToClipboard(d, 100 + i)}
                        className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        style={{ color: C.textTertiary }}
                      >
                        {copiedIndex === 100 + i ? <Check size={14} style={{ color: C.statusActive }} /> : <Copy size={14} />}
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* CTAs */}
              <div className="card-surface p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={14} style={{ color: C.statusWarning }} />
                  <h4 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Call-to-Actions</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.ctas.map((cta, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.06 }}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer hover:scale-105 transition-transform"
                      style={{ background: `${C.accent}15`, color: C.accent, border: `1px solid ${C.accent}30` }}
                      onClick={() => copyToClipboard(cta, 200 + i)}
                    >
                      {copiedIndex === 200 + i ? 'Copied!' : cta}
                    </motion.span>
                  ))}
                </div>
              </div>

              {/* Visual Direction */}
              <div className="card-surface p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Palette size={14} style={{ color: C.aiPurple }} />
                  <h4 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Visual Direction</h4>
                </div>
                <div className="space-y-2">
                  {result.visualDirection.map((v, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.06 }}
                      className="flex items-start gap-2 text-sm"
                      style={{ color: C.textSecondary }}
                    >
                      <ChevronRight size={14} className="mt-0.5 flex-shrink-0" style={{ color: C.aiPurple }} />
                      {v}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/*  COMPARE TAB                                                       */
/* ================================================================== */
function CompareTab({ toast }: { toast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void }) {
  const [variantA, setVariantA] = useState('');
  const [variantB, setVariantB] = useState('');
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);

  const handleCompare = useCallback(async () => {
    if (!variantA || !variantB) {
      toast('warning', 'Select both variants', 'Please choose Variant A and Variant B to compare.');
      return;
    }
    if (variantA === variantB) {
      toast('warning', 'Same variant selected', 'Choose two different ads to compare.');
      return;
    }
    setComparing(true);
    setResult(null);

    if (isDemo) {
      await new Promise((r) => setTimeout(r, 1600));
      const a = MOCK_ADS.find((ad) => ad.id === variantA);
      const b = MOCK_ADS.find((ad) => ad.id === variantB);
      setResult({
        ...MOCK_COMPARE_RESULT,
        winner: (a?.creativeScore || 0) > (b?.creativeScore || 0) ? 'A' : (a?.creativeScore || 0) < (b?.creativeScore || 0) ? 'B' : 'tie',
        confidence: Math.round(75 + Math.random() * 20),
        variantAStats: { ctr: a?.ctr || '3.2%', roas: a?.roas || '3.9x', cpa: a?.cpa || '$32' },
        variantBStats: { ctr: b?.ctr || '2.8%', roas: b?.roas || '3.5x', cpa: b?.cpa || '$38' },
      });
      setComparing(false);
      return;
    }

    try {
      const res = await api.post('/studio/compare', { variantA, variantB });
      if (res.data) setResult(res.data);
    } catch {
      await new Promise((r) => setTimeout(r, 2200));
      const a = MOCK_ADS.find((ad) => ad.id === variantA);
      const b = MOCK_ADS.find((ad) => ad.id === variantB);
      setResult({
        ...MOCK_COMPARE_RESULT,
        winner: (a?.creativeScore || 0) > (b?.creativeScore || 0) ? 'A' : (a?.creativeScore || 0) < (b?.creativeScore || 0) ? 'B' : 'tie',
        variantAStats: { ctr: a?.ctr || '3.2%', roas: a?.roas || '3.9x', cpa: a?.cpa || '$32' },
        variantBStats: { ctr: b?.ctr || '2.8%', roas: b?.roas || '3.5x', cpa: b?.cpa || '$38' },
      });
    } finally {
      setComparing(false);
    }
  }, [variantA, variantB, toast]);

  const getAdName = (id: string) => MOCK_ADS.find((a) => a.id === id)?.name || id;
  const getAdPlatform = (id: string) => MOCK_ADS.find((a) => a.id === id)?.platform || 'Meta';
  const getAdScore = (id: string) => MOCK_ADS.find((a) => a.id === id)?.creativeScore || 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT — Controls */}
        <div className="lg:w-[400px] flex-shrink-0">
          <div className="card-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} style={{ color: C.accent }} />
                <h3 className="text-sm font-semibold" style={{ color: C.textPrimary }}>A/B Analysis</h3>
              </div>
              <CreditBadge cost={4} />
            </div>

            {/* Variant A */}
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: C.textSecondary }}>
              Variant A
            </label>
            <select
              value={variantA}
              onChange={(e) => setVariantA(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none transition-colors mb-4 cursor-pointer"
              style={{ background: 'var(--bg-secondary)', borderColor: C.borderSubtle, color: C.textPrimary }}
            >
              <option value="">Choose creative...</option>
              {MOCK_ADS.map((ad) => (
                <option key={ad.id} value={ad.id}>[{ad.platform}] {ad.name} — Score {ad.creativeScore}</option>
              ))}
            </select>

            {/* Variant B */}
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: C.textSecondary }}>
              Variant B
            </label>
            <select
              value={variantB}
              onChange={(e) => setVariantB(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none transition-colors mb-4 cursor-pointer"
              style={{ background: 'var(--bg-secondary)', borderColor: C.borderSubtle, color: C.textPrimary }}
            >
              <option value="">Choose creative...</option>
              {MOCK_ADS.map((ad) => (
                <option key={ad.id} value={ad.id}>[{ad.platform}] {ad.name} — Score {ad.creativeScore}</option>
              ))}
            </select>

            {/* Preview */}
            {(variantA || variantB) && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {variantA && (
                  <div className="rounded-lg p-3 text-center" style={{ background: `${C.accent}08`, border: `1px solid ${C.accent}20` }}>
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${PLATFORM_COLORS[getAdPlatform(variantA)]}20`, color: PLATFORM_COLORS[getAdPlatform(variantA)] }}>
                        {getAdPlatform(variantA)}
                      </span>
                    </div>
                    <p className="text-xs font-medium mt-1 truncate" style={{ color: C.textPrimary }}>{getAdName(variantA)}</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Star size={9} style={{ color: C.statusWarning }} />
                      <span className="text-[10px] font-mono-data font-bold" style={{ color: C.statusWarning }}>{getAdScore(variantA)}</span>
                    </div>
                    <span className="text-[10px]" style={{ color: C.textTertiary }}>Variant A</span>
                  </div>
                )}
                {variantB && (
                  <div className="rounded-lg p-3 text-center" style={{ background: `${C.aiPurple}08`, border: `1px solid ${C.aiPurple}20` }}>
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${PLATFORM_COLORS[getAdPlatform(variantB)]}20`, color: PLATFORM_COLORS[getAdPlatform(variantB)] }}>
                        {getAdPlatform(variantB)}
                      </span>
                    </div>
                    <p className="text-xs font-medium mt-1 truncate" style={{ color: C.textPrimary }}>{getAdName(variantB)}</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Star size={9} style={{ color: C.aiPurple }} />
                      <span className="text-[10px] font-mono-data font-bold" style={{ color: C.aiPurple }}>{getAdScore(variantB)}</span>
                    </div>
                    <span className="text-[10px]" style={{ color: C.textTertiary }}>Variant B</span>
                  </div>
                )}
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleCompare}
              disabled={comparing}
              className="w-full py-3 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all"
              style={{ background: C.accent, opacity: comparing ? 0.7 : 1, boxShadow: '0 0 30px rgba(37,99,235,0.2)' }}
            >
              {comparing ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />}
              {comparing ? 'Analyzing...' : 'Analyze A/B Test'}
            </motion.button>
          </div>
        </div>

        {/* RIGHT — Results */}
        <div className="flex-1 min-w-0">
          {!result && !comparing && (
            <div className="card-surface p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: C.aiPurpleGlow }}>
                <BarChart3 className="w-8 h-8" style={{ color: C.aiPurple }} />
              </div>
              <h3 className="text-lg font-medium mb-1" style={{ color: C.textPrimary }}>Compare two creative variants</h3>
              <p className="text-sm max-w-sm" style={{ color: C.textSecondary }}>
                Select Variant A and Variant B to get AI-powered insights on which performs better and why.
              </p>
              {isDemo && (
                <p className="text-xs mt-3 px-3 py-1 rounded-full" style={{ background: `${C.statusWarning}10`, color: C.statusWarning }}>
                  Demo Mode: Using mock comparison data
                </p>
              )}
            </div>
          )}

          {comparing && (
            <div className="card-surface p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: C.aiPurpleGlow }}>
                <BarChart3 className="w-6 h-6" style={{ color: C.aiPurple }} />
              </motion.div>
              <h3 className="text-lg font-medium mb-1" style={{ color: C.textPrimary }}>AI is comparing variants...</h3>
              <p className="text-sm" style={{ color: C.textSecondary }}>Analyzing performance data and statistical significance</p>
              <div className="w-48 h-1.5 rounded-full mt-6 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${C.accent}, ${C.aiPurple})` }} animate={{ width: ['0%', '100%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
              </div>
            </div>
          )}

          {result && !comparing && (
            <div className="space-y-4">
              {/* AI badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: C.aiPurpleGlow, color: C.aiPurple, border: `1px solid rgba(139,92,246,0.2)` }}>
                <Sparkles size={12} />
                AI-Generated Comparison
                {isDemo && <span className="opacity-60">· Demo</span>}
              </div>

              {/* Winner banner */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-surface p-6 text-center"
                style={{
                  background: result.winner === 'A'
                    ? `linear-gradient(135deg, ${C.accent}15, ${C.bgElevated})`
                    : result.winner === 'B'
                      ? `linear-gradient(135deg, ${C.aiPurple}15, ${C.bgElevated})`
                      : C.bgElevated,
                  border: `1px solid ${result.winner === 'A' ? `${C.accent}30` : result.winner === 'B' ? `${C.aiPurple}30` : C.borderSubtle}`,
                }}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Trophy size={20} style={{ color: result.winner !== 'tie' ? C.statusActive : C.textSecondary }} />
                  <h3 className="text-lg font-bold" style={{ color: C.textPrimary }}>
                    {result.winner === 'tie' ? 'No Clear Winner' : `Winner: Variant ${result.winner}`}
                  </h3>
                </div>
                <div className="flex items-center justify-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5">
                    <Percent size={14} style={{ color: C.accent }} />
                    <span className="text-sm font-mono-data font-bold" style={{ color: C.textPrimary }}>{result.confidence}% confidence</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {result.significant ? (
                      <>
                        <Check size={14} style={{ color: C.statusActive }} />
                        <span className="text-sm font-semibold" style={{ color: C.statusActive }}>Statistically Significant</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={14} style={{ color: C.statusWarning }} />
                        <span className="text-sm font-semibold" style={{ color: C.statusWarning }}>Not Significant</span>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Stats comparison */}
              <div className="grid grid-cols-3 gap-3">
                <div className="card-surface p-4 text-center">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.06em] block mb-2" style={{ color: C.textTertiary }}>CTR</span>
                  <div className="flex items-center justify-center gap-3">
                    <div>
                      <div className="font-mono-data text-sm font-bold" style={{ color: C.accent }}>{result.variantAStats.ctr}</div>
                      <div className="text-[10px]" style={{ color: C.textTertiary }}>A</div>
                    </div>
                    <span style={{ color: C.textTertiary }}>vs</span>
                    <div>
                      <div className="font-mono-data text-sm font-bold" style={{ color: C.aiPurple }}>{result.variantBStats.ctr}</div>
                      <div className="text-[10px]" style={{ color: C.textTertiary }}>B</div>
                    </div>
                  </div>
                </div>
                <div className="card-surface p-4 text-center">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.06em] block mb-2" style={{ color: C.textTertiary }}>ROAS</span>
                  <div className="flex items-center justify-center gap-3">
                    <div>
                      <div className="font-mono-data text-sm font-bold" style={{ color: C.accent }}>{result.variantAStats.roas}</div>
                      <div className="text-[10px]" style={{ color: C.textTertiary }}>A</div>
                    </div>
                    <span style={{ color: C.textTertiary }}>vs</span>
                    <div>
                      <div className="font-mono-data text-sm font-bold" style={{ color: C.aiPurple }}>{result.variantBStats.roas}</div>
                      <div className="text-[10px]" style={{ color: C.textTertiary }}>B</div>
                    </div>
                  </div>
                </div>
                <div className="card-surface p-4 text-center">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.06em] block mb-2" style={{ color: C.textTertiary }}>CPA</span>
                  <div className="flex items-center justify-center gap-3">
                    <div>
                      <div className="font-mono-data text-sm font-bold" style={{ color: C.accent }}>{result.variantAStats.cpa}</div>
                      <div className="text-[10px]" style={{ color: C.textTertiary }}>A</div>
                    </div>
                    <span style={{ color: C.textTertiary }}>vs</span>
                    <div>
                      <div className="font-mono-data text-sm font-bold" style={{ color: C.aiPurple }}>{result.variantBStats.cpa}</div>
                      <div className="text-[10px]" style={{ color: C.textTertiary }}>B</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Insights */}
              <div className="card-surface p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb size={14} style={{ color: C.aiPurple }} />
                  <h4 className="text-sm font-semibold" style={{ color: C.textPrimary }}>AI Insights</h4>
                </div>
                <div className="space-y-3">
                  {result.insights.map((insight, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-start gap-3 p-3 rounded-lg"
                      style={{ background: C.bgHover, borderLeft: `3px solid ${i % 2 === 0 ? C.accent : C.aiPurple}` }}
                    >
                      <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: i % 2 === 0 ? `${C.accent}15` : C.aiPurpleGlow, color: i % 2 === 0 ? C.accent : C.aiPurple }}>
                        {i + 1}
                      </span>
                      <p className="text-sm" style={{ color: C.textSecondary }}>{insight}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
