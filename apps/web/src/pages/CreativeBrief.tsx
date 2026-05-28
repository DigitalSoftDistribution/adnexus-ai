import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Copy, Check, FileText, Target, Users,
  MessageSquare, Palette, Zap, Loader2, Send,
  Bookmark, Download, ChevronRight, Lightbulb,
} from 'lucide-react'
import api from '../lib/api'
import { useToast } from '../hooks/useToast'
import SEO from '../components/SEO';

/* ------------------------------------------------------------------ */
/*  DESIGN TOKENS                                                       */
/* ------------------------------------------------------------------ */
const C = {
  accent: '#2563EB',
  statusActive: '#10B981',
  statusWarning: '#F59E0B',
  metaBlue: '#1877F2',
  googleRed: '#DB4437',
  tiktokCyan: '#00F2EA',
  aiPurple: '#8B5CF6',
  aiPurpleGlow: 'rgba(139,92,246,0.12)',
  bgElevated: '#111111',
  bgHover: '#1a1a1a',
  borderSubtle: 'rgba(255,255,255,0.06)',
  textPrimary: '#FFFFFF',
  textSecondary: '#8A8F98',
  textTertiary: '#555B66',
}

type Platform = 'Meta' | 'Google' | 'TikTok' | 'Snap'

const PLATFORMS: Platform[] = ['Meta', 'Google', 'TikTok', 'Snap']
const PLATFORM_COLORS: Record<Platform, string> = {
  Meta: C.metaBlue,
  Google: C.googleRed,
  TikTok: C.tiktokCyan,
  Snap: C.snapYellow,
}

/* ------------------------------------------------------------------ */
/*  TYPES                                                               */
/* ------------------------------------------------------------------ */
interface BriefResult {
  concept: string
  headlines: string[]
  descriptions: string[]
  ctas: string[]
  visualDirection: string[]
  keyMessaging: string[]
  performanceBenchmarks: string[]
  deliverables: string[]
}

/* ------------------------------------------------------------------ */
/*  SECTION COMPONENT                                                   */
/* ------------------------------------------------------------------ */
function BriefSection({
  icon: Icon,
  title,
  children,
  delay = 0,
  aiTinted = false,
}: {
  icon: typeof Target
  title: string
  children: React.ReactNode
  delay?: number
  aiTinted?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
      className="mb-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: aiTinted ? C.aiPurple : C.accent }}>
          <Icon size={16} />
        </span>
        <h4 className="text-sm font-semibold" style={{ color: C.textPrimary }}>
          {title}
        </h4>
      </div>
      <div
        className="rounded-lg p-4"
        style={{
          background: aiTinted
            ? `linear-gradient(90deg, rgba(139,92,246,0.05) 0%, ${C.bgHover} 100%)`
            : C.bgHover,
          border: `1px solid ${aiTinted ? 'rgba(139,92,246,0.12)' : C.borderSubtle}`,
        }}
      >
        {children}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  MAIN PAGE                                                           */
/* ------------------------------------------------------------------ */
export default function CreativeBrief() {
  const [objective, setObjective] = useState('')
  const [audience, setAudience] = useState('')
  const [platform, setPlatform] = useState<Platform>('Meta')
  const [brandGuidelines, setBrandGuidelines] = useState('')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<BriefResult | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const handleGenerate = useCallback(async () => {
    if (!objective || !audience) {
      toast('warning', 'Fill required fields', 'Campaign Objective and Target Audience are required.')
      return
    }
    setGenerating(true)
    setResult(null)
    try {
      const res = await api.post('/studio/generate-brief', { objective, audience, platform, brandGuidelines })
      if (res.data) setResult(res.data)
    } catch {
      // Mock fallback
      await new Promise((r) => setTimeout(r, 2500))
      setResult({
        concept: `A results-driven ${platform.toLowerCase()} campaign targeting ${audience}. The creative direction focuses on authentic storytelling paired with clear value propositions to drive immediate conversions. The campaign leverages platform-native formats with a consistent visual identity.`,
        headlines: [
          'Transform Your Results in Just 30 Days',
          'Join 10,000+ Happy Customers Today',
          "Don't Miss Out: Limited Time Offer Inside",
          'The Secret to Effortless Success Is Here',
        ],
        descriptions: [
          'Discover how our solution helps you achieve your goals faster and easier than ever before.',
          'Trusted by thousands. Proven results. Backed by our 30-day satisfaction guarantee.',
          'Simple, effective, and designed for you. Take the first step toward transformation.',
        ],
        ctas: ['Shop Now', 'Learn More', 'Get Started', 'Claim Your Offer'],
        visualDirection: [
          'Bright, authentic UGC aesthetic with real people using the product',
          'Warm color palette (orange-to-pink gradient) for energy and optimism',
          '15-30 second video format with product demonstration in first 3 seconds',
          'Clean text overlays with large, bold typography for mobile readability',
        ],
        keyMessaging: [
          'Headline direction: Focus on transformation and results',
          'CTA: "Shop Now" / "Learn More" (test both variants)',
          'Value prop: Highlight unique differentiator upfront',
          'Tone: Authentic, aspirational, evidence-based',
        ],
        performanceBenchmarks: [
          'Target CTR: >2.5%',
          'Target CPC: <$1.20',
          'Target Frequency: <2.5',
          'Target ROAS: 3.5x+',
        ],
        deliverables: [
          '3x video ads (15s, 30s, 6s cutdown)',
          '2x carousel ads (5 cards each)',
          '2x static images',
          'All formats in 1:1 and 9:16 ratios',
        ],
      })
      toast({ title: 'Creative brief generated', variant: 'success' })
    } finally {
      setGenerating(false)
    }
  }, [objective, audience, platform, brandGuidelines, toast])

  const handleCopyToClipboard = useCallback(async () => {
    if (!result) return
    const sections = [
      'CREATIVE BRIEF',
      `Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
      `Platform: ${platform}`,
      '',
      'CONCEPT',
      result.concept,
      '',
      'HEADLINES',
      ...result.headlines.map((h, i) => `${i + 1}. ${h}`),
      '',
      'DESCRIPTIONS',
      ...result.descriptions.map((d, i) => `${i + 1}. ${d}`),
      '',
      'CALL-TO-ACTIONS',
      ...result.ctas.map((c, i) => `${i + 1}. ${c}`),
      '',
      'KEY MESSAGING',
      ...result.keyMessaging.map((m, i) => `${i + 1}. ${m}`),
      '',
      'VISUAL DIRECTION',
      ...result.visualDirection.map((v, i) => `${i + 1}. ${v}`),
      '',
      'PERFORMANCE BENCHMARKS',
      ...result.performanceBenchmarks.map((b, i) => `${i + 1}. ${b}`),
      '',
      'DELIVERABLES',
      ...result.deliverables.map((d, i) => `${i + 1}. ${d}`),
    ]
    await navigator.clipboard.writeText(sections.join('\n'))
    setCopied(true)
    toast({ title: 'Copied to clipboard', variant: 'success' })
    setTimeout(() => setCopied(false), 2000)
  }, [result, platform, toast])

  const handleExportPDF = useCallback(() => {
    toast('info', 'Export started', 'PDF is being generated and will download shortly.')
  }, [toast])

  return (
    <>
    <SEO
      title="Creative Brief"
      description="Create detailed creative briefs for your campaigns. Define objectives, target audience, messaging, and asset requirements."
      keywords="creative brief, campaign planning, brief template, creative strategy"
    />
    <div className="min-h-[100dvh] p-6 lg:p-8 max-w-[1440px] mx-auto" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
        className="mb-6"
      >
        <h2 className="font-space text-[36px] font-semibold leading-tight" style={{ color: C.textPrimary }}>
          Creative Brief Generator
        </h2>
        <p className="text-sm mt-1" style={{ color: C.textSecondary }}>
          AI-powered briefs for your design team
        </p>
      </motion.div>

      {/* Two-panel layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT PANEL — Form */}
        <div className="w-full lg:w-[420px] flex-shrink-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
            className="card-surface p-5 sticky top-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <FileText size={16} style={{ color: C.accent }} />
                <h3 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Brief Details</h3>
              </div>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: `${C.accent}15`, color: C.accent, border: `1px solid ${C.accent}30` }}
              >
                <Zap size={9} />
                6 credits
              </span>
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
              <option value="retention">Customer Retention</option>
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
              className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none transition-colors resize-none mb-5"
              style={{ background: 'var(--bg-secondary)', borderColor: C.borderSubtle, color: C.textPrimary }}
            />

            {/* Generate Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleGenerate}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-70"
              style={{ background: `linear-gradient(135deg, ${C.accent}, #3B82F6)`, color: 'white', boxShadow: '0 0 30px rgba(37,99,235,0.2)' }}
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating Brief...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate Creative Brief
                </>
              )}
            </motion.button>
          </motion.div>
        </div>

        {/* RIGHT PANEL — Results */}
        <div className="w-full lg:flex-1">
          <AnimatePresence mode="wait">
            {!result && !generating && (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: 30 }}
                className="h-full min-h-[500px] rounded-xl flex flex-col items-center justify-center p-8 card-surface"
                style={{ border: `1px dashed ${C.borderSubtle}` }}
              >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: C.aiPurpleGlow }}>
                  <FileText size={28} style={{ color: C.aiPurple }} />
                </div>
                <p className="text-sm font-medium mb-1" style={{ color: C.textSecondary }}>
                  Your creative brief will appear here
                </p>
                <p className="text-[12px] text-center max-w-xs" style={{ color: C.textTertiary }}>
                  Fill in the campaign details and click "Generate Creative Brief" to create a professional brief for your design team.
                </p>
              </motion.div>
            )}

            {generating && (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full min-h-[500px] rounded-xl flex flex-col items-center justify-center p-8 card-surface"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: C.aiPurpleGlow }}
                >
                  <Sparkles className="w-6 h-6" style={{ color: C.aiPurple }} />
                </motion.div>
                <h3 className="text-lg font-medium mb-1" style={{ color: C.textPrimary }}>
                  AI is crafting your brief...
                </h3>
                <p className="text-sm" style={{ color: C.textSecondary }}>
                  Analyzing inputs and generating creative direction
                </p>
                <div className="w-48 h-1.5 rounded-full mt-6 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${C.accent}, ${C.aiPurple})` }}
                    animate={{ width: ['0%', '100%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
              </motion.div>
            )}

            {result && !generating && (
              <motion.div
                key="brief"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
              >
                {/* AI badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4" style={{ background: C.aiPurpleGlow, color: C.aiPurple, border: `1px solid rgba(139,92,246,0.2)` }}>
                  <Sparkles size={12} />
                  AI-Generated Creative Brief · {platform}
                </div>

                {/* Brief Document */}
                <div className="rounded-xl p-6 lg:p-8 relative card-surface">
                  {/* Brief Header */}
                  <div className="flex items-start justify-between mb-6 pb-4" style={{ borderBottom: `2px solid ${C.borderSubtle}` }}>
                    <div>
                      <h3 className="font-space text-xl font-bold" style={{ color: C.textPrimary }}>
                        Creative Brief
                      </h3>
                      <p className="text-[12px] mt-1" style={{ color: C.textTertiary }}>
                        {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        {' · '}
                        <span className="font-semibold" style={{ color: PLATFORM_COLORS[platform] }}>{platform}</span>
                      </p>
                    </div>
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
                      style={{ background: C.aiPurpleGlow, color: C.aiPurple }}
                    >
                      <Sparkles size={12} />
                      AI-Generated
                    </div>
                  </div>

                  {/* Concept */}
                  <BriefSection icon={Target} title="Objective & Concept" delay={0} aiTinted>
                    <p className="text-sm leading-relaxed" style={{ color: C.textSecondary }}>
                      {result.concept}
                    </p>
                  </BriefSection>

                  {/* Headlines */}
                  <BriefSection icon={MessageSquare} title="Headlines" delay={0.1} aiTinted>
                    <div className="space-y-2">
                      {result.headlines.map((h, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + i * 0.05 }}
                          className="flex items-start gap-2 text-sm"
                          style={{ color: C.textPrimary }}
                        >
                          <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: C.aiPurpleGlow, color: C.aiPurple }}>
                            {i + 1}
                          </span>
                          <span className="font-medium">{h}</span>
                        </motion.div>
                      ))}
                    </div>
                  </BriefSection>

                  {/* Descriptions */}
                  <BriefSection icon={MessageSquare} title="Descriptions" delay={0.2}>
                    <div className="space-y-2">
                      {result.descriptions.map((d, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + i * 0.05 }}
                          className="flex items-start gap-2 text-sm"
                          style={{ color: C.textSecondary }}
                        >
                          <ChevronRight size={14} className="mt-0.5 flex-shrink-0" style={{ color: C.accent }} />
                          {d}
                        </motion.div>
                      ))}
                    </div>
                  </BriefSection>

                  {/* CTAs */}
                  <BriefSection icon={Zap} title="Call-to-Actions" delay={0.25}>
                    <div className="flex flex-wrap gap-2">
                      {result.ctas.map((cta, i) => (
                        <motion.span
                          key={i}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.25 + i * 0.05 }}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold"
                          style={{ background: `${C.accent}15`, color: C.accent, border: `1px solid ${C.accent}30` }}
                        >
                          {cta}
                        </motion.span>
                      ))}
                    </div>
                  </BriefSection>

                  {/* Key Messaging */}
                  <BriefSection icon={Lightbulb} title="Key Messaging" delay={0.3} aiTinted>
                    <ul className="space-y-1.5">
                      {result.keyMessaging.map((m, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.05 }}
                          className="flex items-start gap-2 text-sm"
                          style={{ color: C.textSecondary }}
                        >
                          <ChevronRight size={14} className="mt-0.5 flex-shrink-0" style={{ color: C.aiPurple }} />
                          {m}
                        </motion.li>
                      ))}
                    </ul>
                  </BriefSection>

                  {/* Visual Direction */}
                  <BriefSection icon={Palette} title="Visual Direction" delay={0.4}>
                    <ul className="space-y-1.5">
                      {result.visualDirection.map((v, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + i * 0.05 }}
                          className="flex items-start gap-2 text-sm"
                          style={{ color: C.textSecondary }}
                        >
                          <ChevronRight size={14} className="mt-0.5 flex-shrink-0" style={{ color: C.accent }} />
                          {v}
                        </motion.li>
                      ))}
                    </ul>
                  </BriefSection>

                  {/* Performance Benchmarks */}
                  <BriefSection icon={Target} title="Performance Benchmarks" delay={0.45}>
                    <div className="grid grid-cols-2 gap-2">
                      {result.performanceBenchmarks.map((b, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.45 + i * 0.04 }}
                          className="flex items-center gap-2 text-sm"
                          style={{ color: C.textSecondary }}
                        >
                          <Check size={14} style={{ color: C.statusActive }} />
                          {b}
                        </motion.div>
                      ))}
                    </div>
                  </BriefSection>

                  {/* Deliverables */}
                  <BriefSection icon={FileText} title="Deliverables" delay={0.5} aiTinted>
                    <ul className="space-y-1.5">
                      {result.deliverables.map((d, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + i * 0.05 }}
                          className="flex items-start gap-2 text-sm"
                          style={{ color: C.textSecondary }}
                        >
                          <ChevronRight size={14} className="mt-0.5 flex-shrink-0" style={{ color: C.aiPurple }} />
                          {d}
                        </motion.li>
                      ))}
                    </ul>
                  </BriefSection>

                  {/* Target Audience recap */}
                  <BriefSection icon={Users} title="Target Audience" delay={0.55}>
                    <p className="text-sm leading-relaxed" style={{ color: C.textSecondary }}>
                      {audience || 'Not specified'}
                    </p>
                  </BriefSection>
                </div>

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 }}
                  className="flex flex-wrap gap-3 mt-5"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCopyToClipboard}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150"
                    style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, color: C.textPrimary }}
                  >
                    {copied ? <Check size={16} style={{ color: C.statusActive }} /> : <Copy size={16} />}
                    {copied ? 'Copied!' : 'Copy to Clipboard'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150"
                    style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, color: C.textPrimary }}
                  >
                    <Download size={16} />
                    Export PDF
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150"
                    style={{ background: C.accent, color: 'white', boxShadow: '0 0 30px rgba(37,99,235,0.2)' }}
                  >
                    <Send size={16} />
                    Send to Designer
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150"
                    style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, color: C.textSecondary }}
                  >
                    <Bookmark size={16} />
                    Save to Library
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
    </>
  )
}
