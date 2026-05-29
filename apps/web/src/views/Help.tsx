import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Rocket,
  Plug,
  Bot,
  CheckCircle,
  CreditCard,
  Code,
  ChevronDown,
  Send,
  Paperclip,
  Keyboard,
  Play,
  Clock,
  BookOpen,
  MessageSquare,
  Zap,
  Shield,
  BarChart3,
  Users,
  Sparkles,
  X,
  Command,
  FileText,
  Globe,
  Navigation,
  CornerDownLeft,
} from 'lucide-react'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../components/ui/accordion'
import { SHORTCUTS } from '../hooks/useKeyboardShortcuts'
import SEO from '../components/SEO';

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */
const easeOut = [0.4, 0, 0.2, 1] as [number, number, number, number]

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: easeOut },
  }),
}

/* ------------------------------------------------------------------ */
/*  OS detection                                                       */
/* ------------------------------------------------------------------ */
function isMac() {
  if (typeof navigator === 'undefined') return false
  return navigator.platform.toLowerCase().includes('mac')
}

/* ------------------------------------------------------------------ */
/*  Key combo renderer                                                 */
/* ------------------------------------------------------------------ */
function KeyBadge({ label }: { label: string }) {
  return (
    <kbd
      className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[11px] font-mono font-semibold text-gray-300 border border-white/10"
      style={{ background: 'rgba(255,255,255,0.06)', minWidth: '22px' }}
    >
      {label}
    </kbd>
  )
}

function KeyCombo({ keys, keysMac }: { keys: string; keysMac?: string }) {
  const mac = isMac()
  const display = mac && keysMac ? keysMac : keys
  const parts = display
    .split(/(\+|→|→ )/g)
    .filter(Boolean)
    .flatMap((p) => (p === '+' ? [] : p.trim() === '→' ? ['→'] : [p.trim()]))
    .filter(Boolean)

  return (
    <span className="flex items-center gap-1 flex-shrink-0">
      {parts.map((part, i) =>
        part === '→' ? (
          <span key={i} className="text-[10px] text-gray-600 mx-0.5">
            then
          </span>
        ) : (
          <KeyBadge key={i} label={part} />
        )
      )}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Category config for shortcuts                                      */
/* ------------------------------------------------------------------ */
const CATEGORY_CONFIG = {
  Navigation: {
    icon: Navigation,
    color: '#c3f53b',
    bg: 'rgba(195,245,59,0.1)',
  },
  Actions: {
    icon: Zap,
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.1)',
  },
  Global: {
    icon: Globe,
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.1)',
  },
}

/* ------------------------------------------------------------------ */
/*  FAQ data                                                           */
/* ------------------------------------------------------------------ */
const FAQS = [
  {
    question: 'What is the draft-first approval workflow?',
    answer:
      'Our draft-first workflow lets you create and review campaign changes in a safe draft environment before they go live. You can build new campaigns, edit existing ones, or make bulk changes — all as drafts. Once ready, submit for approval and your team can review, comment, and approve before anything goes live. This eliminates mistakes and ensures every change is vetted.',
  },
  {
    question: 'How does the AI Agent work?',
    answer:
      'The AI Agent continuously monitors your ad accounts 24/7. It analyzes performance data, detects anomalies, identifies creative fatigue, and generates actionable recommendations. You can configure it to run on autopilot (auto-apply suggestions) or review mode (suggests, you approve). It learns from your feedback and gets smarter over time, adapting to your specific business goals and preferences.',
  },
  {
    question: 'Which ad platforms are supported?',
    answer:
      'We currently support Meta Ads (Facebook & Instagram), Google Ads (Search, Display, YouTube), TikTok Ads, and Snapchat Ads. We are actively working on Pinterest Ads, LinkedIn Ads, and Amazon Ads. You can connect multiple accounts from each platform and manage them all from a single dashboard.',
  },
  {
    question: 'How do I connect my Meta/Google/TikTok/Snap account?',
    answer:
      'Go to Settings → Platform Connections and click "Connect" next to the platform you want to add. You will be redirected to the platform\'s OAuth flow to authorize access. We use official APIs with secure token management. Your credentials are never stored on our servers — we only keep encrypted access tokens with the minimum permissions needed.',
  },
  {
    question: 'What is MCP integration?',
    answer:
      'MCP (Model Context Protocol) integration allows our AI Agent to securely access your ad platform data through a standardized protocol. It enables deeper analysis, richer context for recommendations, and seamless automation across your marketing stack. MCP ensures data privacy while giving the AI the context it needs to make intelligent decisions.',
  },
  {
    question: 'How does creative fatigue detection work?',
    answer:
      'Our system tracks creative performance metrics over time — CTR, frequency, conversion rate, and engagement. When a creative\'s performance drops significantly relative to its baseline while frequency increases, we flag it as fatigued. You will get alerts with suggestions for refreshing the creative, A/B testing alternatives, or rotating new assets in.',
  },
  {
    question: 'Can I use this with my agency clients?',
    answer:
      'Absolutely. Our Agency Hub is built specifically for agencies managing multiple clients. You can create scoped client workspaces, generate white-label reports, set up approval workflows per client, and manage billing centrally. Each client can have their own approval chains, notification preferences, and data isolation.',
  },
  {
    question: 'How is pricing calculated?',
    answer:
      'Pricing is based on your monthly ad spend across all connected accounts. We have tiered plans: Starter (up to $50K/mo), Growth ($50K–$200K/mo), Scale ($200K–$1M/mo), and Enterprise ($1M+/mo). Each tier includes a base feature set and AI usage credits. You only pay for your plan — no hidden fees or per-seat charges.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Security is our top priority. We use AES-256 encryption at rest and TLS 1.3 in transit. All API tokens are encrypted and stored in a secure vault. We are SOC 2 Type II certified and GDPR compliant. We never share your data with third parties, and you can request full data export or deletion at any time from your Settings.',
  },
  {
    question: 'How do I cancel my subscription?',
    answer:
      'You can cancel anytime from Settings → Billing → Cancel Subscription. Your access will continue until the end of your current billing period. After cancellation, your data is retained for 30 days in case you want to reactivate, then permanently deleted. You can also export all your data before canceling from Settings → Data Export.',
  },
]

/* ------------------------------------------------------------------ */
/*  Quick link cards                                                   */
/* ------------------------------------------------------------------ */
const QUICK_LINKS = [
  {
    title: 'Getting Started',
    description: 'Set up your account and first campaign',
    icon: Rocket,
    color: '#c3f53b',
    bg: 'rgba(195,245,59,0.1)',
  },
  {
    title: 'Platform Connections',
    description: 'Connect Meta, Google, TikTok & Snap',
    icon: Plug,
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.1)',
  },
  {
    title: 'AI Agent Setup',
    description: 'Configure your AI assistant',
    icon: Bot,
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.1)',
  },
  {
    title: 'Approval Workflows',
    description: 'Draft, review, and approve changes',
    icon: CheckCircle,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
  },
  {
    title: 'Billing',
    description: 'Manage plans, invoices & payments',
    icon: CreditCard,
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
  },
  {
    title: 'API Docs',
    description: 'Developer portal and reference',
    icon: Code,
    color: '#f43f5e',
    bg: 'rgba(244,63,94,0.1)',
  },
]

/* ------------------------------------------------------------------ */
/*  Video tutorials data                                               */
/* ------------------------------------------------------------------ */
const VIDEOS = [
  {
    title: 'Platform Setup',
    duration: '4:32',
    description: 'Connect your first ad platform in under 5 minutes',
  },
  {
    title: 'Creating Your First Campaign',
    duration: '7:15',
    description: 'From draft to launch with our campaign builder',
  },
  {
    title: 'Understanding AI Recommendations',
    duration: '6:48',
    description: 'How to read and act on AI Agent suggestions',
  },
  {
    title: 'Approval Workflows',
    duration: '5:22',
    description: 'Set up team approval chains and permissions',
  },
  {
    title: 'Morning Brief Overview',
    duration: '3:56',
    description: 'Your daily AI-powered performance summary',
  },
]

/* ------------------------------------------------------------------ */
/*  Subject options                                                      */
/* ------------------------------------------------------------------ */
const SUBJECTS = [
  'Account & Billing',
  'Platform Connections',
  'AI Agent & Recommendations',
  'Campaigns & Drafts',
  'Reports & Analytics',
  'API & Integrations',
  'Security & Privacy',
  'Feature Request',
  'Bug Report',
  'Other',
]

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function Help() {
  const [searchQuery, setSearchQuery] = useState('')
  const [openFaq, setOpenFaq] = useState<string>('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [ticketSubmitted, setTicketSubmitted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ---- search filter ---- */
  const filteredFaqs = searchQuery.trim()
    ? FAQS.filter(
        (f) =>
          f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : FAQS

  const filteredQuickLinks = searchQuery.trim()
    ? QUICK_LINKS.filter(
        (q) =>
          q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : QUICK_LINKS

  /* ---- ticket submit ---- */
  const handleSubmitTicket = useCallback(() => {
    if (!subject || !message.trim()) return
    setTicketSubmitted(true)
    setSubject('')
    setMessage('')
    setAttachedFile(null)
    setTimeout(() => setTicketSubmitted(false), 4000)
  }, [subject, message])

  /* ---- file attach ---- */
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) setAttachedFile(e.target.files[0])
    },
    []
  )

  /* ---- grouped shortcuts ---- */
  const groupedShortcuts = (() => {
    const map = new Map<string, typeof SHORTCUTS>()
    for (const s of SHORTCUTS) {
      const arr = map.get(s.category) || []
      arr.push(s)
      map.set(s.category, arr)
    }
    return Object.entries(CATEGORY_CONFIG).map(([cat, cfg]) => ({
      category: cat,
      config: cfg,
      items: map.get(cat) || [],
    }))
  })()

  return (
    <>
    <SEO
      title="Help Center"
      description="Get help with AdNexus AI. Browse documentation, FAQs, tutorials, and troubleshooting guides for campaign management and platform features."
      keywords="help, support, documentation, FAQ, tutorials, troubleshooting"
    />
    <div className="min-h-screen pb-24" style={{ background: '#050505' }}>
      {/* ═══════ Hero / Search ═══════ */}
      <section
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* subtle glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            width: '500px',
            height: '200px',
            background:
              'radial-gradient(ellipse, rgba(195,245,59,0.08) 0%, transparent 70%)',
          }}
        />

        <div className="max-w-4xl mx-auto px-6 pt-16 pb-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: easeOut }}
            className="text-center mb-8"
          >
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
              style={{
                background: 'rgba(195,245,59,0.1)',
                color: '#c3f53b',
                border: '1px solid rgba(195,245,59,0.2)',
              }}
            >
              <BookOpen size={13} />
              Help Center
            </div>
            <h1
              className="text-4xl md:text-5xl font-bold tracking-tight mb-3"
              style={{ color: '#fff', fontFamily: 'Space Grotesk, sans-serif' }}
            >
              How can we{' '}
              <span style={{ color: '#c3f53b' }}>help</span>?
            </h1>
            <p className="text-base md:text-lg" style={{ color: '#8A8F98' }}>
              Search our knowledge base, browse FAQs, or reach out to our support team.
            </p>
          </motion.div>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.45, ease: easeOut }}
            className="relative max-w-2xl mx-auto"
          >
            <div
              className="flex items-center gap-3 px-5 py-4 rounded-xl"
              style={{
                background: '#111111',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
              }}
            >
              <Search size={20} style={{ color: '#555B66', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-[#555B66] text-base outline-none"
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setOpenFaq('')
                  }}
                  className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {/* keyboard hint */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 pointer-events-none">
              <KeyBadge label="Ctrl" />
              <span className="text-gray-600 text-xs">+</span>
              <KeyBadge label="K" />
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        {/* ═══════ Quick Links ═══════ */}
        <motion.section
          custom={0}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center gap-2 mb-6">
            <Zap size={16} style={{ color: '#c3f53b' }} />
            <h2
              className="text-lg font-semibold"
              style={{ color: '#fff', fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Quick Links
            </h2>
          </div>

          {filteredQuickLinks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQuickLinks.map((link, idx) => {
                const Icon = link.icon
                return (
                  <motion.button
                    key={link.title}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: idx * 0.05,
                      duration: 0.35,
                      ease: easeOut,
                    }}
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                    className="flex items-start gap-4 p-5 rounded-xl text-left transition-all cursor-pointer group"
                    style={{
                      background: '#111111',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = link.color + '40'
                      e.currentTarget.style.boxShadow = `0 8px 30px ${link.color}15`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor =
                        'rgba(255,255,255,0.06)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: link.bg }}
                    >
                      <Icon size={20} style={{ color: link.color }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-white transition-colors">
                        {link.title}
                      </h3>
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: '#8A8F98' }}
                      >
                        {link.description}
                      </p>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          ) : (
            <p className="text-sm" style={{ color: '#555B66' }}>
              No quick links match your search.
            </p>
          )}
        </motion.section>

        {/* ═══════ FAQ Accordion ═══════ */}
        <motion.section
          custom={1}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare size={16} style={{ color: '#c3f53b' }} />
            <h2
              className="text-lg font-semibold"
              style={{ color: '#fff', fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Frequently Asked Questions
            </h2>
            <span
              className="ml-2 text-xs px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: '#555B66',
              }}
            >
              {filteredFaqs.length}
            </span>
          </div>

          {filteredFaqs.length > 0 ? (
            <Accordion
              type="single"
              collapsible
              value={openFaq}
              onValueChange={setOpenFaq}
              className="space-y-2"
            >
              {filteredFaqs.map((faq, idx) => (
                <motion.div
                  key={faq.question}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: idx * 0.04,
                    duration: 0.35,
                    ease: easeOut,
                  }}
                >
                  <AccordionItem
                    value={`faq-${idx}`}
                    className="rounded-xl overflow-hidden"
                    style={{
                      background: '#111111',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <AccordionTrigger className="px-5 py-4 text-sm font-medium text-gray-200 hover:text-white hover:no-underline [&[data-state=open]>svg]:text-[#c3f53b]">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-4">
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: '#8A8F98' }}
                      >
                        {faq.answer}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </Accordion>
          ) : (
            <div
              className="text-center py-12 rounded-xl"
              style={{
                background: '#111111',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <Search size={32} style={{ color: '#333', margin: '0 auto 12px' }} />
              <p className="text-sm" style={{ color: '#555B66' }}>
                No FAQs match &ldquo;{searchQuery}&rdquo;. Try a different search or contact support below.
              </p>
            </div>
          )}
        </motion.section>

        {/* ═══════ Contact Support + Keyboard Shortcuts side by side on large ═══════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ═══════ Contact Support Form ═══════ */}
          <motion.section
            custom={2}
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="flex items-center gap-2 mb-6">
              <Send size={16} style={{ color: '#c3f53b' }} />
              <h2
                className="text-lg font-semibold"
                style={{
                  color: '#fff',
                  fontFamily: 'Space Grotesk, sans-serif',
                }}
              >
                Contact Support
              </h2>
            </div>

            <div
              className="rounded-xl p-6"
              style={{
                background: '#111111',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <AnimatePresence mode="wait">
                {ticketSubmitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center justify-center py-10 text-center"
                  >
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                      style={{ background: 'rgba(16,185,129,0.1)' }}
                    >
                      <CheckCircle size={28} style={{ color: '#10b981' }} />
                    </div>
                    <h3 className="text-base font-semibold text-white mb-1">
                      Ticket Submitted
                    </h3>
                    <p className="text-sm" style={{ color: '#8A8F98' }}>
                      We will get back to you within 24 hours.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-5"
                  >
                    {/* Subject dropdown */}
                    <div>
                      <label
                        className="block text-xs font-medium mb-2"
                        style={{ color: '#8A8F98' }}
                      >
                        Subject
                      </label>
                      <div className="relative">
                        <select
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          className="w-full appearance-none rounded-lg px-4 py-3 text-sm text-white outline-none cursor-pointer"
                          style={{
                            background: '#0a0a0a',
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          <option value="">Select a topic...</option>
                          {SUBJECTS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                          style={{ color: '#555B66' }}
                        />
                      </div>
                    </div>

                    {/* Message textarea */}
                    <div>
                      <label
                        className="block text-xs font-medium mb-2"
                        style={{ color: '#8A8F98' }}
                      >
                        Message
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Describe your issue or question..."
                        rows={5}
                        className="w-full rounded-lg px-4 py-3 text-sm text-white placeholder-[#3D434C] outline-none resize-none"
                        style={{
                          background: '#0a0a0a',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      />
                    </div>

                    {/* Attach file + Submit row */}
                    <div className="flex items-center gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-colors cursor-pointer"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          color: '#8A8F98',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            'rgba(255,255,255,0.08)'
                          e.currentTarget.style.color = '#fff'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            'rgba(255,255,255,0.04)'
                          e.currentTarget.style.color = '#8A8F98'
                        }}
                      >
                        <Paperclip size={15} />
                        {attachedFile ? attachedFile.name : 'Attach File'}
                      </button>

                      {attachedFile && (
                        <button
                          onClick={() => setAttachedFile(null)}
                          className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                        >
                          <X size={15} />
                        </button>
                      )}

                      <div className="flex-1" />

                      <button
                        onClick={handleSubmitTicket}
                        disabled={!subject || !message.trim()}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          background:
                            !subject || !message.trim()
                              ? 'rgba(195,245,59,0.2)'
                              : '#c3f53b',
                          color: '#0a0a0a',
                        }}
                        onMouseEnter={(e) => {
                          if (subject && message.trim()) {
                            e.currentTarget.style.background = '#d4ff5a'
                            e.currentTarget.style.boxShadow =
                              '0 4px 20px rgba(195,245,59,0.25)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (subject && message.trim()) {
                            e.currentTarget.style.background = '#c3f53b'
                            e.currentTarget.style.boxShadow = 'none'
                          }
                        }}
                      >
                        <Send size={15} />
                        Submit Ticket
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>

          {/* ═══════ Keyboard Shortcuts ═══════ */}
          <motion.section
            custom={3}
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="flex items-center gap-2 mb-6">
              <Keyboard size={16} style={{ color: '#c3f53b' }} />
              <h2
                className="text-lg font-semibold"
                style={{
                  color: '#fff',
                  fontFamily: 'Space Grotesk, sans-serif',
                }}
              >
                Keyboard Shortcuts
              </h2>
            </div>

            <div
              className="rounded-xl p-6"
              style={{
                background: '#111111',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="space-y-5">
                {groupedShortcuts.map(
                  ({ category, config, items }, catIdx) => {
                    const CatIcon = config.icon
                    return (
                      <div key={category}>
                        <div className="flex items-center gap-2 mb-2.5">
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center"
                            style={{ background: config.bg }}
                          >
                            <CatIcon
                              size={13}
                              style={{ color: config.color }}
                            />
                          </div>
                          <span
                            className="text-[11px] font-bold uppercase tracking-widest"
                            style={{ color: config.color }}
                          >
                            {category}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-4 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors"
                            >
                              <span
                                className="text-sm"
                                style={{ color: '#b0b3b8' }}
                              >
                                {item.label}
                              </span>
                              <KeyCombo
                                keys={item.keys}
                                keysMac={item.keysMac}
                              />
                            </div>
                          ))}
                        </div>
                        {catIdx < groupedShortcuts.length - 1 && (
                          <div
                            className="mt-4"
                            style={{
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                            }}
                          />
                        )}
                      </div>
                    )
                  }
                )}
              </div>

              {/* Footer hint */}
              <div
                className="mt-4 pt-3 flex items-center justify-between"
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <span className="flex items-center gap-1 text-[11px]" style={{ color: '#555B66' }}>
                  <Command size={10} />
                  <span>Press</span>
                  <kbd className="px-1 rounded bg-white/10 text-gray-500 text-[10px]">?</kbd>
                  <span>anywhere for help</span>
                </span>
                <span className="flex items-center gap-1 text-[11px]" style={{ color: '#555B66' }}>
                  <CornerDownLeft size={10} />
                  <span>Shortcuts work globally</span>
                </span>
              </div>
            </div>
          </motion.section>
        </div>

        {/* ═══════ Video Tutorials ═══════ */}
        <motion.section
          custom={4}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center gap-2 mb-6">
            <Play size={16} style={{ color: '#c3f53b' }} />
            <h2
              className="text-lg font-semibold"
              style={{ color: '#fff', fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Video Tutorials
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {VIDEOS.map((video, idx) => (
              <motion.div
                key={video.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: idx * 0.06,
                  duration: 0.4,
                  ease: easeOut,
                }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group cursor-pointer rounded-xl overflow-hidden"
                style={{
                  background: '#111111',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(195,245,59,0.25)'
                  e.currentTarget.style.boxShadow =
                    '0 8px 30px rgba(195,245,59,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor =
                    'rgba(255,255,255,0.06)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {/* Thumbnail placeholder */}
                <div
                  className="relative flex items-center justify-center"
                  style={{
                    height: '120px',
                    background:
                      'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                  }}
                >
                  {/* Play button */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{
                      background: 'rgba(195,245,59,0.15)',
                      border: '1px solid rgba(195,245,59,0.3)',
                    }}
                  >
                    <Play
                      size={20}
                      style={{ color: '#c3f53b', marginLeft: '2px' }}
                    />
                  </div>
                  {/* Duration badge */}
                  <div
                    className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium"
                    style={{
                      background: 'rgba(0,0,0,0.7)',
                      color: '#ccc',
                    }}
                  >
                    <Clock size={10} />
                    {video.duration}
                  </div>
                  {/* Shimmer overlay */}
                  <div className="absolute inset-0 animate-shimmer opacity-30 pointer-events-none" />
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="text-sm font-medium text-white mb-1 group-hover:text-[#c3f53b] transition-colors leading-snug">
                    {video.title}
                  </h3>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: '#8A8F98' }}
                  >
                    {video.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ═══════ Footer CTA ═══════ */}
        <motion.section
          custom={5}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="text-center py-8"
        >
          <div
            className="inline-flex flex-col items-center gap-3 px-8 py-6 rounded-2xl"
            style={{
              background: '#111111',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(195,245,59,0.1)' }}
            >
              <Sparkles size={18} style={{ color: '#c3f53b' }} />
            </div>
            <div>
              <h3
                className="text-sm font-semibold text-white mb-1"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Still need help?
              </h3>
              <p className="text-xs" style={{ color: '#8A8F98' }}>
                Our team is available Monday–Friday, 9am–6pm EST.
              </p>
            </div>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-xs flex items-center gap-1" style={{ color: '#555B66' }}>
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: '#10b981',
                    boxShadow: '0 0 6px rgba(16,185,129,0.5)',
                  }}
                />
                All systems operational
              </span>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
    </>
  )
}
