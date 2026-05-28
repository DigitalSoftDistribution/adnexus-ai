import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  CheckCircle2,
  Target,
  TrendingUp,
  DollarSign,
  MousePointerClick,
  Shield,
  Bot,
  Mail,
  BarChart3,
  Zap,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Megaphone,
} from 'lucide-react';
import { triggerTour } from './ProductTour';

/* ─────────────────────── Demo mode detection ─────────────────────── */
const getIsDemoMode = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  return !apiUrl || apiUrl === '' || apiUrl.includes('localhost');
};
const isDemoMode = getIsDemoMode();

/* ─────────────────────── Easing ─────────────────────── */
const EASE_SMOOTH = [0.4, 0, 0.2, 1] as [number, number, number, number];
const EASE_BOUNCE = [0.34, 1.56, 0.64, 1] as [number, number, number, number];

/* ─────────────────────── Slide Variants ─────────────────────── */
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 100 : -100, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -100 : 100, opacity: 0 }),
};

/* ─────────────────────── Platform Config ─────────────────────── */
interface PlatformConfig {
  id: string;
  name: string;
  color: string;
  demoAccountId: string;
}

const PLATFORMS: PlatformConfig[] = [
  { id: 'meta', name: 'Meta Ads', color: '#1877F2', demoAccountId: 'act_123456789' },
  { id: 'google', name: 'Google Ads', color: '#DB4437', demoAccountId: '123-456-7890' },
  { id: 'tiktok', name: 'TikTok Ads', color: '#00F2EA', demoAccountId: 'tiktok_987654321' },
  { id: 'snap', name: 'Snap Ads', color: '#FFFC00', demoAccountId: 'snap_456789123' },
];

/* ─────────────────────── Goal Config ─────────────────────── */
interface GoalConfig {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  prefix?: string;
  suffix?: string;
  demoValue: number;
  min: number;
  max: number;
  step: number;
}

const GOALS: GoalConfig[] = [
  {
    id: 'targetROAS',
    label: 'Increase ROAS',
    description: 'Return on ad spend target',
    icon: <TrendingUp size={18} style={{ color: '#c3f53b' }} />,
    suffix: 'x',
    demoValue: 4.0,
    min: 0.5,
    max: 20,
    step: 0.1,
  },
  {
    id: 'targetCPA',
    label: 'Reduce CPA',
    description: 'Maximum cost per acquisition',
    icon: <DollarSign size={18} style={{ color: '#10b981' }} />,
    prefix: '$',
    demoValue: 25,
    min: 1,
    max: 10000,
    step: 1,
  },
  {
    id: 'targetConversions',
    label: 'Scale Conversions',
    description: 'Monthly conversion target',
    icon: <MousePointerClick size={18} style={{ color: '#8b5cf6' }} />,
    demoValue: 500,
    min: 10,
    max: 100000,
    step: 10,
  },
];

/* ─────────────────────── AI Toggle Config ─────────────────────── */
interface AIToggleConfig {
  id: string;
  label: string;
  description: string;
  tooltip: string;
  demoValue: boolean;
}

const AI_TOGGLES: AIToggleConfig[] = [
  {
    id: 'aiOptimization',
    label: 'Enable AI Optimization',
    description: 'Let the AI agent monitor and optimize campaigns',
    tooltip: 'The AI agent analyzes performance data 24/7 and creates optimization drafts based on your goals. It never makes live changes without your approval.',
    demoValue: true,
  },
  {
    id: 'autoPause',
    label: 'Auto-pause underperforming ads',
    description: 'Automatically draft pauses for ads below target ROAS',
    tooltip: 'When an ad\'s ROAS drops below your target for 3+ days, the AI creates a draft to pause it. You review and approve before it goes live.',
    demoValue: true,
  },
  {
    id: 'requireApproval',
    label: 'Require approval for all changes',
    description: 'Every AI action becomes a draft for your review first',
    tooltip: 'This is the key AdNexus differentiator. When ON, every AI-suggested change becomes a DRAFT. Nothing touches your live ad accounts until YOU approve it. Turn OFF only if you fully trust the AI to make live changes.',
    demoValue: true,
  },
  {
    id: 'morningBrief',
    label: 'Morning Brief emails',
    description: 'Daily performance summary at 8 AM',
    tooltip: 'Every morning at 8 AM, receive a personalized email with performance summary, drafted actions, anomalies detected, and creative insights.',
    demoValue: true,
  },
];

/* ─────────────────────── Step Titles ─────────────────────── */
const STEP_TITLES = [
  'Welcome',
  'Connect Platforms',
  'Set Goals',
  'Configure AI Agent',
  'You\'re Ready!',
];

/* ════════════════════════════════════════════════════════════════════
   TOOLTIP COMPONENT
   ════════════════════════════════════════════════════════════════════ */
function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="ml-1.5 inline-flex items-center justify-center rounded-full p-0.5 transition-colors hover:bg-white/10"
        style={{ color: 'var(--text-tertiary)' }}
      >
        <HelpCircle size={13} />
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15, ease: EASE_SMOOTH }}
            className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg px-3 py-2 text-xs leading-relaxed shadow-xl"
            style={{
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-secondary)',
            }}
          >
            {text}
            <div
              className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45"
              style={{
                background: '#1a1a1a',
                borderRight: '1px solid rgba(255,255,255,0.1)',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TOGGLE SWITCH COMPONENT
   ════════════════════════════════════════════════════════════════════ */
function ToggleSwitch({
  label,
  description,
  tooltip,
  enabled,
  onChange,
  highlight = false,
}: {
  label: string;
  description: string;
  tooltip?: string;
  enabled: boolean;
  onChange: () => void;
  highlight?: boolean;
}) {
  return (
    <div
      className="flex items-start justify-between gap-4 rounded-xl border p-4 transition-all duration-200"
      style={{
        background: highlight ? 'rgba(195,245,59,0.04)' : 'var(--bg-elevated)',
        borderColor: highlight
          ? 'rgba(195,245,59,0.2)'
          : enabled
            ? 'rgba(195,245,59,0.15)'
            : 'var(--border-subtle)',
      }}
    >
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center">
          <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
            {label}
          </span>
          {tooltip && <Tooltip text={tooltip} />}
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onChange}
        className="relative mt-0.5 inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c3f53b] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        style={{ background: enabled ? '#c3f53b' : 'rgba(255,255,255,0.2)' }}
      >
        <motion.span
          animate={{ x: enabled ? 20 : 2 }}
          transition={{ duration: 0.2, ease: EASE_SMOOTH }}
          className="inline-block h-4 w-4 rounded-full bg-white shadow"
        />
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   STEP INDICATOR (top progress dots)
   ════════════════════════════════════════════════════════════════════ */
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="w-full max-w-[600px] mx-auto px-6">
      {/* Progress bar */}
      <div className="relative h-1 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: EASE_SMOOTH }}
          style={{ background: '#c3f53b' }}
        />
      </div>
      {/* Dots */}
      <div className="flex items-center justify-between mt-3">
        {STEP_TITLES.map((title, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <motion.div
              className="flex items-center justify-center rounded-full transition-all duration-300"
              animate={{
                width: i === currentStep ? 24 : 8,
                height: i === currentStep ? 24 : 8,
                background: i <= currentStep ? '#c3f53b' : 'rgba(255,255,255,0.15)',
              }}
              transition={{ duration: 0.3, ease: EASE_SMOOTH }}
            >
              {i < currentStep && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2, ease: EASE_BOUNCE }}
                >
                  <Check size={12} className="text-black" strokeWidth={3} />
                </motion.div>
              )}
              {i === currentStep && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-[10px] font-bold text-black"
                >
                  {i + 1}
                </motion.span>
              )}
            </motion.div>
            <span
              className="text-[10px] font-medium transition-colors duration-300 hidden sm:block"
              style={{
                color: i === currentStep ? '#c3f53b' : i < currentStep ? 'var(--text-secondary)' : 'var(--text-muted)',
              }}
            >
              {title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   WELCOME ORB
   ════════════════════════════════════════════════════════════════════ */
function WelcomeOrb() {
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      {/* Outer glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(195,245,59,0.25) 0%, transparent 70%)',
          filter: 'blur(12px)',
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Inner orb */}
      <motion.div
        className="relative w-20 h-20 rounded-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #c3f53b, #a8d936)',
          boxShadow: '0 0 40px rgba(195,245,59,0.3), 0 0 80px rgba(195,245,59,0.1)',
        }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Sparkles size={32} className="text-black" />
      </motion.div>
      {/* Floating accents */}
      <motion.div
        className="absolute -top-2 -right-2"
        animate={{ y: [-3, 3, -3], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Zap size={14} style={{ color: '#c3f53b' }} />
      </motion.div>
      <motion.div
        className="absolute -bottom-1 -left-3"
        animate={{ y: [3, -3, 3], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      >
        <Target size={12} style={{ color: '#a8d936' }} />
      </motion.div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   PLATFORM ICON SVGs
   ════════════════════════════════════════════════════════════════════ */
function PlatformIcon({ platform, size = 24 }: { platform: string; size?: number }) {
  const icons: Record<string, React.ReactNode> = {
    meta: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#1877F2" />
        <path d="M16.5 8.5h-2a1 1 0 00-1 1V11h3l-.5 2.5h-2.5V20h-3v-6.5H8V11h2.5V9a3.5 3.5 0 013.5-3.5h2.5v3z" fill="white" />
      </svg>
    ),
    google: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#DB4437" />
        <path d="M12 8c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 7.5c2.5 0 4.5-2 4.5-4.5S14.5 6.5 12 6.5 7.5 8.5 7.5 11s2 4.5 4.5 4.5z" fill="white" />
        <path d="M15.5 6.5h1v-1h-1v1zm-7 0h1v-1h-1v1z" fill="white" />
      </svg>
    ),
    tiktok: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#000" />
        <path d="M15.5 3v12a3.5 3.5 0 01-3.5 3.5 3.5 3.5 0 01-3.5-3.5 3.5 3.5 0 013.5-3.5V10a5.5 5.5 0 00-5.5 5.5A5.5 5.5 0 0012 21a5.5 5.5 0 005.5-5.5V8.5a7 7 0 004-1.25V5a5 5 0 01-4 2V3h-2z" fill="#00F2EA" />
        <path d="M15.5 3v2a5 5 0 004-2h-4z" fill="#FF0050" />
      </svg>
    ),
    snap: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#FFFC00" />
        <path d="M12 4c-1.5 0-3 1-3 3.5 0 .5.1 1 .3 1.4-.8.3-1.8.5-2.8.3-.2 0-.4.1-.5.3s0 .5.2.6c1.5 1 1.8 2.2 1.8 2.2s-.5.3-1.2.3c-.3 0-.5.2-.5.5s.2.5.5.5c1.5 0 2.2.8 3 1.5.5.5 1 1 1.7 1.2.2.1.5.1.7 0 .7-.2 1.2-.7 1.7-1.2.8-.7 1.5-1.5 3-1.5.3 0 .5-.2.5-.5s-.2-.5-.5-.5c-.7 0-1.2-.3-1.2-.3s.3-1.2 1.8-2.2c.2-.1.3-.4.2-.6s-.3-.3-.5-.3c-1 .2-2 0-2.8-.3.2-.4.3-.9.3-1.4C15 5 13.5 4 12 4z" fill="#000" />
      </svg>
    ),
  };
  return <>{icons[platform] || <Megaphone size={size} />}</>;
}

/* ════════════════════════════════════════════════════════════════════
   MAIN COMPONENT: OnboardingWizard
   ════════════════════════════════════════════════════════════════════ */
export default function OnboardingWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const totalSteps = 5;

  /* ── Platform states ── */
  const [platforms, setPlatforms] = useState<Record<string, { connected: boolean; connecting: boolean }>>(() => {
    const initial: Record<string, { connected: boolean; connecting: boolean }> = {};
    PLATFORMS.forEach((p) => {
      initial[p.id] = { connected: isDemoMode, connecting: false };
    });
    return initial;
  });

  /* ── Goal states ── */
  const [goals, setGoals] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    GOALS.forEach((g) => {
      initial[g.id] = isDemoMode ? g.demoValue : g.demoValue;
    });
    return initial;
  });

  /* ── AI toggle states ── */
  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    AI_TOGGLES.forEach((t) => {
      initial[t.id] = isDemoMode ? t.demoValue : t.demoValue;
    });
    return initial;
  });

  /* ── Connected count ── */
  const connectedCount = Object.values(platforms).filter((p) => p.connected).length;

  /* ── Navigation ── */
  const goNext = () => {
    if (step < totalSteps - 1) {
      setDir(1);
      setStep((s) => s + 1);
    }
  };

  const goPrev = () => {
    if (step > 0) {
      setDir(-1);
      setStep((s) => s - 1);
    }
  };

  const goToStep = (target: number) => {
    if (target >= 0 && target < totalSteps - 1) {
      setDir(target > step ? 1 : -1);
      setStep(target);
    }
  };

  const goToDashboard = () => {
    try {
      localStorage.setItem('adnexus_tour_first_login', 'true');
    } catch { /* ignore */ }
    navigate('/dashboard');
  };

  const handleStartTour = () => {
    goToDashboard();
    // Trigger tour after navigation
    setTimeout(() => triggerTour(), 500);
  };

  /* ── Platform connect handler ── */
  const handleConnect = (platformId: string) => {
    setPlatforms((prev) => ({
      ...prev,
      [platformId]: { ...prev[platformId], connecting: true },
    }));
    setTimeout(() => {
      setPlatforms((prev) => ({
        ...prev,
        [platformId]: { connected: true, connecting: false },
      }));
    }, 800);
  };

  /* ── Goal handler ── */
  const setGoal = (id: string, value: number) => {
    setGoals((prev) => ({ ...prev, [id]: value }));
  };

  /* ── Toggle handler ── */
  const toggleKey = (id: string) => {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  /* ── Set first-login flag for ProductTour when reaching final step ── */
  useEffect(() => {
    if (step === totalSteps - 1) {
      try {
        localStorage.setItem('adnexus_tour_first_login', 'true');
      } catch { /* ignore */ }
    }
  }, [step]);

  return (
    <div
      className="flex min-h-[100dvh] w-full flex-col"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* ─── Demo Mode Banner ─── */}
      <AnimatePresence>
        {isDemoMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs"
            style={{
              background: 'rgba(195, 245, 59, 0.1)',
              borderBottom: '1px solid rgba(195, 245, 59, 0.2)',
              color: '#c3f53b',
            }}
          >
            <Zap size={14} />
            Demo Mode — Sample data is pre-filled. No real API calls will be made.
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Step Indicator ─── */}
      <div className="pt-8 pb-4">
        <StepIndicator currentStep={step} totalSteps={totalSteps} />
      </div>

      {/* ─── Main Content Area ─── */}
      <div className="relative flex flex-1 items-start justify-center overflow-y-auto px-4 py-6">
        <div className="w-full" style={{ maxWidth: 600 }}>
          <AnimatePresence mode="wait" custom={dir}>

            {/* ═══════════════════════════════════════════
                STEP 1: Welcome
            ═══════════════════════════════════════════ */}
            {step === 0 && (
              <motion.div
                key="welcome"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: EASE_SMOOTH }}
                className="flex flex-col items-center pt-8 text-center"
              >
                {/* Brand Orb */}
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, ease: EASE_BOUNCE }}
                >
                  <WelcomeOrb />
                </motion.div>

                {/* Title */}
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4, ease: EASE_SMOOTH }}
                  className="mt-8 font-space text-3xl sm:text-4xl font-bold tracking-tight"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Welcome to AdNexus AI
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4, ease: EASE_SMOOTH }}
                  className="mt-3 text-base"
                  style={{ color: '#c3f53b' }}
                >
                  The Intelligent Campaign Workspace
                </motion.p>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4, ease: EASE_SMOOTH }}
                  className="mt-4 max-w-sm text-sm leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Connect your ad platforms, set your goals, and let our AI agent optimize your campaigns 24/7 — with full approval control.
                </motion.p>

                {/* Feature preview cards */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  className="mt-8 grid grid-cols-3 gap-3 w-full max-w-sm"
                >
                  {[
                    { icon: <BarChart3 size={18} />, label: 'Unified Dashboard', desc: 'All platforms' },
                    { icon: <Bot size={18} />, label: 'AI Agent', desc: 'Smart automation' },
                    { icon: <Shield size={18} />, label: 'Draft-First', desc: 'Always safe' },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.55 + i * 0.08, duration: 0.3 }}
                      className="flex flex-col items-center gap-2 rounded-xl border px-3 py-4"
                      style={{
                        background: 'var(--bg-elevated)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div style={{ color: '#c3f53b' }}>{item.icon}</div>
                      <p className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>
                        {item.label}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        {item.desc}
                      </p>
                    </motion.div>
                  ))}
                </motion.div>

                {/* CTA */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.3 }}
                  type="button"
                  onClick={goNext}
                  className="mt-10 flex h-12 items-center gap-2 rounded-xl px-8 text-sm font-semibold transition-all duration-200 hover:brightness-110"
                  style={{
                    background: '#c3f53b',
                    color: '#000',
                    boxShadow: '0 0 30px rgba(195,245,59,0.2)',
                  }}
                >
                  Get Started
                  <ArrowRight size={16} />
                </motion.button>

                {/* Skip */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.3 }}
                  type="button"
                  onClick={goToDashboard}
                  className="mt-4 text-xs transition-colors hover:text-white/80"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Skip onboarding
                </motion.button>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════
                STEP 2: Connect Platforms
            ═══════════════════════════════════════════ */}
            {step === 1 && (
              <motion.div
                key="platforms"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: EASE_SMOOTH }}
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-1">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: 'rgba(195,245,59,0.1)' }}
                  >
                    <BarChart3 size={20} style={{ color: '#c3f53b' }} />
                  </div>
                  <div>
                    <h2 className="font-space text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      Connect Platforms
                    </h2>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      Link your ad accounts to start monitoring
                    </p>
                  </div>
                </div>

                {/* Connection summary */}
                <AnimatePresence>
                  {connectedCount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 mb-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
                      style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.2)' }}
                    >
                      <CheckCircle2 size={14} style={{ color: 'var(--status-active)' }} />
                      <span style={{ color: 'var(--status-active)' }}>
                        {connectedCount} of {PLATFORMS.length} platforms connected
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Platform Grid */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PLATFORMS.map((platform, i) => {
                    const pState = platforms[platform.id];
                    return (
                      <motion.div
                        key={platform.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08, duration: 0.3, ease: EASE_SMOOTH }}
                        className="flex flex-col gap-3 rounded-xl border p-4 transition-all duration-200"
                        style={{
                          background: pState.connected
                            ? `${platform.color}08`
                            : 'var(--bg-elevated)',
                          borderColor: pState.connected
                            ? `${platform.color}40`
                            : 'var(--border-subtle)',
                        }}
                      >
                        {/* Platform header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <PlatformIcon platform={platform.id} size={36} />
                            <div>
                              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {platform.name}
                              </p>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{
                                    background: pState.connected
                                      ? 'var(--status-active)'
                                      : pState.connecting
                                        ? '#f59e0b'
                                        : 'var(--text-muted)',
                                  }}
                                />
                                <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                                  {pState.connected
                                    ? 'Connected'
                                    : pState.connecting
                                      ? 'Connecting...'
                                      : 'Not connected'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Connect button / Connected state */}
                        {pState.connected ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center justify-center gap-2 rounded-lg py-2.5"
                            style={{ background: 'rgba(16,185,129,0.1)' }}
                          >
                            <CheckCircle2 size={16} style={{ color: 'var(--status-active)' }} />
                            <span className="text-xs font-medium" style={{ color: 'var(--status-active)' }}>
                              Connected
                            </span>
                          </motion.div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleConnect(platform.id)}
                            disabled={pState.connecting}
                            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-200 hover:brightness-110 disabled:opacity-50"
                            style={{
                              background: pState.connecting ? 'var(--bg-hover)' : platform.color,
                              color: platform.id === 'snap' ? '#000' : '#fff',
                            }}
                          >
                            {pState.connecting ? (
                              <>
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                  className="h-4 w-4 rounded-full border-2 border-white border-t-transparent"
                                />
                                Connecting...
                              </>
                            ) : (
                              <>Connect</>
                            )}
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Connection note */}
                <p className="mt-3 text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
                  In demo mode, all platforms are pre-connected. Click &ldquo;Connect&rdquo; to simulate OAuth.
                </p>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════
                STEP 3: Set Goals
            ═══════════════════════════════════════════ */}
            {step === 2 && (
              <motion.div
                key="goals"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: EASE_SMOOTH }}
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-1">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: 'rgba(245,158,11,0.15)' }}
                  >
                    <Target size={20} style={{ color: '#f59e0b' }} />
                  </div>
                  <div>
                    <h2 className="font-space text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      Set Your Goals
                    </h2>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      Define your KPI targets for AI optimization
                    </p>
                  </div>
                </div>

                {/* Goal Cards */}
                <div className="mt-5 flex flex-col gap-3">
                  {GOALS.map((goal, i) => (
                    <motion.div
                      key={goal.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1, duration: 0.3, ease: EASE_SMOOTH }}
                      className="rounded-xl border p-4"
                      style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.05)' }}
                        >
                          {goal.icon}
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {goal.label}
                          </p>
                          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                            {goal.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {goal.prefix && (
                          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                            {goal.prefix}
                          </span>
                        )}
                        <input
                          type="number"
                          value={goals[goal.id]}
                          onChange={(e) => setGoal(goal.id, parseFloat(e.target.value) || 0)}
                          min={goal.min}
                          max={goal.max}
                          step={goal.step}
                          className="h-10 w-full rounded-lg border bg-transparent px-4 text-sm font-medium outline-none transition-all duration-200 focus:border-[#c3f53b] focus:ring-1 focus:ring-[rgba(195,245,59,0.2)]"
                          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                        />
                        {goal.suffix && (
                          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                            {goal.suffix}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Goal summary */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-4 rounded-xl border p-3"
                  style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
                >
                  <p className="text-[11px] font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>
                    AI Agent will optimize for:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {GOALS.map((g) => (
                      <span
                        key={g.id}
                        className="rounded-full px-3 py-1 text-[11px] font-medium"
                        style={{ background: 'rgba(195,245,59,0.1)', color: '#c3f53b' }}
                      >
                        {g.label}: {g.prefix || ''}
                        {g.suffix === 'x'
                          ? goals[g.id]?.toFixed(1)
                          : goals[g.id]?.toLocaleString()}
                        {g.suffix === 'x' ? 'x' : g.suffix || ''}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════
                STEP 4: Configure AI Agent
            ═══════════════════════════════════════════ */}
            {step === 3 && (
              <motion.div
                key="ai"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: EASE_SMOOTH }}
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-1">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: 'rgba(195,245,59,0.1)' }}
                  >
                    <Bot size={20} style={{ color: '#c3f53b' }} />
                  </div>
                  <div>
                    <h2 className="font-space text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      Configure AI Agent
                    </h2>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      Set your automation preferences
                    </p>
                  </div>
                </div>

                {/* Info banner */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4 mb-4 flex items-start gap-2.5 rounded-xl border px-3 py-3 text-xs"
                  style={{ background: 'rgba(195,245,59,0.05)', borderColor: 'rgba(195,245,59,0.15)' }}
                >
                  <Shield size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#c3f53b' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Draft-First Safety:</strong> Every AI action becomes a draft you review before it goes live. Hover over any toggle for more details.
                  </span>
                </motion.div>

                {/* Toggle Cards */}
                <div className="flex flex-col gap-3">
                  {AI_TOGGLES.map((toggle, i) => (
                    <motion.div
                      key={toggle.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.08, duration: 0.3, ease: EASE_SMOOTH }}
                    >
                      <ToggleSwitch
                        label={toggle.label}
                        description={toggle.description}
                        tooltip={toggle.tooltip}
                        enabled={toggles[toggle.id]}
                        onChange={() => toggleKey(toggle.id)}
                        highlight={toggle.id === 'requireApproval'}
                      />
                    </motion.div>
                  ))}
                </div>

                {/* Config summary */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4 rounded-xl border p-3"
                  style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                      Features enabled
                    </span>
                    <span className="text-[11px] font-semibold" style={{ color: '#c3f53b' }}>
                      {Object.values(toggles).filter(Boolean).length} of {AI_TOGGLES.length}
                    </span>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════
                STEP 5: You're Ready!
            ═══════════════════════════════════════════ */}
            {step === 4 && (
              <motion.div
                key="done"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: EASE_SMOOTH }}
                className="flex flex-col items-center pt-4 text-center"
              >
                {/* Success Orb */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, ease: EASE_BOUNCE }}
                  className="relative w-28 h-28 flex items-center justify-center"
                >
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'radial-gradient(circle, rgba(195,245,59,0.3) 0%, transparent 70%)',
                      filter: 'blur(10px)',
                    }}
                    animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <motion.div
                    className="relative w-20 h-20 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #c3f53b, #a8d936)',
                      boxShadow: '0 0 40px rgba(195,245,59,0.3)',
                    }}
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ duration: 0.5, ease: EASE_BOUNCE, delay: 0.2 }}
                    >
                      <CheckCircle2 size={36} className="text-black" />
                    </motion.div>
                  </motion.div>
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="mt-6 font-space text-2xl sm:text-3xl font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Your Intelligent Campaign Workspace is ready
                </motion.h2>

                {/* Summary Card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  className="mt-6 w-full rounded-xl border p-4 text-left"
                  style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                    Configuration Summary
                  </p>

                  {/* Platforms connected */}
                  <div className="flex items-start gap-3 mb-3">
                    <BarChart3 size={15} className="mt-0.5 flex-shrink-0" style={{ color: '#c3f53b' }} />
                    <div>
                      <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                        {connectedCount} Platforms Connected
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        {PLATFORMS.filter((p) => platforms[p.id]?.connected)
                          .map((p) => p.name)
                          .join(', ')}
                      </p>
                    </div>
                  </div>

                  {/* Goals set */}
                  <div className="flex items-start gap-3 mb-3">
                    <Target size={15} className="mt-0.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
                    <div>
                      <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                        {GOALS.length} Goals Configured
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        {GOALS.map((g) => `${g.label}: ${g.prefix || ''}${goals[g.id]}${g.suffix || ''}`).join(' · ')}
                      </p>
                    </div>
                  </div>

                  {/* AI settings */}
                  <div className="flex items-start gap-3">
                    <Bot size={15} className="mt-0.5 flex-shrink-0" style={{ color: '#8b5cf6' }} />
                    <div>
                      <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                        AI Agent: {Object.values(toggles).filter(Boolean).length} features active
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        {toggles.requireApproval ? 'Approval required for all changes' : 'Auto-approval enabled'}
                        {toggles.aiOptimization ? ' · AI optimization on' : ''}
                        {toggles.autoPause ? ' · Auto-pause on' : ''}
                        {toggles.morningBrief ? ' · Morning Brief on' : ''}
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55, duration: 0.4 }}
                  className="mt-6 flex flex-col w-full gap-3"
                >
                  <button
                    type="button"
                    onClick={goToDashboard}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:brightness-110"
                    style={{
                      background: '#c3f53b',
                      color: '#000',
                      boxShadow: '0 0 30px rgba(195,245,59,0.2)',
                    }}
                  >
                    Go to Dashboard
                    <ArrowRight size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={handleStartTour}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-all duration-200 hover:bg-white/5"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <Sparkles size={15} style={{ color: '#c3f53b' }} />
                    Take a Tour
                  </button>

                  <button
                    type="button"
                    onClick={() => goToStep(0)}
                    className="flex h-9 w-full items-center justify-center gap-1.5 text-xs transition-colors hover:text-white/80"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <RotateCcw size={12} />
                    Start Over
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Bottom Navigation ─── */}
          {step < totalSteps - 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-8 flex items-center justify-between"
            >
              <button
                type="button"
                onClick={goPrev}
                disabled={step === 0}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5"
                style={{ color: 'var(--text-secondary)' }}
              >
                <ChevronLeft size={16} />
                Back
              </button>

              {/* Step dots (bottom) */}
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalSteps - 1 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goToStep(i)}
                    className="rounded-full transition-all duration-200"
                    style={{
                      width: i === step ? 18 : 6,
                      height: 6,
                      background: i === step ? '#c3f53b' : 'var(--text-muted)',
                      opacity: i === step ? 1 : 0.4,
                    }}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={goNext}
                className="flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:brightness-110"
                style={{
                  background: '#c3f53b',
                  color: '#000',
                }}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </motion.div>
          )}

          {/* Spacer for scroll */}
          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}
