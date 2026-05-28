import { useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Keyboard,
  X,
  Navigation,
  Zap,
  Globe,
  Command,
  CornerDownLeft,
} from 'lucide-react'
import type { ShortcutDef } from '../hooks/useKeyboardShortcuts'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface KeyboardShortcutsHelpProps {
  open: boolean
  onClose: () => void
  shortcuts: ShortcutDef[]
}

/* ------------------------------------------------------------------ */
/*  Category config                                                    */
/* ------------------------------------------------------------------ */
const CATEGORY_CONFIG = {
  Navigation: {
    icon: Navigation,
    color: '#84cc16', // lime-500
    bg: 'rgba(132,204,22,0.1)',
  },
  Actions: {
    icon: Zap,
    color: '#60a5fa', // blue-400
    bg: 'rgba(96,165,250,0.1)',
  },
  Global: {
    icon: Globe,
    color: '#a78bfa', // violet-400
    bg: 'rgba(167,139,250,0.1)',
  },
}

/* ------------------------------------------------------------------ */
/*  Easing                                                             */
/* ------------------------------------------------------------------ */
const easeOut = [0.4, 0, 0.2, 1] as [number, number, number, number]

/* ------------------------------------------------------------------ */
/*  OS detection                                                       */
/* ------------------------------------------------------------------ */
function isMac() {
  if (typeof navigator === 'undefined') return false
  return navigator.platform.toLowerCase().includes('mac')
}

/* ------------------------------------------------------------------ */
/*  Key renderer — pretty-prints shortcut strings                      */
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

  /* Split on +, →, or space for sequence notation */
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
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function KeyboardShortcutsHelp({
  open,
  onClose,
  shortcuts,
}: KeyboardShortcutsHelpProps) {
  /* ---- close on escape ---- */
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  /* ---- group shortcuts by category ---- */
  const grouped = useMemo(() => {
    const map = new Map<string, ShortcutDef[]>()
    for (const s of shortcuts) {
      const arr = map.get(s.category) || []
      arr.push(s)
      map.set(s.category, arr)
    }
    return Object.entries(CATEGORY_CONFIG).map(([cat, cfg]) => ({
      category: cat,
      config: cfg,
      items: map.get(cat) || [],
    }))
  }, [shortcuts])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.25, ease: easeOut }}
            className="w-full max-w-[560px] max-h-[80vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: '#141414',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            role="dialog"
            aria-label="Keyboard shortcuts help"
          >
            {/* ── Header ── */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(132,204,22,0.12)' }}
              >
                <Keyboard size={18} style={{ color: '#84cc16' }} />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-white tracking-tight">
                  Keyboard Shortcuts
                </h2>
                <p className="text-[11px] text-gray-500">
                  Press <kbd className="px-1 rounded bg-white/10 text-gray-400">?</kbd> anytime to
                  open this help
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {grouped.map(({ category, config, items }, catIdx) => {
                const CatIcon = config.icon
                return (
                  <motion.div
                    key={category}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: catIdx * 0.06 }}
                    className={catIdx > 0 ? 'mt-6' : ''}
                  >
                    {/* Category header */}
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center"
                        style={{ background: config.bg }}
                      >
                        <CatIcon size={13} style={{ color: config.color }} />
                      </div>
                      <span
                        className="text-[11px] font-bold uppercase tracking-widest"
                        style={{ color: config.color }}
                      >
                        {category}
                      </span>
                    </div>

                    {/* Shortcuts grid */}
                    <div className="grid grid-cols-1 gap-1">
                      {items.map((item, itemIdx) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: catIdx * 0.06 + itemIdx * 0.03 }}
                          className="flex items-center justify-between gap-4 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors group"
                        >
                          <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                            {item.label}
                          </span>
                          <KeyCombo keys={item.keys} keysMac={item.keysMac} />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* ── Footer ── */}
            <div
              className="flex items-center justify-between px-6 py-3 border-t border-white/10"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="flex items-center gap-3 text-[11px] text-gray-600">
                <span className="flex items-center gap-1">
                  <Command size={10} />
                  <CornerDownLeft size={10} />
                  <span>Press any shortcut</span>
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-gray-600">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 rounded bg-white/10 text-gray-500">Esc</kbd>
                  <span>Close</span>
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
