import { useEffect, useRef, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../store/useUIStore'

/* ------------------------------------------------------------------ */
/*  Route map for quick lookups                                       */
/* ------------------------------------------------------------------ */
const ROUTES: Record<string, string> = {
  dashboard: '/dashboard',
  campaigns: '/campaigns',
  ads: '/ads',
  aiAgent: '/ai-agent',
  reports: '/reports',
  inbox: '/inbox',
  drafts: '/drafts',
  settings: '/settings',
}

/* ------------------------------------------------------------------ */
/*  Shortcut definitions                                               */
/* ------------------------------------------------------------------ */
export interface ShortcutDef {
  id: string
  label: string
  keys: string
  keysMac?: string
  category: 'Navigation' | 'Actions' | 'Global'
  handler?: () => void
}

export const SHORTCUTS: ShortcutDef[] = [
  /* ── Navigation ── */
  {
    id: 'nav-dashboard',
    label: 'Go to Dashboard',
    keys: 'Ctrl+Shift+D',
    keysMac: '⌘⇧D',
    category: 'Navigation',
  },
  {
    id: 'nav-campaigns',
    label: 'Go to Campaigns',
    keys: 'Ctrl+Shift+C',
    keysMac: '⌘⇧C',
    category: 'Navigation',
  },
  {
    id: 'nav-ai-agent',
    label: 'Go to AI Agent',
    keys: 'Ctrl+Shift+A',
    keysMac: '⌘⇧A',
    category: 'Navigation',
  },
  {
    id: 'nav-reports',
    label: 'Go to Reports',
    keys: 'Ctrl+Shift+R',
    keysMac: '⌘⇧R',
    category: 'Navigation',
  },
  {
    id: 'nav-inbox',
    label: 'Go to Inbox',
    keys: 'Ctrl+Shift+I',
    keysMac: '⌘⇧I',
    category: 'Navigation',
  },
  {
    id: 'nav-settings',
    label: 'Go to Settings',
    keys: 'Ctrl+Shift+S',
    keysMac: '⌘⇧S',
    category: 'Navigation',
  },
  {
    id: 'nav-drafts-seq',
    label: 'Go to Drafts',
    keys: 'G → D',
    category: 'Navigation',
  },
  {
    id: 'nav-ads-seq',
    label: 'Go to Ads',
    keys: 'G → A',
    category: 'Navigation',
  },

  /* ── Actions ── */
  {
    id: 'cmd-palette',
    label: 'Open Command Palette',
    keys: 'Ctrl+K',
    keysMac: '⌘K',
    category: 'Actions',
  },

  /* ── Global ── */
  {
    id: 'help',
    label: 'Keyboard Shortcuts Help',
    keys: '?',
    category: 'Global',
  },
  {
    id: 'escape',
    label: 'Close Modals / Panels',
    keys: 'Esc',
    category: 'Global',
  },
]

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */
export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const { setCommandPaletteOpen, setMobileSidebarOpen } = useUIStore()
  const [helpOpen, setHelpOpen] = useState(false)

  /* ---- vim-style sequence tracking ---- */
  const pendingKeyRef = useRef<string | null>(null)
  const sequenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearSequence = useCallback(() => {
    pendingKeyRef.current = null
    if (sequenceTimerRef.current) {
      clearTimeout(sequenceTimerRef.current)
      sequenceTimerRef.current = null
    }
  }, [])

  const startSequence = useCallback(() => {
    if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current)
    sequenceTimerRef.current = setTimeout(() => {
      pendingKeyRef.current = null
    }, 800)
  }, [])

  /* ---- navigation helper ---- */
  const go = useCallback(
    (path: string) => {
      navigate(path)
    },
    [navigate]
  )

  /* ---- main keyboard handler ---- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable

      /* ── Escape: close modals/panels ── */
      if (e.key === 'Escape') {
        setHelpOpen(false)
        setMobileSidebarOpen(false)
        return
      }

      /* ── ?: open help (not in inputs) ── */
      if (e.key === '?' && !isInput) {
        e.preventDefault()
        setHelpOpen((prev) => !prev)
        return
      }

      /* ── Cmd/Ctrl+K: command palette ── */
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && !e.shiftKey) {
        // Handled by CommandPalette internally; just signal the store
        setCommandPaletteOpen(true)
        return
      }

      /* ── Cmd/Ctrl+Shift+Letter: navigation shortcuts ── */
      if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
        const key = e.key.toLowerCase()
        const map: Record<string, string> = {
          a: ROUTES.aiAgent,
          c: ROUTES.campaigns,
          d: ROUTES.dashboard,
          r: ROUTES.reports,
          i: ROUTES.inbox,
          s: ROUTES.settings,
        }
        if (map[key]) {
          e.preventDefault()
          go(map[key])
          return
        }
      }

      /* ── Vim-style sequences (not in inputs) ── */
      if (!isInput) {
        const key = e.key.toLowerCase()

        if (key === 'g') {
          e.preventDefault()
          pendingKeyRef.current = 'g'
          startSequence()
          return
        }

        if (pendingKeyRef.current === 'g') {
          if (key === 'd') {
            e.preventDefault()
            go(ROUTES.drafts)
            clearSequence()
            return
          }
          if (key === 'a') {
            e.preventDefault()
            go(ROUTES.ads)
            clearSequence()
            return
          }
          // Unknown second key — reset
          clearSequence()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearSequence()
    }
  }, [go, setCommandPaletteOpen, setMobileSidebarOpen, clearSequence, startSequence])

  return { helpOpen, setHelpOpen, shortcuts: SHORTCUTS }
}
