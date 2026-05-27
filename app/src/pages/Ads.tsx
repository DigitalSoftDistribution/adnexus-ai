// @ts-nocheck
import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SEO from '../components/SEO';
import {
  Search, Upload, Grid, List, AlertTriangle,
  X, Edit, Copy, Trash2, Pause, Eye, Sparkles,
  MoreVertical
} from 'lucide-react'

/* ─────────────────────── Types ─────────────────────── */

interface Ad {
  id: string
  name: string
  campaign: string
  campaignId: string
  platform: 'Meta' | 'Google' | 'TikTok' | 'Snap'
  status: 'Active' | 'Paused' | 'Draft' | 'Error'
  ctr: number | null
  spend: number
  frequency: number
  fatigue: 'healthy' | 'warning' | 'critical' | 'exhausted'
  roas: number | null
  cpc: number | null
  conversions: number | null
  cpa: number | null
  impressions: number
  clicks: number
  createdAt: string
  daysRunning: number
  ctrTrend: number
  gradient: string
  gradientFrom: string
  gradientTo: string
  textColor: string
}

type ViewMode = 'grid' | 'list'

/* ─────────────────────── Platform Config ─────────────────────── */

const PLATFORM_COLORS: Record<Ad['platform'], string> = {
  Meta: '#1877F2',
  Google: '#DB4437',
  TikTok: '#00F2EA',
  Snap: '#FFFC00',
}

const STATUS_COLORS: Record<Ad['status'], string> = {
  Active: '#10B981',
  Paused: '#F59E0B',
  Draft: '#3B82F6',
  Error: '#EF4444',
}

const FATIGUE_COLORS: Record<Ad['fatigue'], string> = {
  healthy: '#10B981',
  warning: '#F59E0B',
  critical: '#EF4444',
  exhausted: '#EF4444',
}

const FATIGUE_LABELS: Record<Ad['fatigue'], string> = {
  healthy: 'Fresh',
  warning: 'Warming',
  critical: 'Fatiguing',
  exhausted: 'Exhausted',
}

/* ─────────────────────── Mock Data Generator ─────────────────────── */

function generateMockAds(): Ad[] {
  return [
    { id: 'a1', name: 'Summer Collection Video', campaign: 'Summer Sale 2026', campaignId: 'c1', platform: 'Meta', status: 'Active', ctr: 2.8, spend: 3200, frequency: 1.4, fatigue: 'healthy', roas: 4.2, cpc: 1.2, conversions: 89, cpa: 36, impressions: 284000, clicks: 5233, createdAt: '2026-05-15', daysRunning: 18, ctrTrend: 5, gradient: 'from-pink-500 to-purple-600', gradientFrom: '#EC4899', gradientTo: '#9333EA', textColor: '#fff' },
    { id: 'a2', name: 'Flash Sale Carousel', campaign: 'Summer Sale 2026', campaignId: 'c1', platform: 'Meta', status: 'Active', ctr: 1.9, spend: 2100, frequency: 2.8, fatigue: 'warning', roas: 3.1, cpc: 1.5, conversions: 45, cpa: 47, impressions: 156000, clicks: 2964, createdAt: '2026-05-20', daysRunning: 13, ctrTrend: -12, gradient: 'from-amber-500 to-red-500', gradientFrom: '#F59E0B', gradientTo: '#EF4444', textColor: '#fff' },
    { id: 'a3', name: 'UGC Testimonial', campaign: 'Brand Awareness Q2', campaignId: 'c2', platform: 'Meta', status: 'Active', ctr: 3.2, spend: 4100, frequency: 1.1, fatigue: 'healthy', roas: 4.8, cpc: 0.8, conversions: 112, cpa: 37, impressions: 312000, clicks: 9984, createdAt: '2026-05-10', daysRunning: 23, ctrTrend: 8, gradient: 'from-sky-400 to-blue-600', gradientFrom: '#38BDF8', gradientTo: '#2563EB', textColor: '#fff' },
    { id: 'a4', name: 'Brand Awareness Static', campaign: 'Brand Awareness Q2', campaignId: 'c2', platform: 'Meta', status: 'Paused', ctr: 0.8, spend: 800, frequency: 4.2, fatigue: 'critical', roas: 1.1, cpc: 3.2, conversions: 8, cpa: 100, impressions: 98000, clicks: 784, createdAt: '2026-04-01', daysRunning: 62, ctrTrend: -34, gradient: 'from-stone-500 to-stone-700', gradientFrom: '#78716C', gradientTo: '#44403C', textColor: '#fff' },
    { id: 'a5', name: 'Search Headline A', campaign: 'Search - Brand Terms', campaignId: 'c6', platform: 'Google', status: 'Active', ctr: 4.5, spend: 5200, frequency: 1.0, fatigue: 'healthy', roas: 6.1, cpc: 0.9, conversions: 201, cpa: 26, impressions: 89200, clicks: 4014, createdAt: '2026-05-01', daysRunning: 32, ctrTrend: 2, gradient: 'from-red-400 to-orange-500', gradientFrom: '#F87171', gradientTo: '#F97316', textColor: '#fff' },
    { id: 'a6', name: 'PMax Product Feed', campaign: 'PMax - Ecommerce', campaignId: 'c7', platform: 'Google', status: 'Active', ctr: 1.6, spend: 3800, frequency: 1.2, fatigue: 'healthy', roas: 3.5, cpc: 1.4, conversions: 92, cpa: 41, impressions: 245000, clicks: 3920, createdAt: '2026-05-08', daysRunning: 25, ctrTrend: -3, gradient: 'from-emerald-400 to-teal-600', gradientFrom: '#34D399', gradientTo: '#0D9488', textColor: '#fff' },
    { id: 'a7', name: 'Display Banner Set', campaign: 'Display - Remarketing', campaignId: 'c8', platform: 'Google', status: 'Active', ctr: 1.1, spend: 1900, frequency: 2.4, fatigue: 'warning', roas: 2.8, cpc: 2.1, conversions: 34, cpa: 56, impressions: 420000, clicks: 4620, createdAt: '2026-04-15', daysRunning: 38, ctrTrend: -18, gradient: 'from-indigo-400 to-violet-600', gradientFrom: '#818CF8', gradientTo: '#7C3AED', textColor: '#fff' },
    { id: 'a8', name: 'Hook Challenge Video', campaign: 'FYP - Viral Hook', campaignId: 'c11', platform: 'TikTok', status: 'Active', ctr: 1.7, spend: 2400, frequency: 1.8, fatigue: 'healthy', roas: 3.1, cpc: 0.7, conversions: 67, cpa: 36, impressions: 184000, clicks: 3128, createdAt: '2026-05-12', daysRunning: 21, ctrTrend: -5, gradient: 'from-cyan-400 to-blue-500', gradientFrom: '#22D3EE', gradientTo: '#3B82F6', textColor: '#fff' },
    { id: 'a9', name: 'UGC Reaction', campaign: 'Spark Ads - UGC', campaignId: 'c12', platform: 'TikTok', status: 'Active', ctr: 2.3, spend: 3100, frequency: 1.5, fatigue: 'healthy', roas: 4.5, cpc: 0.6, conversions: 98, cpa: 32, impressions: 198000, clicks: 4554, createdAt: '2026-05-05', daysRunning: 28, ctrTrend: 3, gradient: 'from-fuchsia-500 to-pink-600', gradientFrom: '#D946EF', gradientTo: '#DB2777', textColor: '#fff' },
    { id: 'a10', name: 'Collection Showcase', campaign: 'TopView - Launch', campaignId: 'c14', platform: 'TikTok', status: 'Error', ctr: 0, spend: 0, frequency: 0, fatigue: 'exhausted', roas: null, cpc: null, conversions: null, cpa: null, impressions: 0, clicks: 0, createdAt: '2026-06-01', daysRunning: 1, ctrTrend: 0, gradient: 'from-zinc-500 to-zinc-700', gradientFrom: '#71717A', gradientTo: '#3F3F46', textColor: '#fff' },
    { id: 'a11', name: 'Story Ad - Promo', campaign: 'Snap Story - Gen Z', campaignId: 'c16', platform: 'Snap', status: 'Active', ctr: 1.3, spend: 1200, frequency: 2.1, fatigue: 'warning', roas: 2.9, cpc: 1.8, conversions: 32, cpa: 38, impressions: 134000, clicks: 1742, createdAt: '2026-04-20', daysRunning: 33, ctrTrend: -10, gradient: 'from-yellow-400 to-amber-600', gradientFrom: '#FACC15', gradientTo: '#D97706', textColor: '#000' },
    { id: 'a12', name: 'AR Lens Preview', campaign: 'AR Lens - Branded', campaignId: 'c18', platform: 'Snap', status: 'Paused', ctr: 0.6, spend: 400, frequency: 3.8, fatigue: 'critical', roas: 1.4, cpc: 4.5, conversions: 3, cpa: 133, impressions: 22000, clicks: 132, createdAt: '2026-03-15', daysRunning: 78, ctrTrend: -28, gradient: 'from-violet-400 to-purple-600', gradientFrom: '#A78BFA', gradientTo: '#9333EA', textColor: '#fff' },
    { id: 'a13', name: 'Dynamic Product Ad', campaign: 'Summer Sale 2026', campaignId: 'c1', platform: 'Meta', status: 'Active', ctr: 2.1, spend: 2800, frequency: 1.6, fatigue: 'healthy', roas: 3.8, cpc: 1.1, conversions: 74, cpa: 38, impressions: 198000, clicks: 4116, createdAt: '2026-05-18', daysRunning: 15, ctrTrend: 1, gradient: 'from-blue-400 to-indigo-600', gradientFrom: '#60A5FA', gradientTo: '#4F46E5', textColor: '#fff' },
    { id: 'a14', name: 'Lead Gen Form', campaign: 'Brand Awareness Q2', campaignId: 'c2', platform: 'Meta', status: 'Draft', ctr: null, spend: 0, frequency: 0, fatigue: 'healthy', roas: null, cpc: null, conversions: null, cpa: null, impressions: 0, clicks: 0, createdAt: '2026-06-02', daysRunning: 0, ctrTrend: 0, gradient: 'from-slate-400 to-slate-600', gradientFrom: '#94A3B8', gradientTo: '#475569', textColor: '#fff' },
    { id: 'a15', name: 'Shopping - Top Products', campaign: 'PMax - Ecommerce', campaignId: 'c7', platform: 'Google', status: 'Active', ctr: 1.9, spend: 4500, frequency: 1.1, fatigue: 'healthy', roas: 4.0, cpc: 1.3, conversions: 110, cpa: 41, impressions: 312000, clicks: 5850, createdAt: '2026-05-03', daysRunning: 30, ctrTrend: 4, gradient: 'from-green-400 to-emerald-600', gradientFrom: '#4ADE80', gradientTo: '#059669', textColor: '#fff' },
    { id: 'a16', name: 'YouTube Pre-Roll', campaign: 'Search - Brand Terms', campaignId: 'c6', platform: 'Google', status: 'Active', ctr: 3.1, spend: 6100, frequency: 1.3, fatigue: 'warning', roas: 5.2, cpc: 1.0, conversions: 178, cpa: 34, impressions: 156000, clicks: 4836, createdAt: '2026-04-28', daysRunning: 35, ctrTrend: -7, gradient: 'from-orange-400 to-red-500', gradientFrom: '#FB923C', gradientTo: '#EF4444', textColor: '#fff' },
    { id: 'a17', name: 'Duet Chain Video', campaign: 'FYP - Viral Hook', campaignId: 'c11', platform: 'TikTok', status: 'Active', ctr: 2.0, spend: 1800, frequency: 1.4, fatigue: 'healthy', roas: 3.6, cpc: 0.5, conversions: 52, cpa: 35, impressions: 142000, clicks: 2840, createdAt: '2026-05-14', daysRunning: 19, ctrTrend: 6, gradient: 'from-teal-400 to-cyan-500', gradientFrom: '#2DD4BF', gradientTo: '#06B6D4', textColor: '#fff' },
    { id: 'a18', name: 'Stitch Reaction', campaign: 'Spark Ads - UGC', campaignId: 'c12', platform: 'TikTok', status: 'Paused', ctr: 1.4, spend: 950, frequency: 2.6, fatigue: 'warning', roas: 2.4, cpc: 0.9, conversions: 28, cpa: 34, impressions: 87000, clicks: 1218, createdAt: '2026-04-10', daysRunning: 45, ctrTrend: -15, gradient: 'from-rose-400 to-pink-600', gradientFrom: '#FB7185', gradientTo: '#DB2777', textColor: '#fff' },
    { id: 'a19', name: 'Filter Try-On', campaign: 'AR Lens - Branded', campaignId: 'c18', platform: 'Snap', status: 'Active', ctr: 0.9, spend: 2100, frequency: 1.7, fatigue: 'healthy', roas: 2.2, cpc: 2.8, conversions: 19, cpa: 111, impressions: 98000, clicks: 882, createdAt: '2026-05-07', daysRunning: 26, ctrTrend: -2, gradient: 'from-purple-400 to-fuchsia-600', gradientFrom: '#C084FC', gradientTo: '#C026D3', textColor: '#fff' },
    { id: 'a20', name: 'Snap Map Pin', campaign: 'Snap Story - Gen Z', campaignId: 'c16', platform: 'Snap', status: 'Draft', ctr: null, spend: 0, frequency: 0, fatigue: 'healthy', roas: null, cpc: null, conversions: null, cpa: null, impressions: 0, clicks: 0, createdAt: '2026-06-03', daysRunning: 0, ctrTrend: 0, gradient: 'from-lime-400 to-green-600', gradientFrom: '#A3E635', gradientTo: '#16A34A', textColor: '#000' },
    { id: 'a21', name: 'Carousel - New Arrivals', campaign: 'Summer Sale 2026', campaignId: 'c1', platform: 'Meta', status: 'Active', ctr: 2.4, spend: 3600, frequency: 1.9, fatigue: 'healthy', roas: 3.9, cpc: 1.0, conversions: 92, cpa: 39, impressions: 245000, clicks: 5880, createdAt: '2026-05-11', daysRunning: 22, ctrTrend: 2, gradient: 'from-indigo-400 to-blue-600', gradientFrom: '#6366F1', gradientTo: '#2563EB', textColor: '#fff' },
    { id: 'a22', name: 'Reels Overlay', campaign: 'Brand Awareness Q2', campaignId: 'c2', platform: 'Meta', status: 'Active', ctr: 1.5, spend: 1500, frequency: 2.2, fatigue: 'warning', roas: 2.6, cpc: 1.7, conversions: 38, cpa: 39, impressions: 134000, clicks: 2010, createdAt: '2026-04-25', daysRunning: 40, ctrTrend: -8, gradient: 'from-pink-400 to-rose-600', gradientFrom: '#F472B6', gradientTo: '#E11D48', textColor: '#fff' },
    { id: 'a23', name: 'Discovery Ad', campaign: 'PMax - Ecommerce', campaignId: 'c7', platform: 'Google', status: 'Paused', ctr: 1.3, spend: 2200, frequency: 2.9, fatigue: 'critical', roas: 2.3, cpc: 1.8, conversions: 48, cpa: 46, impressions: 187000, clicks: 2431, createdAt: '2026-03-28', daysRunning: 55, ctrTrend: -22, gradient: 'from-gray-400 to-gray-600', gradientFrom: '#9CA3AF', gradientTo: '#4B5563', textColor: '#fff' },
    { id: 'a24', name: 'Voiceover Trend', campaign: 'FYP - Viral Hook', campaignId: 'c11', platform: 'TikTok', status: 'Active', ctr: 1.9, spend: 2700, frequency: 1.3, fatigue: 'healthy', roas: 3.4, cpc: 0.6, conversions: 78, cpa: 35, impressions: 221000, clicks: 4199, createdAt: '2026-05-09', daysRunning: 24, ctrTrend: 3, gradient: 'from-cyan-400 to-teal-500', gradientFrom: '#22D3EE', gradientTo: '#14B8A6', textColor: '#fff' },
    { id: 'a25', name: 'Bitmoji integration', campaign: 'Snap Story - Gen Z', campaignId: 'c16', platform: 'Snap', status: 'Active', ctr: 1.1, spend: 890, frequency: 1.8, fatigue: 'healthy', roas: 3.1, cpc: 1.5, conversions: 25, cpa: 36, impressions: 76000, clicks: 836, createdAt: '2026-05-16', daysRunning: 17, ctrTrend: 1, gradient: 'from-yellow-400 to-orange-500', gradientFrom: '#FACC15', gradientTo: '#F97316', textColor: '#000' },
  ];
}

/* ─────────────────────── Utility ─────────────────────── */

function formatCurrency(n: number | null): string {
  if (n === null || n === undefined) return '—'
  return '$' + n.toLocaleString('en-US')
}

function formatPercent(n: number | null): string {
  if (n === null || n === undefined) return '—'
  return n.toFixed(1) + '%'
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

/* ─────────────────────── Status Dot ─────────────────────── */

function StatusDot({ status }: { status: Ad['status'] }) {
  const color = STATUS_COLORS[status]
  return <span className="w-2 h-2 rounded-full" style={{ background: color }} />
}

/* ─────────────────────── Platform Badge ─────────────────────── */

function PlatformBadge({ platform }: { platform: Ad['platform'] }) {
  const color = PLATFORM_COLORS[platform]
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ backgroundColor: color + '25', color }}
    >
      {platform}
    </span>
  )
}

/* ─────────────────────── Fatigue Badge ─────────────────────── */

function FatigueBadge({ fatigue }: { fatigue: Ad['fatigue'] }) {
  const color = FATIGUE_COLORS[fatigue]
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold"
      style={{ backgroundColor: color + '20', color }}
    >
      {FATIGUE_LABELS[fatigue]}
    </span>
  )
}

/* ─────────────────────── Performance Bar ─────────────────────── */

function PerformanceBar({ roas, fatigue }: { roas: number | null; fatigue: Ad['fatigue'] }) {
  let color = 'var(--status-active)'
  let width = 75
  if (roas === null || roas === undefined) {
    color = 'var(--text-tertiary)'
    width = 0
  } else if (fatigue === 'critical' || fatigue === 'exhausted') {
    color = 'var(--status-error)'
    width = 20
  } else if (roas < 2) {
    color = 'var(--status-error)'
    width = 30
  } else if (roas < 3) {
    color = 'var(--status-warning)'
    width = 55
  } else {
    color = 'var(--status-active)'
    width = Math.min(roas * 20, 100)
  }
  return (
    <div className="w-full h-1 rounded-full" style={{ background: 'var(--bg-hover)' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: width + '%' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="h-1 rounded-full"
        style={{ background: color }}
      />
    </div>
  )
}

/* ─────────────────────── Upload Modal ─────────────────────── */

function UploadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [dragOver, setDragOver] = useState(false)
  const [step, setStep] = useState(1)

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="w-full h-full sm:h-auto sm:max-w-[560px] sm:rounded-xl p-6"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Upload Creative</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c3f53b]/40"
                style={{ color: 'var(--text-secondary)' }}
                aria-label="Close upload modal"
                type="button"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <div
                  className="h-[200px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all"
                  style={{
                    borderColor: dragOver ? 'var(--accent)' : 'var(--border-subtle)',
                    background: dragOver ? 'var(--accent-glow)' : 'transparent',
                  }}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={() => setDragOver(false)}
                >
                  <Upload size={32} style={{ color: 'var(--text-tertiary)' }} />
                  <div className="text-center">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Drop files here or click to browse</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>JPG, PNG, GIF, MP4, MOV — Max 50MB</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Target Platform</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['Meta', 'Google', 'TikTok', 'Snap'] as const).map((p) => (
                      <button
                        key={p}
                        className="h-10 rounded-lg text-xs font-medium transition-all border"
                        style={{
                          background: 'var(--bg-hover)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="w-full h-10 rounded-lg text-sm font-semibold text-white"
                  style={{ background: 'var(--accent)' }}
                >
                  Continue
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Creative Name</label>
                  <input className="w-full h-10 px-3 rounded-lg text-sm outline-none" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} placeholder="e.g., Summer Video Ad" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Associated Campaign</label>
                  <select className="w-full h-10 px-3 rounded-lg text-sm outline-none" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                    <option>Summer Sale 2026</option>
                    <option>Brand Awareness Q2</option>
                    <option>Search - Brand Terms</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Primary Text</label>
                  <textarea className="w-full h-20 px-3 py-2 rounded-lg text-sm outline-none resize-none" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} placeholder="Ad copy..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Headline</label>
                    <input className="w-full h-10 px-3 rounded-lg text-sm outline-none" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} placeholder="Shop Now" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>CTA Button</label>
                    <select className="w-full h-10 px-3 rounded-lg text-sm outline-none" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                      <option>Shop Now</option>
                      <option>Learn More</option>
                      <option>Sign Up</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(1)} className="flex-1 h-10 rounded-lg text-sm font-semibold" style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>Back</button>
                  <button onClick={onClose} className="flex-1 h-10 rounded-lg text-sm font-semibold text-white" style={{ background: 'var(--accent)' }}>Submit for Review</button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─────────────────────── Creative Detail Drawer ─────────────────────── */

function CreativeDrawer({ ad, onClose }: { ad: Ad | null; onClose: () => void }) {
  if (!ad) return null

  const trendData = [
    { day: 'Day 1', ctr: ad.ctr ? ad.ctr * 1.2 : 0, freq: ad.frequency * 0.3 },
    { day: 'Day 5', ctr: ad.ctr ? ad.ctr * 1.15 : 0, freq: ad.frequency * 0.5 },
    { day: 'Day 10', ctr: ad.ctr ? ad.ctr * 1.1 : 0, freq: ad.frequency * 0.7 },
    { day: 'Day 15', ctr: ad.ctr ? ad.ctr * 1.0 : 0, freq: ad.frequency * 0.85 },
    { day: 'Day 20', ctr: ad.ctr ? ad.ctr * 0.9 : 0, freq: ad.frequency * 1.0 },
    { day: 'Day 25', ctr: ad.ctr ? ad.ctr * 0.8 : 0, freq: ad.frequency * 1.15 },
    { day: 'Day 30', ctr: ad.ctr ? ad.ctr * 0.66 : 0, freq: ad.frequency * 1.3 },
  ]

  return (
    <AnimatePresence>
      {ad && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[55]"
            style={{ background: 'rgba(0,0,0,0.3)' }}
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.65, 0, 0.35, 1] as [number, number, number, number] }}
            className="fixed right-0 top-0 sm:top-16 bottom-0 z-[56] w-full sm:w-[480px] overflow-y-auto"
            style={{
              background: 'var(--bg-secondary)',
              borderLeft: '1px solid var(--border-subtle)',
            }}
          >
            {/* Header */}
            <div className="p-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-start gap-4">
                <div
                  className="w-20 h-20 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${ad.gradientFrom}, ${ad.gradientTo})`, color: ad.textColor }}
                >
                  {ad.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{ad.name}</h3>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--accent)' }}>{ad.campaign}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <PlatformBadge platform={ad.platform} />
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: STATUS_COLORS[ad.status] + '20', color: STATUS_COLORS[ad.status] }}>
                      <StatusDot status={ad.status} /> {ad.status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c3f53b]/40"
                  style={{ color: 'var(--text-secondary)' }}
                  aria-label="Close creative details"
                  type="button"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className="px-5 py-4">
              <div
                className="w-full h-48 rounded-lg flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${ad.gradientFrom}, ${ad.gradientTo})` }}
              >
                <span className="text-lg font-semibold" style={{ color: ad.textColor }}>{ad.name}</span>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="px-5 pb-4">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-3" style={{ color: 'var(--text-secondary)' }}>Lifetime Metrics</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Impressions', value: formatNumber(ad.impressions) },
                  { label: 'Clicks', value: formatNumber(ad.clicks) },
                  { label: 'CTR', value: formatPercent(ad.ctr), color: ad.ctr && ad.ctr >= 2 ? 'var(--status-active)' : ad.ctr && ad.ctr >= 1 ? 'var(--text-primary)' : 'var(--status-warning)' },
                  { label: 'Spend', value: formatCurrency(ad.spend) },
                  { label: 'Conversions', value: formatNumber(ad.conversions || 0) },
                  { label: 'CPA', value: formatCurrency(ad.cpa) },
                  { label: 'ROAS', value: ad.roas ? ad.roas.toFixed(1) + 'x' : '—', color: ad.roas && ad.roas > 3 ? 'var(--status-active)' : ad.roas && ad.roas >= 2 ? 'var(--text-primary)' : 'var(--status-warning)' },
                  { label: 'CPC', value: formatCurrency(ad.cpc) },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg p-3" style={{ background: 'var(--bg-elevated)' }}>
                    <p className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>{m.label}</p>
                    <p className="font-mono-data text-sm font-semibold" style={{ color: (m as { color?: string }).color || 'var(--text-primary)' }}>{m.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Frequency trend */}
            <div className="px-5 pb-4">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-3" style={{ color: 'var(--text-secondary)' }}>Performance Trends (30 Days)</h4>
              <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)' }}>
                <div className="flex items-end justify-between h-[120px] gap-1">
                  {trendData.map((d, i) => {
                    const ctrHeight = ad.ctr ? Math.max((d.ctr / (ad.ctr * 1.2)) * 100, 5) : 5
                    const freqHeight = Math.max((d.freq / (ad.frequency * 1.3)) * 100, 5)
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex gap-[2px] items-end h-[100px]">
                          <div
                            className="flex-1 rounded-t-sm transition-all"
                            style={{ height: `${ctrHeight}%`, background: 'var(--accent)' }}
                            title={`CTR: ${d.ctr.toFixed(1)}%`}
                          />
                          <div
                            className="flex-1 rounded-t-sm transition-all"
                            style={{ height: `${freqHeight}%`, background: 'var(--status-warning)' }}
                            title={`Freq: ${d.freq.toFixed(1)}x`}
                          />
                        </div>
                        <span className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>{d.day}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--accent)' }}>
                    <span className="w-2 h-2 rounded-sm" style={{ background: 'var(--accent)' }} /> CTR
                  </span>
                  <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--status-warning)' }}>
                    <span className="w-2 h-2 rounded-sm" style={{ background: 'var(--status-warning)' }} /> Frequency
                  </span>
                </div>
              </div>
            </div>

            {/* AI Insight */}
            <div className="px-5 pb-4">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-3" style={{ color: 'var(--text-secondary)' }}>AI Insight</h4>
              <div
                className="rounded-lg p-4"
                style={{ background: 'var(--bg-elevated)', borderLeft: '3px solid var(--accent)' }}
              >
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {ad.fatigue === 'critical' || ad.fatigue === 'exhausted'
                    ? `This ad's CTR has dropped ${Math.abs(ad.ctrTrend)}% over the last ${ad.daysRunning} days. Frequency is at ${ad.frequency}x. Consider replacing the creative immediately.`
                    : ad.fatigue === 'warning'
                    ? `This ad's CTR has declined ${Math.abs(ad.ctrTrend)}% in the last ${ad.daysRunning} days. Consider refreshing the creative soon.`
                    : `This ad is performing well with a ${ad.ctr}% CTR. Continue monitoring for fatigue signals.`
                  }
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-5 pb-6">
              <div className="grid grid-cols-2 gap-3">
                <button className="flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-semibold" style={{ background: 'var(--accent)', color: 'white' }}>
                  <Edit size={14} /> Edit
                </button>
                <button className="flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-semibold" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
                  <Copy size={14} /> Duplicate
                </button>
                <button className="flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-semibold" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                  <Pause size={14} /> Pause
                </button>
                <button className="flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-semibold text-white" style={{ background: 'var(--status-error)' }}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ═════════════════════════ MAIN ADS PAGE ═════════════════════════ */

export default function Ads() {
  const [ads, setAds] = useState<Ad[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState<string>('All')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [fatigueAlertVisible, setFatigueAlertVisible] = useState(true)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const platformFilters = ['All', 'Meta', 'Google', 'TikTok', 'Snap']

  /* ── Load data with demo check ── */
  useEffect(() => {
    const isDemo = !import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL === ''
    if (isDemo) {
      setAds(generateMockAds())
      setIsLoading(false)
      return
    }
    // In non-demo mode, would fetch from API here
    setAds(generateMockAds())
    setIsLoading(false)
  }, [])

  /* ── Filtering ── */
  const filtered = useMemo(() => {
    let data = [...ads]
    if (platformFilter !== 'All') data = data.filter((a) => a.platform === platformFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      data = data.filter((a) => a.name.toLowerCase().includes(q) || a.campaign.toLowerCase().includes(q))
    }
    return data
  }, [platformFilter, search, ads])

  /* ── Fatigue stats ── */
  const fatigueCount = ads.filter((a) => a.fatigue === 'warning' || a.fatigue === 'critical' || a.fatigue === 'exhausted').length

  if (isLoading) {
    return (
      <>
      <SEO
        title="Ad Library"
      description="Manage your ad creatives, monitor performance, track fatigue scores, and optimize ad copy across all platforms from the AdNexus AI ad library."
      keywords="ad library, ad creatives, ad performance, ad fatigue, creative management"
      />
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-8 w-48 rounded bg-white/5 animate-pulse mb-2" />
            <div className="h-4 w-32 rounded bg-white/5 animate-pulse" />
          </div>
          <div className="h-10 w-36 rounded bg-white/5 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div className="h-4 rounded bg-white/5 w-3/4 mb-3" />
              <div className="h-3 rounded bg-white/5 w-1/2 mb-4" />
              <div className="h-16 rounded bg-white/5 mb-3" />
              <div className="grid grid-cols-3 gap-2"><div className="h-8 rounded bg-white/5" /><div className="h-8 rounded bg-white/5" /><div className="h-8 rounded bg-white/5" /></div>
            </div>
          ))}
        </div>
      </div>
      </>
    )
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* ═══════ Header ═══════ */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Row 1: Title + Controls */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-space text-[28px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              Ad Creatives
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {ads.length} creatives across 4 platforms
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setUploadOpen(true)}
              className="flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              <Upload size={16} />
              Upload Creative
            </button>
            <button
              className="flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold transition-all"
              style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            >
              <Sparkles size={16} />
              AI Creative Analysis
            </button>
            {/* View Toggle */}
            <div className="flex items-center h-10 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setViewMode('grid')}
                className="flex items-center justify-center w-10 h-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c3f53b]/40"
                style={{ background: viewMode === 'grid' ? 'var(--accent)' : 'transparent', color: viewMode === 'grid' ? 'white' : 'var(--text-secondary)' }}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
                type="button"
              >
                <Grid size={16} aria-hidden="true" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="flex items-center justify-center w-10 h-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c3f53b]/40"
                style={{ background: viewMode === 'list' ? 'var(--accent)' : 'transparent', color: viewMode === 'list' ? 'white' : 'var(--text-secondary)' }}
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
                type="button"
              >
                <List size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search ads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-8 pr-3 rounded-lg text-[13px] outline-none"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="flex items-center gap-1">
            {platformFilters.map((p) => (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className="h-8 px-3 rounded-full text-[11px] font-semibold transition-all"
                style={{
                  background: platformFilter === p ? (p === 'All' ? 'var(--accent)' : PLATFORM_COLORS[p as Ad['platform']] + '30') : 'transparent',
                  color: platformFilter === p ? (p === 'All' ? 'white' : PLATFORM_COLORS[p as Ad['platform']]) : 'var(--text-secondary)',
                  border: platformFilter === p ? 'none' : '1px solid var(--border-subtle)',
                }}
              >
                {p === 'All' ? 'All' : (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: PLATFORM_COLORS[p as Ad['platform']] }} />
                    {p}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════ Creative Health Bar ═══════ */}
      <div
        className="flex flex-wrap items-center gap-4 h-14 px-4 rounded-xl mb-6"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
      >
        <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>Creative Health</span>
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-[300px]">
          <div className="flex-1 h-2 rounded-full overflow-hidden flex">
            {[
              { pct: 45, color: '#10B981', label: '56 fresh' },
              { pct: 30, color: '#F59E0B', label: '37 warming' },
              { pct: 18, color: '#F97316', label: '22 fatiguing' },
              { pct: 7, color: '#EF4444', label: '9 exhausted' },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ width: 0 }}
                animate={{ width: s.pct + '%' }}
                transition={{ duration: 0.6, delay: i * 0.2, ease: 'easeOut' }}
                className="h-full"
                style={{ background: s.color }}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {[
            { count: 56, label: 'fresh', color: '#10B981' },
            { count: 37, label: 'warming', color: '#F59E0B' },
            { count: 22, label: 'fatiguing', color: '#F97316' },
            { count: 9, label: 'exhausted', color: '#EF4444' },
          ].map((s) => (
            <span key={s.label} className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
              {s.count} {s.label}
            </span>
          ))}
        </div>
        <span className="flex items-center gap-1 text-xs font-medium ml-auto" style={{ color: 'var(--status-warning)' }}>
          <AlertTriangle size={12} />
          AI predicts 3 creatives will fatigue within 7 days
        </span>
      </div>

      {/* ═══════ Fatigue Alert Banner ═══════ */}
      <AnimatePresence>
        {fatigueAlertVisible && fatigueCount > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div
              className="flex items-center justify-between px-4 py-3 rounded-lg"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle size={16} style={{ color: 'var(--status-warning)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {fatigueCount} ads showing fatigue signals — CTR declining, frequency rising
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="h-8 px-3 rounded-md text-xs font-medium transition-all hover:opacity-80"
                  style={{ background: 'var(--status-warning)', color: '#050505' }}
                >
                  Review
                </button>
                <button
                  onClick={() => setFatigueAlertVisible(false)}
                  className="h-8 px-3 rounded-md text-xs font-medium transition-all hover:opacity-80"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ Grid View ═══════ */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((ad, i) => {
            const isFatigued = ad.fatigue === 'warning' || ad.fatigue === 'critical' || ad.fatigue === 'exhausted'
            return (
              <motion.div
                key={ad.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                whileHover={{ scale: 1.02 }}
                className="group rounded-xl overflow-hidden cursor-pointer transition-all"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                }}
                onClick={() => setSelectedAd(ad)}
              >
                {/* Thumbnail */}
                <div
                  className="relative h-40 flex items-center justify-center overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${ad.gradientFrom}, ${ad.gradientTo})` }}
                >
                  <span className="text-sm font-semibold text-center px-4" style={{ color: ad.textColor }}>{ad.name}</span>

                  {/* Platform badge */}
                  <div className="absolute top-2 left-2">
                    <PlatformBadge platform={ad.platform} />
                  </div>

                  {/* Status indicator */}
                  <div className="absolute top-2 right-2">
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                      style={{
                        background: ad.status === 'Active' ? 'rgba(16,185,129,0.2)' : ad.status === 'Error' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                        color: ad.status === 'Active' ? '#10B981' : ad.status === 'Error' ? '#EF4444' : '#F59E0B',
                      }}
                    >
                      <StatusDot status={ad.status} />
                      {ad.status}
                    </span>
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ background: 'rgba(0,0,0,0.5)' }} role="group" aria-label={`Actions for ${ad.name}`}>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedAd(ad) }} className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }} aria-label={`Edit ${ad.name}`} type="button">
                      <Edit size={16} aria-hidden="true" />
                    </button>
                    <button className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }} aria-label={`Preview ${ad.name}`} type="button">
                      <Eye size={16} aria-hidden="true" />
                    </button>
                    <button className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }} aria-label={`Duplicate ${ad.name}`} type="button">
                      <Copy size={16} aria-hidden="true" />
                    </button>
                  </div>

                  {/* Fatigue overlay */}
                  {isFatigued && (
                    <div className="absolute bottom-0 left-0 right-0">
                      <div
                        className="px-2 py-1 text-center text-[10px] font-semibold"
                        style={{
                          background: ad.fatigue === 'critical' || ad.fatigue === 'exhausted' ? 'rgba(239,68,68,0.85)' : 'rgba(245,158,11,0.85)',
                          color: ad.fatigue === 'critical' || ad.fatigue === 'exhausted' ? 'white' : '#050505',
                        }}
                      >
                        {ad.fatigue === 'exhausted' ? 'Creative Exhausted' : 'Fatigue Warning'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Info Panel */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{ad.name}</h3>
                    <StatusDot status={ad.status} />
                  </div>
                  <p className="text-[11px] truncate mb-2.5" style={{ color: 'var(--text-secondary)' }}>{ad.campaign}</p>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 mb-2.5">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>CTR</p>
                      <p className="font-mono-data text-xs font-semibold" style={{ color: ad.ctr && ad.ctr >= 2 ? 'var(--status-active)' : 'var(--text-primary)' }}>
                        {formatPercent(ad.ctr)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Spend</p>
                      <p className="font-mono-data text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(ad.spend)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Freq.</p>
                      <p className="font-mono-data text-xs font-semibold" style={{ color: ad.frequency > 3 ? 'var(--status-error)' : ad.frequency > 2 ? 'var(--status-warning)' : 'var(--status-active)' }}>
                        {ad.frequency.toFixed(1)}x
                      </p>
                    </div>
                  </div>

                  {/* Performance bar */}
                  <PerformanceBar roas={ad.roas} fatigue={ad.fatigue} />
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ═══════ List View ═══════ */}
      {viewMode === 'list' && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="h-[52px]" style={{ background: 'var(--bg-secondary)' }}>
                  <th scope="col" className="px-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>Creative</th>
                  <th scope="col" className="px-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>Campaign</th>
                  <th scope="col" className="px-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>Platform</th>
                  <th scope="col" className="px-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>Status</th>
                  <th scope="col" className="px-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>CTR</th>
                  <th scope="col" className="px-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>Spend</th>
                  <th scope="col" className="px-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>Freq.</th>
                  <th scope="col" className="px-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>Fatigue</th>
                  <th scope="col" className="w-12 px-2" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((ad, i) => (
                  <motion.tr
                    key={ad.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.02 }}
                    className="h-[52px] group cursor-pointer transition-colors duration-100"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onClick={() => setSelectedAd(ad)}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <td className="px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={{ background: `linear-gradient(135deg, ${ad.gradientFrom}, ${ad.gradientTo})`, color: ad.textColor }}
                        >
                          {ad.name.charAt(0)}
                        </div>
                        <span className="text-[13px] font-medium truncate max-w-[160px]" style={{ color: 'var(--text-primary)' }}>{ad.name}</span>
                      </div>
                    </td>
                    <td className="px-4">
                      <span className="text-xs truncate max-w-[120px] block" style={{ color: 'var(--text-secondary)' }}>{ad.campaign}</span>
                    </td>
                    <td className="px-4"><PlatformBadge platform={ad.platform} /></td>
                    <td className="px-4"><StatusDot status={ad.status} /></td>
                    <td className="px-4">
                      <span className="font-mono-data text-[13px]" style={{ color: ad.ctr && ad.ctr >= 2 ? 'var(--status-active)' : 'var(--text-primary)' }}>
                        {formatPercent(ad.ctr)}
                      </span>
                    </td>
                    <td className="px-4">
                      <span className="font-mono-data text-[13px]" style={{ color: 'var(--text-primary)' }}>{formatCurrency(ad.spend)}</span>
                    </td>
                    <td className="px-4">
                      <span className="font-mono-data text-[13px]" style={{ color: ad.frequency > 3 ? 'var(--status-error)' : ad.frequency > 2 ? 'var(--status-warning)' : 'var(--status-active)' }}>
                        {ad.frequency.toFixed(1)}x
                      </span>
                    </td>
                    <td className="px-4"><FatigueBadge fatigue={ad.fatigue} /></td>
                    <td className="px-2 relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === ad.id ? null : ad.id) }}
                        className="w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c3f53b]/40"
                        style={{ color: 'var(--text-secondary)' }}
                        aria-label={`Open actions menu for ${ad.name}`}
                        aria-expanded={openMenuId === ad.id}
                        type="button"
                      >
                        <MoreVertical size={14} aria-hidden="true" />
                      </button>
                      <AnimatePresence>
                        {openMenuId === ad.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            className="absolute right-2 top-10 z-20 w-36 rounded-lg overflow-hidden shadow-xl"
                            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                          >
                            <button onClick={(e) => { e.stopPropagation(); setSelectedAd(ad); setOpenMenuId(null) }} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-primary)' }}>
                              <Edit size={12} /> Edit
                            </button>
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-primary)' }}>
                              <Copy size={12} /> Duplicate
                            </button>
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--bg-hover)]" style={{ color: 'var(--status-error)' }}>
                              <Trash2 size={12} /> Delete
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="py-16 text-center">
          <Search size={32} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No ads found</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Try adjusting your filters or search query.</p>
        </div>
      )}

      {/* ═══════ Modals & Drawers ═══════ */}
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <CreativeDrawer ad={selectedAd} onClose={() => setSelectedAd(null)} />

      {/* Click-outside for action menu */}
      {openMenuId && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
      )}
    </div>
  )
}
