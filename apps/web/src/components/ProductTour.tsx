import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Sparkles,
  LayoutDashboard,
  Megaphone,
  FileEdit,
  Bot,
  Mail,
  Command,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  Zap,
  Shield,
  BarChart3,
  BrainCircuit,
} from 'lucide-react'

/* ─────────────────────── types ─────────────────────── */

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: string | number }>

interface TourStep {
  id: number
  title: string
  description: string
  icon: IconComponent
  navLabel?: string
  navIcon?: IconComponent
  accent?: string
  isFullscreen?: boolean
}

/* ─────────────────────── tour steps ─────────────────────── */

const TOUR_STEPS: TourStep[] = [
  {
    id: 1,
    title: 'Welcome to AdNexus AI',
    description: 'Let us show you around your new ad intelligence dashboard. This will take about 2 minutes.',
    icon: Sparkles,
    isFullscreen: true,
  },
  {
    id: 2,
    title: 'Your Command Center',
    description: 'The Dashboard gives you a real-time overview of all campaigns across Meta, Google, TikTok, and Snap. KPI cards, spend charts, and alerts — all in one place.',
    icon: LayoutDashboard,
    navLabel: 'Dashboard',
    navIcon: LayoutDashboard,
  },
  {
    id: 3,
    title: 'Manage Campaigns',
    description: 'View all your campaigns in a powerful data table. Sort, filter, bulk-select, and take actions. Click any campaign to edit or view details.',
    icon: Megaphone,
    navLabel: 'Campaigns',
    navIcon: Megaphone,
  },
  {
    id: 4,
    title: 'Draft-First Safety',
    description: 'This is what makes AdNexus different. Every AI-suggested change becomes a DRAFT first. Nothing touches your live ad accounts until YOU approve it. Review, edit, or reject any action.',
    icon: FileEdit,
    navLabel: 'Drafts',
    navIcon: FileEdit,
    accent: 'var(--accent)',
  },
  {
    id: 5,
    title: 'Your Autonomous Agent',
    description: 'Configure automation rules like "pause if CPA exceeds $50" or "scale budget if ROAS is above 4x". The agent monitors 24/7 and creates drafts when conditions are met.',
    icon: Bot,
    navLabel: 'AI Agent',
    navIcon: BrainCircuit,
  },
  {
    id: 6,
    title: 'Daily Intelligence',
    description: 'Every morning at 8 AM, your AI agent delivers a personalized brief: performance summary, drafted actions, anomalies detected, and creative insights.',
    icon: Mail,
    navLabel: 'Morning Brief',
    navIcon: BarChart3,
  },
  {
    id: 7,
    title: 'Command+K = Speed',
    description: 'Press Cmd+K (or Ctrl+K) anywhere to open the command palette. Search campaigns, navigate pages, run actions — without touching your mouse.',
    icon: Command,
  },
  {
    id: 8,
    title: "You're All Set!",
    description: 'Your AI agent is monitoring your campaigns. Check your Drafts page for the first optimization suggestions.',
    icon: CheckCircle2,
    isFullscreen: true,
  },
]

/* ─────────────────────── easing ─────────────────────── */

const EASE_SMOOTH = [0.4, 0, 0.2, 1] as [number, number, number, number]
const EASE_BOUNCE = [0.34, 1.56, 0.64, 1] as [number, number, number, number]

/* ─────────────────────── page routing ─────────────────────── */

const PUBLIC_PAGES = ['/', '/blog', '/blog/', '/compare/', '/tools']
const AUTH_PAGES = ['/signin', '/signup', '/forgot-password', '/onboarding']

function isAppPage(pathname) {
  if (AUTH_PAGES.includes(pathname)) return false
  if (PUBLIC_PAGES.some((p) => pathname.startsWith(p) && (p === '/' ? pathname === '/' : true))) return false
  if (pathname.startsWith('/blog/')) return false
  if (pathname.startsWith('/compare/')) return false
  return true
}

/* ─────────────────────── module-level trigger ─────────────────────── */

const triggerRef = { current: null as (() => void) | null }

/**
 * Call this function from any component to manually start the product tour.
 * Example: triggerTour() from a "Take Tour" button in settings.
 */
export function triggerTour() {
  triggerRef.current?.()
}

/* ─────────────────────── component ─────────────────────── */

export function ProductTour() {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const hasAutoStarted = useRef(false)

  /* ── expose trigger via module-level ref ── */
  const startTour = useCallback(() => {
    setCurrentStep(0)
    setIsActive(true)
  }, [])

  useEffect(() => {
    triggerRef.current = startTour
    return () => { triggerRef.current = null }
  }, [startTour])

  /* ── Auto-start: only on first login after signup, on app pages, when authenticated ── */
  useEffect(() => {
    if (!isAuthenticated) return
    if (!isAppPage(location.pathname)) return
    if (hasAutoStarted.current) return

    try {
      const completed = localStorage.getItem('adnexus_tour_completed')
      const firstLogin = localStorage.getItem('adnexus_tour_first_login')
      if (!completed && firstLogin === 'true') {
        hasAutoStarted.current = true
        // Clear the first-login flag so it doesn't trigger again
        localStorage.removeItem('adnexus_tour_first_login')
        const timer = setTimeout(() => {
          setIsActive(true)
        }, 2000)
        return () => clearTimeout(timer)
      }
    } catch {
      // localStorage unavailable (private mode, etc.) — silently skip auto-start
    }
  }, [isAuthenticated, location.pathname])

  /* Keyboard navigation */
  useEffect(() => {
    if (!isActive) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'Escape') skipTour()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isActive, currentStep])

  const goNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(s => s + 1)
    } else {
      finishTour()
    }
  }, [currentStep])

  const goPrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep(s => s - 1)
  }, [currentStep])

  const skipTour = useCallback(() => {
    try {
      if (dontShowAgain) {
        localStorage.setItem('adnexus_tour_completed', 'true')
      }
    } catch {
      // localStorage unavailable — still close the modal
    }
    setIsActive(false)
    setCurrentStep(0)
  }, [dontShowAgain])

  const finishTour = useCallback(() => {
    try {
      localStorage.setItem('adnexus_tour_completed', 'true')
    } catch {
      // localStorage unavailable — tour state won't persist, but modal still closes
    }
    setIsActive(false)
    setCurrentStep(0)
  }, [])

  const goToDashboard = useCallback(() => {
    try {
      localStorage.setItem('adnexus_tour_completed', 'true')
    } catch { /* ignore */ }
    setIsActive(false)
    setCurrentStep(0)
    navigate('/dashboard')
  }, [navigate])

  const goToDrafts = useCallback(() => {
    try {
      localStorage.setItem('adnexus_tour_completed', 'true')
    } catch { /* ignore */ }
    setIsActive(false)
    setCurrentStep(0)
    navigate('/drafts')
  }, [navigate])

  if (!isActive) return null

  const step = TOUR_STEPS[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === TOUR_STEPS.length - 1
  const isFullscreen = step.isFullscreen

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Dark overlay */}
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={skipTour}
          />

          {/* Content */}
          <div className="relative z-10 w-full h-full flex items-center justify-center p-4">
            <AnimatePresence mode="wait">
              {isFullscreen ? (
                /* ─── Fullscreen step (Welcome / All Set) ─── */
                <motion.div
                  key={`fullscreen-${step.id}`}
                  className="w-full max-w-sm rounded-2xl overflow-hidden"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
                  }}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE_BOUNCE }}
                >
                  {/* Top edge glow */}
                  <div className="absolute top-0 left-0 right-0 h-[60px] pointer-events-none" style={{ background: 'radial-gradient(ellipse at top, rgba(255,255,255,0.03) 0%, transparent 70%)' }} />

                  <div className="p-8 text-center relative">
                    {/* Close button */}
                    <button
                      onClick={skipTour}
                      className="absolute top-3 right-3 p-1.5 rounded-lg transition-colors hover:bg-white/5"
                    >
                      <X size={16} style={{ color: 'var(--text-tertiary)' }} />
                    </button>

                    {/* Icon / Illustration */}
                    <div className="mb-6 flex justify-center">
                      {isFirst ? (
                        <WelcomeOrb />
                      ) : (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.4, ease: EASE_BOUNCE, delay: 0.1 }}
                        >
                          <CheckmarkOrb />
                        </motion.div>
                      )}
                    </div>

                    {/* Title */}
                    <h2
                      className="font-space font-bold text-xl mb-2"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {step.title}
                    </h2>

                    {/* Description */}
                    <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                      {step.description}
                    </p>

                    {/* Step 1: Don't show again + Start/Skip */}
                    {isFirst && (
                      <>
                        <label className="flex items-center justify-center gap-2 mb-5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={e => setDontShowAgain(e.target.checked)}
                            className="w-3.5 h-3.5 rounded"
                            style={{ accentColor: 'var(--accent)' }}
                          />
                          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            Don&apos;t show this again
                          </span>
                        </label>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={skipTour}
                            className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
                            style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                          >
                            Skip Tour
                          </button>
                          <button
                            onClick={goNext}
                            className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 glow-blue"
                            style={{ background: 'var(--accent)', color: '#fff' }}
                          >
                            Start Tour
                          </button>
                        </div>
                      </>
                    )}

                    {/* Step 8: Go to Dashboard + View Drafts */}
                    {isLast && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={goToDrafts}
                          className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
                          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                        >
                          View Drafts
                        </button>
                        <button
                          onClick={goToDashboard}
                          className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 glow-blue"
                          style={{ background: 'var(--accent)', color: '#fff' }}
                        >
                          Go to Dashboard
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                /* ─── Tooltip step (2-7) ─── */
                <motion.div
                  key={`tooltip-${step.id}`}
                  className="w-full max-w-md"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: EASE_SMOOTH }}
                >
                  {/* Visual nav element representation */}
                  {step.navLabel && step.navIcon && (
                    <motion.div
                      className="flex justify-center mb-4"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.25, ease: EASE_BOUNCE }}
                    >
                      <div
                        className="flex items-center gap-2 px-4 py-2 rounded-lg"
                        style={{
                          background: 'rgba(37,99,235,0.1)',
                          border: '2px solid var(--accent)',
                          boxShadow: '0 0 30px rgba(37,99,235,0.2)',
                        }}
                      >
                        <step.navIcon size={16} style={{ color: 'var(--accent)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>{step.navLabel}</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 7: Keyboard hint */}
                  {step.id === 7 && (
                    <motion.div
                      className="flex justify-center gap-2 mb-4"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.25, ease: EASE_BOUNCE }}
                    >
                      <div
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
                      >
                        <kbd className="px-2 py-0.5 rounded text-xs font-mono-data font-bold" style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
                          ⌘
                        </kbd>
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>+</span>
                        <kbd className="px-2 py-0.5 rounded text-xs font-mono-data font-bold" style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
                          K
                        </kbd>
                      </div>
                    </motion.div>
                  )}

                  {/* Tooltip card */}
                  <div
                    className="rounded-xl overflow-hidden relative"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: step.accent ? `1px solid ${step.accent}` : '1px solid var(--border-subtle)',
                      boxShadow: step.accent
                        ? `0 8px 32px rgba(0,0,0,0.5), 0 0 30px ${step.accent}20`
                        : '0 8px 32px rgba(0,0,0,0.5)',
                    }}
                  >
                    {/* Blue left border accent for Drafts step */}
                    {step.accent && (
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1"
                        style={{ background: step.accent }}
                      />
                    )}

                    {/* Top edge glow */}
                    <div className="absolute top-0 left-0 right-0 h-[60px] pointer-events-none" style={{ background: 'radial-gradient(ellipse at top, rgba(255,255,255,0.03) 0%, transparent 70%)' }} />

                    <div className="p-5 relative">
                      {/* Step badge + Skip */}
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ background: 'var(--accent)', color: '#fff' }}
                        >
                          {step.id} of {TOUR_STEPS.length}
                        </span>
                        <button
                          onClick={skipTour}
                          className="text-[11px] transition-colors hover:underline"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          Skip Tour
                        </button>
                      </div>

                      {/* Title */}
                      <div className="flex items-center gap-2 mb-2">
                        <step.icon size={18} style={{ color: step.accent || 'var(--accent)' }} />
                        <h3
                          className="font-space font-semibold text-base"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {step.title}
                        </h3>
                      </div>

                      {/* Description */}
                      <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
                        {step.description}
                      </p>

                      {/* Controls */}
                      <div className="flex items-center justify-between">
                        {/* Previous */}
                        <button
                          onClick={goPrev}
                          disabled={isFirst}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <ChevronLeft size={14} />
                          Previous
                        </button>

                        {/* Dots */}
                        <div className="flex items-center gap-1.5">
                          {TOUR_STEPS.map((s, i) => (
                            <div
                              key={s.id}
                              className="rounded-full transition-all duration-200"
                              style={{
                                width: i === currentStep ? 16 : 6,
                                height: 6,
                                background: i === currentStep ? 'var(--accent)' : 'var(--text-muted)',
                                opacity: i === currentStep ? 1 : 0.5,
                              }}
                            />
                          ))}
                        </div>

                        {/* Next / Finish */}
                        <button
                          onClick={goNext}
                          className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 glow-blue"
                          style={{ background: 'var(--accent)', color: '#fff' }}
                        >
                          {isLast ? 'Finish' : 'Next'}
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ══════════════════════════════════════════════
   WELCOME ORB (Step 1)
   ══════════════════════════════════════════════ */

function WelcomeOrb() {
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      {/* Gradient orb */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(37,99,235,0.4) 0%, rgba(59,130,246,0.2) 40%, transparent 70%)',
          filter: 'blur(8px)',
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="relative w-16 h-16 rounded-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
          boxShadow: '0 0 40px rgba(37,99,235,0.3)',
        }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Sparkles size={28} className="text-white" />
      </motion.div>
      {/* Floating mini sparkles */}
      <motion.div
        className="absolute -top-1 -right-1"
        animate={{ y: [-2, 2, -2], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Zap size={12} style={{ color: '#60A5FA' }} />
      </motion.div>
      <motion.div
        className="absolute -bottom-1 -left-1"
        animate={{ y: [2, -2, 2], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      >
        <Shield size={10} style={{ color: '#93C5FD' }} />
      </motion.div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   CHECKMARK ORB (Step 8)
   ══════════════════════════════════════════════ */

function CheckmarkOrb() {
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(16,185,129,0.4) 0%, rgba(16,185,129,0.2) 40%, transparent 70%)',
          filter: 'blur(8px)',
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="relative w-16 h-16 rounded-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #10B981, #34D399)',
          boxShadow: '0 0 40px rgba(16,185,129,0.3)',
        }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.5, ease: EASE_BOUNCE }}
        >
          <CheckCircle2 size={32} className="text-white" />
        </motion.div>
      </motion.div>
    </div>
  )
}
