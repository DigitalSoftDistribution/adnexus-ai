// @ts-nocheck
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  CheckCircle2,
  Plus,
  X,
  Shield,
  Users,
  Target,
  TrendingUp,
  DollarSign,
  MousePointerClick,
  Link2,
  Zap,
} from 'lucide-react';

/* ── Demo mode detection ── */
const getIsDemoMode = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  return !apiUrl || apiUrl === '' || apiUrl.includes('localhost');
};
const isDemoMode = getIsDemoMode();

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

/* ═══════════════ Mock Demo Data ═══════════════ */
const DEMO_MOCK = {
  platforms: {
    meta: { accountId: 'act_123456789', connected: true },
    google: { accountId: '123-456-7890', devToken: 'demo-dev-token', mcc: 'My Agency MCC', connected: true },
    tiktok: { accountId: 'tiktok_987654321', connected: true },
    snap: { accountId: '', connected: false },
  },
  goals: {
    targetROAS: 3.5,
    targetCPA: 25,
    monthlyBudget: 50000,
    targetCTR: 2.5,
  },
  aiToggles: {
    budgetAlerts: true,
    cpaAnomaly: true,
    creativeFatigue: true,
    morningBrief: true,
    autoPause: false,
    smartBidding: true,
    audienceInsights: true,
  },
  team: [
    { email: 'sarah@acme.com', role: 'Admin' },
    { email: 'mike@acme.com', role: 'Analyst' },
    { email: 'jessica@acme.com', role: 'Viewer' },
  ],
};

/* ═══════════════ step transitions ═══════════════ */
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 120 : -120, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -120 : 120, opacity: 0 }),
};

/* ═══════════════ Toggle Switch ═══════════════ */
const Toggle = ({ label, description, enabled, onChange }: { label: string; description: string; enabled: boolean; onChange: () => void }) => (
  <div className="flex items-start justify-between gap-4 py-3">
    <div>
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{description}</p>
    </div>
    <button
      type="button"
      onClick={onChange}
      className="relative mt-0.5 h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200"
      style={{ background: enabled ? 'var(--accent)' : 'var(--text-muted)' }}
    >
      <motion.div
        animate={{ x: enabled ? 20 : 2 }}
        transition={{ duration: 0.2, ease: easeSmooth }}
        className="absolute top-1 h-4 w-4 rounded-full bg-white shadow"
      />
    </button>
  </div>
);

/* ═══════════════ Goal Input Card ═══════════════ */
const GoalInput = ({ icon, label, description, value, onChange, prefix, suffix, min, max, step }: any) => (
  <div
    className="rounded-xl border p-4"
    style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
  >
    <div className="flex items-center gap-3 mb-3">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-lg"
        style={{ background: 'var(--accent-glow)' }}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{description}</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      {prefix && <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{prefix}</span>}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        className="h-10 w-full rounded-lg border bg-transparent px-4 text-sm outline-none transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--border-active)]"
        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
      />
      {suffix && <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{suffix}</span>}
    </div>
  </div>
);

/* ═══════════════ Platform Connect Card ═══════════════ */
const PlatformConnect = ({
  color,
  name,
  shortName,
  isOptional,
  accountId,
  setAccountId,
  connected,
  onConnect,
  connecting,
  children,
}: {
  color: string;
  name: string;
  shortName: string;
  isOptional?: boolean;
  accountId: string;
  setAccountId: (v: string) => void;
  connected: boolean;
  onConnect: () => void;
  connecting?: boolean;
  children?: React.ReactNode;
}) => (
  <div
    className="rounded-xl border p-5"
    style={{
      borderLeft: `4px solid ${connected ? color : 'transparent'}`,
      borderColor: connected ? `${color}40` : 'var(--border-subtle)',
      background: connected ? `${color}08` : 'var(--bg-elevated)',
    }}
  >
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold"
          style={{ background: `${color}20`, color }}
        >
          {shortName.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {name}
          </p>
          <div className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: connected ? 'var(--status-active)' : 'var(--text-muted)',
              }}
            />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {connected ? 'Connected' : connecting ? 'Connecting...' : 'Not connected'}
            </span>
          </div>
        </div>
      </div>
      {isOptional && (
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-tertiary)' }}
        >
          Optional
        </span>
      )}
    </div>

    {connected ? (
      <div className="flex items-center gap-2">
        <Check size={16} style={{ color: 'var(--status-active)' }} />
        <span className="text-sm" style={{ color: 'var(--status-active)' }}>
          Connected successfully
        </span>
      </div>
    ) : (
      <>
        <button
          type="button"
          onClick={onConnect}
          disabled={connecting}
          className="mb-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: color }}
        >
          {connecting ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="h-4 w-4 rounded-full border-2 border-white border-t-transparent"
              />
              Connecting...
            </>
          ) : (
            <>Sign in with {name}</>
          )}
        </button>
        <div className="relative my-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full" style={{ borderTop: '1px solid var(--border-subtle)' }} />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2" style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>
              or enter manually
            </span>
          </div>
        </div>
        <input
          type="text"
          placeholder={`${shortName} Account ID`}
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="h-10 w-full rounded-lg border bg-transparent px-4 text-sm outline-none transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--border-active)]"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
        />
        {children}
        {accountId && (
          <button
            type="button"
            onClick={onConnect}
            className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-all hover:bg-[var(--bg-hover)]"
            style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
          >
            Test Connection
          </button>
        )}
      </>
    )}
  </div>
);

/* ═════════════════════════ ONBOARDING WIZARD ═════════════════════════ */
export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const totalSteps = 6; /* Welcome, Connect Accounts, Set Goals, Configure AI, Invite Team, Done */

  /* ── Demo banner visibility ── */
  const [showDemoBanner] = useState(isDemoMode);

  /* ── Step 1: platform states ── */
  const [metaConnected, setMetaConnected] = useState(isDemoMode ? DEMO_MOCK.platforms.meta.connected : false);
  const [metaAccountId, setMetaAccountId] = useState(isDemoMode ? DEMO_MOCK.platforms.meta.accountId : '');
  const [metaConnecting, setMetaConnecting] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(isDemoMode ? DEMO_MOCK.platforms.google.connected : false);
  const [googleAccountId, setGoogleAccountId] = useState(isDemoMode ? DEMO_MOCK.platforms.google.accountId : '');
  const [googleDevToken, setGoogleDevToken] = useState(isDemoMode ? DEMO_MOCK.platforms.google.devToken : '');
  const [googleMcc, setGoogleMcc] = useState(isDemoMode ? DEMO_MOCK.platforms.google.mcc : '');
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [tiktokConnected, setTiktokConnected] = useState(isDemoMode ? DEMO_MOCK.platforms.tiktok.connected : false);
  const [tiktokAccountId, setTiktokAccountId] = useState(isDemoMode ? DEMO_MOCK.platforms.tiktok.accountId : '');
  const [tiktokConnecting, setTiktokConnecting] = useState(false);
  const [snapConnected, setSnapConnected] = useState(isDemoMode ? DEMO_MOCK.platforms.snap.connected : false);
  const [snapAccountId, setSnapAccountId] = useState(isDemoMode ? DEMO_MOCK.platforms.snap.accountId : '');
  const [snapConnecting, setSnapConnecting] = useState(false);

  /* ── Step 2: goals ── */
  const [goals, setGoals] = useState({
    targetROAS: isDemoMode ? DEMO_MOCK.goals.targetROAS : 3.0,
    targetCPA: isDemoMode ? DEMO_MOCK.goals.targetCPA : 30,
    monthlyBudget: isDemoMode ? DEMO_MOCK.goals.monthlyBudget : 10000,
    targetCTR: isDemoMode ? DEMO_MOCK.goals.targetCTR : 2.0,
  });

  /* ── Step 3: AI toggles ── */
  const [toggles, setToggles] = useState({
    budgetAlerts: isDemoMode ? DEMO_MOCK.aiToggles.budgetAlerts : true,
    cpaAnomaly: isDemoMode ? DEMO_MOCK.aiToggles.cpaAnomaly : true,
    creativeFatigue: isDemoMode ? DEMO_MOCK.aiToggles.creativeFatigue : true,
    morningBrief: isDemoMode ? DEMO_MOCK.aiToggles.morningBrief : false,
    autoPause: isDemoMode ? DEMO_MOCK.aiToggles.autoPause : false,
    smartBidding: isDemoMode ? DEMO_MOCK.aiToggles.smartBidding : true,
    audienceInsights: isDemoMode ? DEMO_MOCK.aiToggles.audienceInsights : true,
  });

  /* ── Step 4: team invite ── */
  const [teamEmails, setTeamEmails] = useState<{ email: string; role: string }[]>(
    isDemoMode ? [...DEMO_MOCK.team] : []
  );
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Analyst');
  const [inviting, setInviting] = useState(false);

  /* ── Connect handler using real API + OAuth ── */
  const handleConnect = async (
    platformName: string,
    setConnected: (v: boolean) => void,
    setConnecting: (v: boolean) => void,
  ) => {
    // If demo mode or no API configured, simulate
    if (isDemoMode || !import.meta.env.VITE_SUPABASE_URL) {
      setConnecting(true);
      setTimeout(() => {
        setConnecting(false);
        setConnected(true);
      }, 800);
      return;
    }

    try {
      setConnecting(true);
      const workspaceId = workspace?.id;
      if (!workspaceId) {
        console.error('No workspace ID available');
        return;
      }

      const result = await settingsApi.connectAccount(platformName, workspaceId);

      if ('redirectUrl' in result) {
        // OAuth flow — redirect user to platform
        window.location.href = result.redirectUrl;
      } else {
        // Direct connection — account created
        setConnected(true);
      }
    } catch (err) {
      console.error(`Failed to connect ${platformName}:`, err);
    } finally {
      setConnecting(false);
    }
  };

  /* ── Simulated team invite handler ── */
  const handleInviteTeam = async () => {
    if (isDemoMode) {
      /* Skip real API call in demo mode */
      setInviting(true);
      await new Promise((r) => setTimeout(r, 600));
      setInviting(false);
      return;
    }
    /* Production mode — would call real API */
    setInviting(true);
    setTimeout(() => setInviting(false), 800);
  };

  /* ── Team management ── */
  const addTeamMember = () => {
    if (!newEmail) return;
    if (!newEmail.includes('@')) return;
    setTeamEmails([...teamEmails, { email: newEmail, role: newRole }]);
    setNewEmail('');
  };

  const removeTeamMember = (idx: number) => {
    setTeamEmails(teamEmails.filter((_, i) => i !== idx));
  };

  /* ── Goal handlers ── */
  const setGoal = (key: keyof typeof goals, value: number) => {
    setGoals((prev) => ({ ...prev, [key]: value }));
  };

  const goNext = () => {
    if (step < totalSteps - 1) {
      setDir(1);
      setStep(step + 1);
    }
  };

  const goPrev = () => {
    if (step > 0) {
      setDir(-1);
      setStep(step - 1);
    }
  };

  const skip = () => {
    setDir(1);
    setStep(step + 1);
  };

  const progress = ((step + 1) / totalSteps) * 100;

  const toggleKey = (k: keyof typeof toggles) =>
    setToggles((prev) => ({ ...prev, [k]: !prev[k] }));

  const connectedCount = [metaConnected, googleConnected, tiktokConnected, snapConnected].filter(Boolean).length;

  /* Set flag so ProductTour auto-triggers on first dashboard visit after onboarding */
  useEffect(() => {
    if (step === totalSteps - 1) {
      try {
        localStorage.setItem('adnexus_tour_first_login', 'true');
      } catch {
        /* localStorage unavailable */
      }
    }
  }, [step, totalSteps]);

  /* Auto-advance from welcome in demo mode after a short delay */
  useEffect(() => {
    if (isDemoMode && step === 0) {
      const timer = setTimeout(() => {
        /* User still on welcome — subtle hint */
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  return (
    <>
    <SEO
      title="Welcome to AdNexus AI"
      description="Complete your AdNexus AI onboarding. Connect ad accounts, set up your workspace, and launch your first AI-optimized campaign."
      keywords="onboarding, getting started, setup, first campaign"
    />
    <div
      className="flex min-h-[100dvh] w-full flex-col"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* ═══════════ Demo Mode Banner ═══════════ */}
      <AnimatePresence>
        {showDemoBanner && (
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

      {/* ═══════════ Progress Bar ═══════════ */}
      <div className="h-1 w-full" style={{ background: 'var(--bg-secondary)' }}>
        <motion.div
          className="h-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: easeSmooth }}
          style={{ background: 'var(--accent)' }}
        />
      </div>

      {/* ═══════════ Content Area ═══════════ */}
      <div className="relative flex flex-1 items-start justify-center overflow-y-auto px-6 py-8">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait" custom={dir}>

            {/* ═══════════════════════════════════════════
                ─── Step 0: Welcome ───
            ═══════════════════════════════════════════ */}
            {step === 0 && (
              <motion.div
                key="welcome"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: easeSmooth }}
                className="flex flex-col items-center pt-12 text-center"
              >
                {/* Gradient orb */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, ease: easeSmooth }}
                  className="relative mb-10"
                >
                  <div
                    className="h-32 w-32 rounded-full blur-xl"
                    style={{
                      background:
                        'radial-gradient(circle, rgba(37,99,235,0.3), transparent 70%)',
                    }}
                  />
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Sparkles
                      size={48}
                      style={{ color: 'var(--accent)' }}
                      className="drop-shadow-lg"
                    />
                  </motion.div>
                </motion.div>

                <h2
                  className="font-space text-4xl font-semibold tracking-tight"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Let&apos;s get your ad intelligence set up
                </h2>
                <p
                  className="mt-3 max-w-md text-base"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Connect your ad accounts, set your goals, and our AI agent will start
                  monitoring in minutes.
                </p>

                {/* Quick preview of onboarding steps */}
                <div className="mt-8 flex flex-col gap-3 w-full max-w-sm">
                  {[
                    { icon: <Link2 size={16} />, label: 'Connect ad accounts', sub: 'Meta, Google, TikTok & Snap' },
                    { icon: <Target size={16} />, label: 'Set your goals', sub: 'ROAS, CPA, budget & CTR targets' },
                    { icon: <Shield size={16} />, label: 'Configure AI agent', sub: 'Alerts, automations & insights' },
                    { icon: <Users size={16} />, label: 'Invite your team', sub: 'Collaborate on campaigns' },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.3 }}
                      className="flex items-center gap-3 rounded-lg border px-4 py-3 text-left"
                      style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                        style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
                      >
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {item.label}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {item.sub}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={goNext}
                  className="mt-10 flex h-12 items-center gap-2 rounded-lg px-8 text-base font-medium text-white transition-all hover:opacity-90"
                  style={{ background: 'var(--accent)' }}
                >
                  Get Started
                  <ChevronRight size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => (window.location.href = '/#/dashboard')}
                  className="mt-4 text-sm transition-colors hover:opacity-80"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Skip onboarding
                </button>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════
                ─── Step 1: Connect Accounts ───
            ═══════════════════════════════════════════ */}
            {step === 1 && (
              <motion.div
                key="connect"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: easeSmooth }}
              >
                <div className="flex items-center gap-3 mb-1">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ background: 'var(--accent-glow)' }}
                  >
                    <Link2 size={20} style={{ color: 'var(--accent)' }} />
                  </div>
                  <h2
                    className="font-space text-3xl font-semibold tracking-tight"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Connect your accounts
                  </h2>
                </div>
                <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Link your advertising platforms to start monitoring. At least one is required.
                  {isDemoMode && (
                    <span className="ml-1" style={{ color: 'var(--accent)' }}>
                      (Pre-filled with demo data)
                    </span>
                  )}
                </p>

                {/* Connection summary */}
                {connectedCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
                    style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.2)' }}
                  >
                    <CheckCircle2 size={14} style={{ color: 'var(--status-active)' }} />
                    <span style={{ color: 'var(--status-active)' }}>
                      {connectedCount} platform{connectedCount > 1 ? 's' : ''} connected
                    </span>
                  </motion.div>
                )}

                <div className="flex flex-col gap-4">
                  <PlatformConnect
                    color="var(--meta-blue)"
                    name="Meta Ads"
                    shortName="Meta"
                    accountId={metaAccountId}
                    setAccountId={setMetaAccountId}
                    connected={metaConnected}
                    connecting={metaConnecting}
                    onConnect={() =>
                      handleConnect('Meta Ads', setMetaConnected, setMetaConnecting)
                    }
                  />
                  <PlatformConnect
                    color="var(--google-red)"
                    name="Google Ads"
                    shortName="Google"
                    accountId={googleAccountId}
                    setAccountId={setGoogleAccountId}
                    connected={googleConnected}
                    connecting={googleConnecting}
                    onConnect={() =>
                      handleConnect('Google Ads', setGoogleConnected, setGoogleConnecting)
                    }
                  >
                    <input
                      type="text"
                      placeholder="Developer Token"
                      value={googleDevToken}
                      onChange={(e) => setGoogleDevToken(e.target.value)}
                      className="mt-3 h-10 w-full rounded-lg border bg-transparent px-4 text-sm outline-none transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--border-active)]"
                      style={{
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <select
                      value={googleMcc}
                      onChange={(e) => setGoogleMcc(e.target.value)}
                      className="mt-3 h-10 w-full rounded-lg border bg-transparent px-4 text-sm outline-none"
                      style={{
                        borderColor: 'var(--border-subtle)',
                        color: googleMcc ? 'var(--text-primary)' : 'var(--text-tertiary)',
                        background: 'var(--bg-elevated)',
                      }}
                    >
                      <option value="" disabled>
                        Select MCC Account
                      </option>
                      <option>My Agency MCC</option>
                      <option>Client Account MCC</option>
                    </select>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      Required for Google Ads API access
                    </p>
                  </PlatformConnect>
                  <PlatformConnect
                    color="var(--tiktok-cyan)"
                    name="TikTok Ads"
                    shortName="TikTok"
                    accountId={tiktokAccountId}
                    setAccountId={setTiktokAccountId}
                    connected={tiktokConnected}
                    connecting={tiktokConnecting}
                    onConnect={() =>
                      handleConnect('TikTok Ads', setTiktokConnected, setTiktokConnecting)
                    }
                  />
                  <PlatformConnect
                    color="var(--snap-yellow)"
                    name="Snap Ads"
                    shortName="Snap"
                    isOptional
                    accountId={snapAccountId}
                    setAccountId={setSnapAccountId}
                    connected={snapConnected}
                    connecting={snapConnecting}
                    onConnect={() =>
                      handleConnect('Snap Ads', setSnapConnected, setSnapConnecting)
                    }
                  />
                </div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════
                ─── Step 2: Set Goals ───
            ═══════════════════════════════════════════ */}
            {step === 2 && (
              <motion.div
                key="goals"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: easeSmooth }}
              >
                <div className="flex items-center gap-3 mb-1">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(245,158,11,0.15)' }}
                  >
                    <Target size={20} style={{ color: '#f59e0b' }} />
                  </div>
                  <h2
                    className="font-space text-3xl font-semibold tracking-tight"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Set your goals
                  </h2>
                </div>
                <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Define your KPI targets so the AI agent can optimize and alert accordingly.
                  {isDemoMode && (
                    <span className="ml-1" style={{ color: 'var(--accent)' }}>
                      (Pre-filled with demo values)
                    </span>
                  )}
                </p>

                <div className="grid grid-cols-1 gap-4">
                  <GoalInput
                    icon={<TrendingUp size={18} style={{ color: 'var(--accent)' }} />}
                    label="Target ROAS"
                    description="Return on ad spend you want to achieve"
                    value={goals.targetROAS}
                    onChange={(v: number) => setGoal('targetROAS', v)}
                    suffix="x"
                    min={0.5}
                    max={20}
                    step={0.1}
                  />
                  <GoalInput
                    icon={<DollarSign size={18} style={{ color: '#10b981' }} />}
                    label="Target CPA"
                    description="Maximum cost per acquisition"
                    value={goals.targetCPA}
                    onChange={(v: number) => setGoal('targetCPA', v)}
                    prefix="$"
                    min={1}
                    max={10000}
                    step={1}
                  />
                  <GoalInput
                    icon={<DollarSign size={18} style={{ color: '#f59e0b' }} />}
                    label="Monthly Budget"
                    description="Total ad spend budget per month"
                    value={goals.monthlyBudget}
                    onChange={(v: number) => setGoal('monthlyBudget', v)}
                    prefix="$"
                    min={100}
                    max={10000000}
                    step={100}
                  />
                  <GoalInput
                    icon={<MousePointerClick size={18} style={{ color: '#8b5cf6' }} />}
                    label="Target CTR"
                    description="Click-through rate benchmark"
                    value={goals.targetCTR}
                    onChange={(v: number) => setGoal('targetCTR', v)}
                    suffix="%"
                    min={0.1}
                    max={50}
                    step={0.1}
                  />
                </div>

                {/* Goal summary */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 rounded-lg border p-4"
                  style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
                >
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>
                    AI Agent will optimize for:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: `ROAS ≥ ${goals.targetROAS}x`, color: 'var(--accent)' },
                      { label: `CPA ≤ $${goals.targetCPA}`, color: '#10b981' },
                      { label: `Budget $${goals.monthlyBudget.toLocaleString()}`, color: '#f59e0b' },
                      { label: `CTR ≥ ${goals.targetCTR}%`, color: '#8b5cf6' },
                    ].map((chip, i) => (
                      <span
                        key={i}
                        className="rounded-full px-3 py-1 text-xs font-medium"
                        style={{ background: `${chip.color}15`, color: chip.color }}
                      >
                        {chip.label}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════
                ─── Step 3: Configure AI ───
            ═══════════════════════════════════════════ */}
            {step === 3 && (
              <motion.div
                key="ai"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: easeSmooth }}
              >
                <div className="flex items-center gap-3 mb-1">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ background: 'var(--accent-glow)' }}
                  >
                    <Shield size={20} style={{ color: 'var(--accent)' }} />
                  </div>
                  <h2
                    className="font-space text-3xl font-semibold tracking-tight"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Configure AI Agent
                  </h2>
                </div>
                <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Choose which alerts, automations and insights you want enabled.
                  {isDemoMode && (
                    <span className="ml-1" style={{ color: 'var(--accent)' }}>
                      (Pre-configured for demo)
                    </span>
                  )}
                </p>

                <div
                  className="divide-y rounded-xl border px-4"
                  style={{
                    background: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <Toggle
                    label="Budget pacing alerts"
                    description="Notify me when campaigns approach their budget cap"
                    enabled={toggles.budgetAlerts}
                    onChange={() => toggleKey('budgetAlerts')}
                  />
                  <Toggle
                    label="CPA anomaly detection"
                    description="Flag when cost-per-acquisition spikes unexpectedly"
                    enabled={toggles.cpaAnomaly}
                    onChange={() => toggleKey('cpaAnomaly')}
                  />
                  <Toggle
                    label="Creative fatigue warnings"
                    description="Alert when ad frequency gets too high"
                    enabled={toggles.creativeFatigue}
                    onChange={() => toggleKey('creativeFatigue')}
                  />
                  <Toggle
                    label="Morning Brief"
                    description="Send me a daily summary at 8 AM"
                    enabled={toggles.morningBrief}
                    onChange={() => toggleKey('morningBrief')}
                  />
                  <Toggle
                    label="Auto-pause underperformers"
                    description="Automatically draft pauses for ROAS below target"
                    enabled={toggles.autoPause}
                    onChange={() => toggleKey('autoPause')}
                  />
                  <Toggle
                    label="Smart bidding suggestions"
                    description="AI-recommended bid adjustments based on performance"
                    enabled={toggles.smartBidding}
                    onChange={() => toggleKey('smartBidding')}
                  />
                  <Toggle
                    label="Audience insights"
                    description="Weekly breakdown of top-performing audience segments"
                    enabled={toggles.audienceInsights}
                    onChange={() => toggleKey('audienceInsights')}
                  />
                </div>

                {/* AI config summary */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 rounded-lg border p-3"
                  style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      Features enabled
                    </span>
                    <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                      {Object.values(toggles).filter(Boolean).length} of {Object.keys(toggles).length}
                    </span>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════
                ─── Step 4: Invite Team ───
            ═══════════════════════════════════════════ */}
            {step === 4 && (
              <motion.div
                key="team"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: easeSmooth }}
              >
                <div className="flex items-center gap-3 mb-1">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(139,92,246,0.15)' }}
                  >
                    <Users size={20} style={{ color: '#8B5CF6' }} />
                  </div>
                  <h2
                    className="font-space text-3xl font-semibold tracking-tight"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Invite your team
                  </h2>
                </div>
                <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Add teammates to collaborate on your ad campaigns.
                  {isDemoMode && teamEmails.length > 0 && (
                    <span className="ml-1" style={{ color: 'var(--accent)' }}>
                      ({teamEmails.length} demo members pre-added)
                    </span>
                  )}
                </p>

                {/* Add member */}
                <div
                  className="rounded-xl border p-4"
                  style={{
                    background: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="colleague@company.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTeamMember()}
                      className="h-10 flex-1 rounded-lg border bg-transparent px-4 text-sm outline-none transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--border-active)]"
                      style={{
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="h-10 rounded-lg border bg-transparent px-3 text-sm outline-none"
                      style={{
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-primary)',
                        background: 'var(--bg-elevated)',
                      }}
                    >
                      <option>Admin</option>
                      <option>Analyst</option>
                      <option>Viewer</option>
                    </select>
                    <button
                      type="button"
                      onClick={addTeamMember}
                      className="flex h-10 w-10 items-center justify-center rounded-lg transition-all hover:opacity-80"
                      style={{ background: 'var(--accent)', color: '#fff' }}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                {/* Member list */}
                {teamEmails.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 flex flex-col gap-2"
                  >
                    {teamEmails.map((member, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border px-4 py-2.5"
                        style={{
                          background: 'var(--bg-elevated)',
                          borderColor: 'var(--border-subtle)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                            style={{
                              background: 'var(--accent-glow)',
                              color: 'var(--accent)',
                            }}
                          >
                            {member.email.charAt(0).toUpperCase()}
                          </div>
                          <span
                            className="text-sm"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {member.email}
                          </span>
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{
                              background: 'rgba(37,99,235,0.1)',
                              color: 'var(--accent)',
                            }}
                          >
                            {member.role}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTeamMember(idx)}
                          style={{ color: 'var(--text-tertiary)' }}
                          className="transition-colors hover:text-[var(--status-error)]"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* Simulate send invites button */}
                {teamEmails.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    type="button"
                    onClick={handleInviteTeam}
                    disabled={inviting}
                    className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-all hover:bg-[var(--bg-hover)] disabled:opacity-50"
                    style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
                  >
                    {inviting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="h-4 w-4 rounded-full border-2 border-current border-t-transparent"
                        />
                        Sending invites...
                      </>
                    ) : (
                      <>Send {teamEmails.length} invitation{teamEmails.length > 1 ? 's' : ''}</>
                    )}
                  </motion.button>
                )}

                <button
                  type="button"
                  onClick={skip}
                  className="mt-4 text-sm transition-colors hover:opacity-80"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Skip for now
                </button>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════
                ─── Step 5: Done ───
            ═══════════════════════════════════════════ */}
            {step === 5 && (
              <motion.div
                key="done"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: easeSmooth }}
                className="flex flex-col items-center pt-8 text-center"
              >
                {/* Animated success check */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                    delay: 0.2,
                  }}
                  className="mb-8 flex h-20 w-20 items-center justify-center rounded-full"
                  style={{ background: 'rgba(16,185,129,0.15)' }}
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.5, duration: 0.4, ease: easeSmooth }}
                  >
                    <CheckCircle2
                      size={48}
                      style={{ color: 'var(--status-active)' }}
                    />
                  </motion.div>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.4, ease: easeSmooth }}
                  className="font-space text-4xl font-semibold tracking-tight"
                  style={{ color: 'var(--text-primary)' }}
                >
                  You&apos;re all set!
                </motion.h2>

                {/* Setup summary */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.4, ease: easeSmooth }}
                  className="mt-6 flex flex-wrap items-center justify-center gap-3"
                >
                  <div
                    className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
                    style={{
                      background: 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: 'var(--status-active)' }}
                    />
                    {connectedCount || (isDemoMode ? 3 : 0)} platforms connected
                  </div>
                  <div
                    className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
                    style={{
                      background: 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <Target size={12} style={{ color: '#f59e0b' }} />
                    ROAS {goals.targetROAS}x target
                  </div>
                  <div
                    className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
                    style={{
                      background: 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <Shield size={12} style={{ color: 'var(--accent)' }} />
                    AI agent monitoring
                  </div>
                  <div
                    className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
                    style={{
                      background: 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <Users size={12} style={{ color: '#8B5CF6' }} />
                    {teamEmails.length} team members
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1, duration: 0.4, ease: easeSmooth }}
                  className="mt-10 flex flex-col gap-3"
                >
                  <Link
                    to="/dashboard"
                    className="flex h-12 items-center justify-center gap-2 rounded-lg px-8 text-base font-medium text-white transition-all hover:opacity-90"
                    style={{ background: 'var(--accent)' }}
                  >
                    Go to Dashboard
                  </Link>
                  <Link
                    to="/ai-agent"
                    className="flex h-11 items-center justify-center gap-2 rounded-lg border px-6 text-sm font-medium transition-all hover:bg-[var(--bg-hover)]"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Explore AI Agent
                  </Link>
                </motion.div>

                {isDemoMode && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className="mt-6 text-xs"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    You&apos;re viewing demo data. Connect your API to see real campaigns.
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══════════ Navigation Footer ═══════════ */}
          {step < totalSteps - 1 && (
            <div
              className="mt-10 flex items-center justify-between border-t pt-6"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <button
                type="button"
                onClick={goPrev}
                disabled={step === 0}
                className="flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-30 hover:bg-[var(--bg-hover)]"
                style={{ color: 'var(--text-secondary)' }}
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              {/* Step counter */}
              <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                Step {step + 1} of {totalSteps - 1}
              </span>

              <button
                type="button"
                onClick={goNext}
                className="flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-medium text-white transition-all hover:opacity-90"
                style={{ background: 'var(--accent)' }}
              >
                {step === 0 ? 'Get Started' : step === totalSteps - 2 ? 'Finish' : 'Next'}
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
