import { useState, useRef, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, X, Minus, Maximize2, Send, Paperclip,
  Bot, CheckCircle,
  Eye, Check, Pencil, FileText} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  DESIGN CONSTANTS                                                    */
/* ------------------------------------------------------------------ */
const C = {
  accent: '#2563EB',
  accentHover: '#1D4ED8',
  bgSecondary: '#0a0a0a',
  bgElevated: '#111111',
  borderSubtle: 'rgba(255,255,255,0.06)',
  borderActive: 'rgba(37,99,235,0.3)',
  textPrimary: '#FFFFFF',
  textSecondary: '#8A8F98',
  textTertiary: '#555B66',
  statusActive: '#10B981',
  statusWarning: '#F59E0B',
  statusError: '#EF4444',
  metaBlue: '#1877F2',
  googleRed: '#DB4437',
  tiktokCyan: '#00F2EA'}

/* ------------------------------------------------------------------ */
/*  TYPES                                                               */
/* ------------------------------------------------------------------ */
interface Message {
  id: string
  role: 'user' | 'ai'
  content: ReactNode
  timestamp: string
}

/* ------------------------------------------------------------------ */
/*  MOCK CONVERSATION DATA                                              */
/* ------------------------------------------------------------------ */
const SUGGESTED_PROMPTS = [
  "How's my ROAS trending?",
  'Which campaigns need attention?',
  'Suggest budget reallocation',
  'Create a performance report',
]

function BudgetTable() {
  const rows = [
    { campaign: 'Summer Sale (Meta)', current: '$500/day', rec: '$650/day', change: '+30%', changeColor: C.statusActive },
    { campaign: 'Hook Challenge (TikTok)', current: '$300/day', rec: '$375/day', change: '+25%', changeColor: C.statusActive },
    { campaign: 'Display Remarketing (Google)', current: '$250/day', rec: '$150/day', change: '-40%', changeColor: C.statusError },
  ]
  return (
    <div className="overflow-hidden rounded-lg mt-2 mb-2" style={{ border: '1px solid var(--border-subtle)' }}>
      <table className="w-full text-[11px]">
        <thead>
          <tr style={{ background: 'var(--bg-secondary)' }}>
            <th scope="col" className="text-left px-2.5 py-2 font-semibold" style={{ color: 'var(--text-secondary)' }}>Campaign</th>
            <th scope="col" className="text-left px-2.5 py-2 font-semibold" style={{ color: 'var(--text-secondary)' }}>Current</th>
            <th scope="col" className="text-left px-2.5 py-2 font-semibold" style={{ color: 'var(--text-secondary)' }}>Recommended</th>
            <th scope="col" className="text-left px-2.5 py-2 font-semibold" style={{ color: 'var(--text-secondary)' }}>Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <td className="px-2.5 py-2 font-medium" style={{ color: 'var(--text-primary)' }}>{r.campaign}</td>
              <td className="px-2.5 py-2 font-mono-data" style={{ color: 'var(--text-secondary)' }}>{r.current}</td>
              <td className="px-2.5 py-2 font-mono-data" style={{ color: 'var(--text-primary)' }}>{r.rec}</td>
              <td className="px-2.5 py-2 font-semibold" style={{ color: r.changeColor }}>{r.change}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ActionButtons({ buttons }: { buttons: { label: string; icon: ReactNode; primary?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {buttons.map((btn, i) => (
        <button
          key={i}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 hover:scale-[1.02]"
          style={{
            background: btn.primary ? 'var(--accent)' : 'var(--bg-secondary)',
            color: btn.primary ? 'white' : 'var(--text-primary)',
            border: btn.primary ? 'none' : '1px solid var(--border-subtle)'}}
        >
          {btn.icon}
          {btn.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  AI MESSAGE CONTENT COMPONENTS                                       */
/* ------------------------------------------------------------------ */
function BudgetReallocationMessage() {
  return (
    <div>
      <p className="text-[13px] leading-relaxed mb-2" style={{ color: 'var(--text-primary)' }}>
        Based on your campaign performance, here&apos;s my recommendation:
      </p>
      <BudgetTable />
      <p className="text-[13px] leading-relaxed mt-2" style={{ color: 'var(--text-primary)' }}>
        This reallocation could improve overall ROAS by <span className="font-semibold" style={{ color: C.statusActive }}>~18%</span>. I&apos;ve created these as drafts for your approval.
      </p>
      <ActionButtons
        buttons={[
          { label: 'View Drafts', icon: <Eye size={12} /> },
          { label: 'Approve All', icon: <Check size={12} />, primary: true },
          { label: 'Dismiss', icon: <X size={12} /> },
        ]}
      />
    </div>
  )
}

function PauseExplanationMessage() {
  return (
    <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
      Display Remarketing has a CPA of <span className="font-semibold">$72</span> over the last 7 days, which is{' '}
      <span style={{ color: C.statusError }}>44% above</span> your $50 threshold. Frequency is at{' '}
      <span className="font-semibold">3.2</span> and CTR has dropped{' '}
      <span style={{ color: C.statusError }}>28%</span>. The ROAS is 2.1x — below your 3.0x target.
    </p>
  )
}

function DuplicateConfirmationMessage() {
  return (
    <div>
      <p className="text-[13px] leading-relaxed mb-3" style={{ color: 'var(--text-primary)' }}>
        I&apos;ve created a duplicate of your &quot;Summer Sale&quot; campaign as a draft. Here&apos;s what was copied:
      </p>
      <ul className="space-y-1.5 mb-3">
        {[
          'Campaign name: "Summer Sale - Copy"',
          'Budget: $500/day (same)',
          'Ad Sets: 3 duplicated',
          'Ads: 8 duplicated',
          'Status: Draft (ready for your review)',
        ].map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            <CheckCircle size={13} className="mt-0.5 flex-shrink-0" style={{ color: C.statusActive }} />
            <span style={{ color: 'var(--text-primary)' }}>{item}</span>
          </li>
        ))}
      </ul>
      <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        Would you like me to adjust anything before you approve?
      </p>
      <ActionButtons
        buttons={[
          { label: 'View Draft', icon: <FileText size={12} /> },
          { label: 'Edit', icon: <Pencil size={12} /> },
          { label: 'Approve', icon: <Check size={12} />, primary: true },
        ]}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  INITIAL MOCK MESSAGES                                               */
/* ------------------------------------------------------------------ */
function createInitialMessages(): Message[] {
  return [
    {
      id: 'm1',
      role: 'user',
      content: 'How should I reallocate my budget?',
      timestamp: '10:23 AM'},
    {
      id: 'm2',
      role: 'ai',
      content: <BudgetReallocationMessage />,
      timestamp: '10:23 AM'},
    {
      id: 'm3',
      role: 'user',
      content: 'Why pause Display Remarketing?',
      timestamp: '10:25 AM'},
    {
      id: 'm4',
      role: 'ai',
      content: <PauseExplanationMessage />,
      timestamp: '10:25 AM'},
    {
      id: 'm5',
      role: 'user',
      content: 'Duplicate my Summer Sale campaign',
      timestamp: '10:28 AM'},
    {
      id: 'm6',
      role: 'ai',
      content: <DuplicateConfirmationMessage />,
      timestamp: '10:28 AM'},
  ]
}

/* ------------------------------------------------------------------ */
/*  TYPING INDICATOR                                                    */
/* ------------------------------------------------------------------ */
const TypingIndicator = () => (
  <div className="flex items-center gap-1 px-1 py-2">
    {[0, 1, 2].map(i => (
      <motion.span
        key={i}
        className="w-2 h-2 rounded-full"
        style={{ background: 'var(--text-tertiary)' }}
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
      />
    ))}
  </div>
)

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                      */
/* ------------------------------------------------------------------ */
export function AIChatOverlay() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages] = useState<Message[]>(createInitialMessages)
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [hasUnread, setHasUnread] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
      setHasUnread(false)
    }
  }, [isOpen, scrollToBottom])

  const handleSend = () => {
    if (!inputValue.trim()) return
    setInputValue('')
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      setTimeout(scrollToBottom, 50)
    }, 1500)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handlePromptClick = (prompt: string) => {
    setInputValue(prompt)
    inputRef.current?.focus()
  }

  const toggleOpen = () => {
    setIsOpen(!isOpen)
    setIsMinimized(false)
    if (!isOpen) setHasUnread(false)
  }

  return (
    <>
      {/* FAB TRIGGER BUTTON */}
      <motion.button
        onClick={toggleOpen}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
          boxShadow: '0 4px 24px rgba(37,99,235,0.4)'}}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X size={22} color="white" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <Sparkles size={22} color="white" />
              {/* Pulse ring for unread */}
              {hasUnread && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-[#0a0a0a]" />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulse animation when unread */}
        {hasUnread && !isOpen && (
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: 'rgba(37,99,235,0.3)', animationDuration: '2s' }}
          />
        )}
      </motion.button>

      {/* TOOLTIP ON FAB HOVER */}
      {!isOpen && (
        <div
          className="fixed bottom-24 right-6 z-[99] px-3 py-1.5 rounded-lg text-[11px] font-semibold pointer-events-none"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
        >
          Ask AI
        </div>
      )}

      {/* CHAT PANEL */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: isMinimized ? 0 : 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
            className="fixed bottom-24 right-6 z-[99] flex flex-col overflow-hidden"
            style={{
              width: 420,
              height: isMinimized ? 64 : 600,
              maxHeight: 'calc(100dvh - 120px)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 16,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)'}}
          >
            {/* HEADER */}
            <div
              className="flex items-center justify-between px-4 flex-shrink-0"
              style={{
                height: 64,
                background: 'linear-gradient(135deg, #2563EB, #3B82F6)'}}
            >
              {/* Left: AI Avatar + Name */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <Sparkles size={16} color="white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">AdNexus AI</span>
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: C.statusActive, boxShadow: `0 0 6px ${C.statusActive}` }}
                    />
                  </div>
                  <span className="text-[10px] text-white/70">Always ready to help</span>
                </div>
              </div>

              {/* Right: Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 rounded-md transition-colors hover:bg-white/10"
                >
                  {isMinimized ? <Maximize2 size={14} color="white" /> : <Minus size={14} color="white" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-md transition-colors hover:bg-white/10"
                >
                  <X size={14} color="white" />
                </button>
              </div>
            </div>

            {/* MESSAGES AREA */}
            {!isMinimized && (
              <>
                <div
                  className="flex-1 overflow-y-auto p-4 space-y-4"
                  style={{ scrollBehavior: 'smooth' }}
                >
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: msg.role === 'ai' ? 10 : -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.05 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Avatar */}
                        {msg.role === 'ai' && (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                            style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}
                          >
                            <Bot size={12} color="white" />
                          </div>
                        )}

                        {/* Bubble */}
                        <div
                          className="rounded-xl px-3.5 py-2.5"
                          style={{
                            background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-elevated)',
                            color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                            border: msg.role === 'ai' ? '1px solid var(--border-subtle)' : 'none'}}
                        >
                          {typeof msg.content === 'string' ? (
                            <p className="text-[13px] leading-relaxed">{msg.content}</p>
                          ) : (
                            msg.content
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* Typing indicator */}
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="flex gap-2 max-w-[85%]">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}
                        >
                          <Bot size={12} color="white" />
                        </div>
                        <div
                          className="rounded-xl px-3.5 py-1"
                          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                        >
                          <TypingIndicator />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* SUGGESTED PROMPTS — only show when at top/no scroll */}
                {messages.length <= 6 && !isTyping && (
                  <div className="px-4 pb-2 flex-shrink-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: 'var(--text-tertiary)' }}>
                      Suggested
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {SUGGESTED_PROMPTS.map((prompt, i) => (
                        <motion.button
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 + i * 0.08 }}
                          onClick={() => handlePromptClick(prompt)}
                          className="text-left px-3 py-2 rounded-lg text-[11px] font-medium transition-all duration-150 hover:scale-[1.01]"
                          style={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-secondary)'}}
                        >
                          {prompt}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* INPUT AREA */}
                <div
                  className="px-4 py-3 flex-shrink-0"
                  style={{ borderTop: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex items-end gap-2">
                    <button
                      className="p-2 rounded-lg transition-colors flex-shrink-0"
                      style={{ color: 'var(--text-tertiary)' }}
                      title="Attach file"
                    >
                      <Paperclip size={16} />
                    </button>
                    <div className="flex-1 relative">
                      <textarea
                        ref={inputRef}
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about your campaigns, metrics, or get recommendations..."
                        rows={1}
                        className="w-full px-3 py-2.5 rounded-lg text-[13px] resize-none outline-none transition-all"
                        style={{
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-primary)',
                          minHeight: 40,
                          maxHeight: 100}}
                      />
                    </div>
                    <button
                      onClick={handleSend}
                      disabled={!inputValue.trim()}
                      className="p-2.5 rounded-lg transition-all duration-150 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: inputValue.trim() ? 'var(--accent)' : 'var(--bg-elevated)',
                        color: 'white'}}
                    >
                      <Send size={14} />
                    </button>
                  </div>
                  <p className="text-[10px] mt-1.5 text-right" style={{ color: 'var(--text-tertiary)' }}>
                    {inputValue.length}/500
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default AIChatOverlay
