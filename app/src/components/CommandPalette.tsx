import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '../store/useUIStore'
import {
  Search,
  LayoutDashboard,
  Megaphone,
  Image,
  Bot,
  BarChart3,
  ClipboardList,
  Inbox,
  FileClock,
  Building2,
  Settings,
  Plus,
  FileText,
  Sparkles,
  Download,
  Command,
  Wand2,
  Beaker,
  Wallet,
  Copy,
  Users,
  Calendar,
  Sliders,
  Zap,
  Rocket,
  X,
  ArrowUpRight,
  Clock,
  CornerDownLeft,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface CommandItem {
  id: string
  label: string
  description: string
  icon: React.ElementType
  group: 'Navigation' | 'Actions' | 'Recent' | 'Tools'
  shortcut?: string
  route: string
  keywords?: string[]
}

interface RecentEntry {
  id: string
  label: string
  route: string
  timestamp: number
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const RECENT_STORAGE_KEY = 'adnexus_cmd_recent'
const MAX_RECENT_ITEMS = 6

const GROUP_ORDER: CommandItem['group'][] = ['Recent', 'Navigation', 'Actions', 'Tools']

/* ------------------------------------------------------------------ */
/*  Navigation Commands                                                */
/* ------------------------------------------------------------------ */
const NAV_COMMANDS: CommandItem[] = [
  {
    id: 'nav-dashboard',
    label: 'Dashboard',
    description: 'Overview of all campaigns and metrics',
    icon: LayoutDashboard,
    group: 'Navigation',
    shortcut: 'G D',
    route: '/dashboard',
    keywords: ['home', 'overview', 'main'],
  },
  {
    id: 'nav-campaigns',
    label: 'Campaigns',
    description: 'Manage campaigns across platforms',
    icon: Megaphone,
    group: 'Navigation',
    shortcut: 'G C',
    route: '/campaigns',
    keywords: ['ads', 'marketing'],
  },
  {
    id: 'nav-ads',
    label: 'Ads',
    description: 'Creative management and fatigue detection',
    icon: Image,
    group: 'Navigation',
    shortcut: 'G A',
    route: '/ads',
    keywords: ['creative', 'images', 'videos'],
  },
  {
    id: 'nav-ai-agent',
    label: 'AI Agent',
    description: 'Automation rules and AI status',
    icon: Bot,
    group: 'Navigation',
    shortcut: 'G I',
    route: '/ai-agent',
    keywords: ['automation', 'bot', 'ai'],
  },
  {
    id: 'nav-reports',
    label: 'Reports',
    description: 'Analytics, attribution, and insights',
    icon: BarChart3,
    group: 'Navigation',
    shortcut: 'G R',
    route: '/reports',
    keywords: ['analytics', 'stats', 'export'],
  },
  {
    id: 'nav-drafts',
    label: 'Drafts',
    description: 'Pending approvals and draft campaigns',
    icon: ClipboardList,
    group: 'Navigation',
    shortcut: 'G F',
    route: '/drafts',
    keywords: ['pending', 'approvals'],
  },
  {
    id: 'nav-inbox',
    label: 'Inbox',
    description: 'Notifications and alerts',
    icon: Inbox,
    group: 'Navigation',
    shortcut: 'G N',
    route: '/inbox',
    keywords: ['notifications', 'messages'],
  },
  {
    id: 'nav-audit',
    label: 'Audit Log',
    description: 'Change history and activity log',
    icon: FileClock,
    group: 'Navigation',
    shortcut: 'G L',
    route: '/audit',
    keywords: ['history', 'log', 'activity'],
  },
  {
    id: 'nav-agency',
    label: 'Agency',
    description: 'Multi-client overview and management',
    icon: Building2,
    group: 'Navigation',
    shortcut: 'G Y',
    route: '/agency',
    keywords: ['clients', 'multi'],
  },
  {
    id: 'nav-settings',
    label: 'Settings',
    description: 'Account configuration and preferences',
    icon: Settings,
    group: 'Navigation',
    shortcut: 'G S',
    route: '/settings',
    keywords: ['config', 'preferences', 'account'],
  },
  {
    id: 'nav-audiences',
    label: 'Audiences',
    description: 'Audience management and segmentation',
    icon: Users,
    group: 'Navigation',
    shortcut: 'G U',
    route: '/audiences',
    keywords: ['segments', 'people', 'targeting'],
  },
  {
    id: 'nav-pacing',
    label: 'Budget Pacing',
    description: 'Budget allocation and spend tracking',
    icon: Wallet,
    group: 'Navigation',
    shortcut: 'G B',
    route: '/pacing',
    keywords: ['budget', 'spend', 'money'],
  },
  {
    id: 'nav-calendar',
    label: 'Campaign Calendar',
    description: 'Visual campaign timeline and schedule',
    icon: Calendar,
    group: 'Navigation',
    shortcut: 'G T',
    route: '/calendar',
    keywords: ['schedule', 'timeline', 'planning'],
  },
]

/* ------------------------------------------------------------------ */
/*  Action Commands                                                    */
/* ------------------------------------------------------------------ */
const ACTION_COMMANDS: CommandItem[] = [
  {
    id: 'act-create-campaign',
    label: 'Create Campaign',
    description: 'Start a new ad campaign',
    icon: Plus,
    group: 'Actions',
    shortcut: '\u2318 N C',
    route: '/campaigns',
    keywords: ['new', 'start'],
  },
  {
    id: 'act-create-draft',
    label: 'Create Draft',
    description: 'Create a new draft for approval',
    icon: FileText,
    group: 'Actions',
    shortcut: '\u2318 N D',
    route: '/drafts',
    keywords: ['new', 'draft'],
  },
  {
    id: 'act-run-agent',
    label: 'Run Agent',
    description: 'Execute AI automation rules',
    icon: Rocket,
    group: 'Actions',
    shortcut: '\u2318 R',
    route: '/ai-agent',
    keywords: ['ai', 'automation', 'execute'],
  },
  {
    id: 'act-generate-brief',
    label: 'Generate Brief',
    description: 'Create a creative brief with AI',
    icon: Sparkles,
    group: 'Actions',
    shortcut: '\u2318 G B',
    route: '/creative-brief',
    keywords: ['creative', 'ai', 'brief'],
  },
  {
    id: 'act-export-report',
    label: 'Export Report',
    description: 'Export current view as CSV/PDF',
    icon: Download,
    group: 'Actions',
    shortcut: '\u2318 E',
    route: '/exports',
    keywords: ['download', 'csv', 'pdf'],
  },
  {
    id: 'act-ab-test',
    label: 'Create A/B Test',
    description: 'Set up a new A/B experiment',
    icon: Beaker,
    group: 'Actions',
    shortcut: '\u2318 N T',
    route: '/ab-testing',
    keywords: ['experiment', 'split', 'test'],
  },
]

/* ------------------------------------------------------------------ */
/*  Tool Commands                                                      */
/* ------------------------------------------------------------------ */
const TOOL_COMMANDS: CommandItem[] = [
  {
    id: 'tool-creative-studio',
    label: 'Creative Studio',
    description: 'AI-powered creative generation',
    icon: Wand2,
    group: 'Tools',
    route: '/creative-studio',
    keywords: ['ai', 'generate', 'images', 'videos'],
  },
  {
    id: 'tool-ab-testing',
    label: 'A/B Testing',
    description: 'Experiment management and results',
    icon: Beaker,
    group: 'Tools',
    route: '/ab-testing',
    keywords: ['experiments', 'split test'],
  },
  {
    id: 'tool-budget-pacing',
    label: 'Budget Pacing',
    description: 'Budget allocation and pacing controls',
    icon: Wallet,
    group: 'Tools',
    route: '/pacing',
    keywords: ['spend', 'allocation'],
  },
  {
    id: 'tool-templates',
    label: 'Templates',
    description: 'Campaign templates library',
    icon: Copy,
    group: 'Tools',
    route: '/templates',
    keywords: ['library', 'saved', 'reusable'],
  },
  {
    id: 'tool-audiences',
    label: 'Audience Manager',
    description: 'Segment and manage audiences',
    icon: Users,
    group: 'Tools',
    route: '/audiences',
    keywords: ['segments', 'targeting'],
  },
  {
    id: 'tool-morning-brief',
    label: 'Morning Brief',
    description: 'Daily performance digest',
    icon: Zap,
    group: 'Tools',
    route: '/morning-brief',
    keywords: ['daily', 'digest', 'summary'],
  },
  {
    id: 'tool-exports',
    label: 'Export Center',
    description: 'Data exports and scheduled reports',
    icon: Download,
    group: 'Tools',
    route: '/exports',
    keywords: ['download', 'data'],
  },
  {
    id: 'tool-developers',
    label: 'Developer Portal',
    description: 'API keys and documentation',
    icon: Sliders,
    group: 'Tools',
    route: '/developers',
    keywords: ['api', 'docs', 'integration'],
  },
]

/* ------------------------------------------------------------------ */
/*  Utility: localStorage helpers                                      */
/* ------------------------------------------------------------------ */
function loadRecent(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentEntry[]
    return parsed.filter(
      (r) => Date.now() - r.timestamp < 7 * 24 * 60 * 60 * 1000
    )
  } catch {
    return []
  }
}

function saveRecent(entries: RecentEntry[]) {
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(entries))
}

function addRecentRoute(route: string, label: string) {
  const existing = loadRecent()
  const filtered = existing.filter((e) => e.route !== route)
  const next = [
    { id: `recent-${Date.now()}`, label, route, timestamp: Date.now() },
    ...filtered,
  ].slice(0, MAX_RECENT_ITEMS)
  saveRecent(next)
}

/* ------------------------------------------------------------------ */
/*  Fuzzy search helper                                                */
/* ------------------------------------------------------------------ */
function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase()
  const t = text.toLowerCase()

  // Exact match gets highest score
  if (t === q) return 100
  // Starts with query
  if (t.startsWith(q)) return 80
  // Includes query
  if (t.includes(q)) return 60

  // Fuzzy: each char in query appears in text in order
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  if (qi === q.length) return 40

  return 0
}

function searchCommands(items: CommandItem[], query: string): CommandItem[] {
  if (!query.trim()) return items
  const q = query.trim()

  return items
    .map((item) => {
      let score = fuzzyScore(q, item.label)
      score = Math.max(score, fuzzyScore(q, item.description))
      if (item.keywords) {
        for (const kw of item.keywords) {
          score = Math.max(score, fuzzyScore(q, kw))
        }
      }
      return { item, score }
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.item)
}

/* ------------------------------------------------------------------ */
/*  Group icon map                                                     */
/* ------------------------------------------------------------------ */
const GROUP_ICONS: Record<string, React.ElementType> = {
  Navigation: ArrowUpRight,
  Actions: Zap,
  Recent: Clock,
  Tools: Sliders,
}

/* ------------------------------------------------------------------ */
/*  Easing tokens                                                      */
/* ------------------------------------------------------------------ */
const easeOut = [0.4, 0, 0.2, 1] as [number, number, number, number]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function CommandPalette() {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recent, setRecent] = useState<RecentEntry[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore()

  /* ---- sync open state from store (navbar trigger) ---- */
  useEffect(() => {
    if (commandPaletteOpen) {
      setOpen(true)
      setCommandPaletteOpen(false)
    }
  }, [commandPaletteOpen, setCommandPaletteOpen])

  /* ---- load recent items ---- */
  useEffect(() => {
    if (open) {
      setRecent(loadRecent())
    }
  }, [open])

  /* ---- close on route change ---- */
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  /* ---- track current page in recent ---- */
  const lastPathRef = useRef(location.pathname)
  useEffect(() => {
    const path = location.pathname
    if (path !== lastPathRef.current && path !== '/') {
      const cmd = ALL_STATIC.find((c) => c.route === path)
      if (cmd) {
        addRecentRoute(path, cmd.label)
      } else {
        // Derive label from path
        const label = path
          .split('/')
          .filter(Boolean)
          .pop()
          ?.replace(/-/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase()) || path
        addRecentRoute(path, label)
      }
      lastPathRef.current = path
    }
  }, [location.pathname])

  /* ---- helpers ---- */
  const go = useCallback(
    (path: string) => {
      setOpen(false)
      setQuery('')
      navigate(path)
    },
    [navigate]
  )

  /* ---- static commands ---- */
  const ALL_STATIC = useMemo(
    () => [...NAV_COMMANDS, ...ACTION_COMMANDS, ...TOOL_COMMANDS],
    []
  )

  /* ---- build recent commands ---- */
  const recentCommands: CommandItem[] = useMemo(() => {
    return recent.map((entry) => {
      const staticCmd = ALL_STATIC.find((c) => c.route === entry.route)
      return {
        id: `recent-${entry.route}`,
        label: entry.label,
        description: staticCmd?.description || `Go to ${entry.label}`,
        icon: staticCmd?.icon || Clock,
        group: 'Recent' as const,
        route: entry.route,
        keywords: staticCmd?.keywords,
      }
    })
  }, [recent, ALL_STATIC])

  /* ---- all commands combined ---- */
  const allCommands = useMemo(
    () => [...recentCommands, ...ALL_STATIC],
    [recentCommands, ALL_STATIC]
  )

  /* ---- filter by search ---- */
  const filtered = useMemo(
    () => searchCommands(allCommands, query),
    [allCommands, query]
  )

  /* ---- group filtered results ---- */
  const grouped = useMemo(() => {
    const map = new Map<CommandItem['group'], CommandItem[]>()
    filtered.forEach((item) => {
      const arr = map.get(item.group) || []
      arr.push(item)
      map.set(item.group, arr)
    })

    const result: { group: CommandItem['group']; items: CommandItem[] }[] = []
    GROUP_ORDER.forEach((g) => {
      if (map.has(g)) result.push({ group: g, items: map.get(g)! })
    })
    return result
  }, [filtered])

  const totalVisible = filtered.length

  /* ---- reset selection on query change ---- */
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  /* ---- focus input on open ---- */
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  /* ---- scroll selected into view ---- */
  useEffect(() => {
    if (selectedRef.current && listRef.current) {
      selectedRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedIndex])

  /* ---- keyboard handler ---- */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Cmd+K / Ctrl+K toggle
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
        return
      }

      if (!open) return

      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          setOpen(false)
          setQuery('')
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % totalVisible)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + totalVisible) % totalVisible)
          break
        case 'Enter':
          e.preventDefault()
          if (filtered[selectedIndex]) {
            go(filtered[selectedIndex].route)
          }
          break
        case 'Home':
          e.preventDefault()
          setSelectedIndex(0)
          break
        case 'End':
          e.preventDefault()
          setSelectedIndex(totalVisible - 1)
          break
        case 'pagedown':
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 5, totalVisible - 1))
          break
        case 'pageup':
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 5, 0))
          break
      }
    },
    [open, totalVisible, selectedIndex, filtered, go]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  /* ---- execute and track ---- */
  const execute = useCallback(
    (item: CommandItem) => {
      addRecentRoute(item.route, item.label)
      go(item.route)
    },
    [go]
  )

  /* ---- render helpers ---- */
  let globalIdx = -1

  const groupIcon = (g: CommandItem['group']) => {
    const Icon = GROUP_ICONS[g] || ArrowUpRight
    return <Icon size={12} />
  }

  return (
    <>
      {/* Floating FAB trigger (bottom-right) */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, duration: 0.3 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg cursor-pointer"
        style={{ background: 'var(--accent)', boxShadow: '0 0 30px rgba(37,99,235,0.3)' }}
        title="Command Palette (Cmd+K)"
      >
        <Command size={16} />
        <span className="hidden sm:inline">Cmd K</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setOpen(false)
                setQuery('')
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.2, ease: easeOut }}
              className="w-full max-w-[640px] rounded-xl overflow-hidden shadow-2xl"
              style={{
                background: '#1a1a1a',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              role="dialog"
              aria-label="Command palette"
            >
              {/* ---- Search Input ---- */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <Search
                  size={18}
                  className="text-gray-500 flex-shrink-0"
                />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search pages, actions, and tools..."
                  className="flex-1 bg-transparent text-base outline-none placeholder:text-gray-600 text-white"
                />
                {query && (
                  <button
                    onClick={() => {
                      setQuery('')
                      inputRef.current?.focus()
                    }}
                    className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
                <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-white/10 text-gray-500 flex-shrink-0">
                  ESC
                </span>
              </div>

              {/* ---- Results ---- */}
              <div
                ref={listRef}
                className="max-h-[400px] overflow-y-auto py-2"
              >
                {totalVisible === 0 ? (
                  <div className="px-6 py-10 text-center">
                    <Search
                      size={32}
                      className="mx-auto mb-3 text-gray-700"
                    />
                    <p className="text-sm text-gray-400 mb-1">
                      No results found for &ldquo;{query}&rdquo;
                    </p>
                    <p className="text-xs text-gray-600">
                      Try a different keyword or check spelling
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-600">
                      <span>Tip: Use</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-500">
                        ↑↓
                      </kbd>
                      <span>to navigate,</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-500">
                        ↵
                      </kbd>
                      <span>to select</span>
                    </div>
                  </div>
                ) : (
                  grouped.map((g, gIdx) => (
                    <motion.div
                      key={g.group}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: gIdx * 0.04 }}
                    >
                      {/* Group header */}
                      <div className="flex items-center gap-1.5 px-4 py-1.5">
                        <span className="text-gray-600">
                          {groupIcon(g.group)}
                        </span>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                          {g.group}
                        </span>
                        {g.group === 'Recent' && (
                          <span className="text-[10px] text-gray-700 ml-auto">
                            {recent.length} items
                          </span>
                        )}
                      </div>

                      {/* Items */}
                      {g.items.map((item) => {
                        globalIdx++
                        const idx = globalIdx
                        const isSelected = idx === selectedIndex

                        return (
                          <motion.button
                            ref={isSelected ? selectedRef : null}
                            key={item.id}
                            onClick={() => execute(item)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-75 cursor-pointer"
                            style={{
                              background: isSelected
                                ? 'rgba(255,255,255,0.08)'
                                : 'transparent',
                              borderLeft: isSelected
                                ? '2px solid #3b82f6'
                                : '2px solid transparent',
                            }}
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: 'rgba(255,255,255,0.05)' }}
                            >
                              <item.icon
                                size={16}
                                className={
                                  item.group === 'Actions'
                                    ? 'text-blue-400'
                                    : item.group === 'Tools'
                                      ? 'text-purple-400'
                                      : 'text-gray-400'
                                }
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate text-white">
                                {item.label}
                              </div>
                              <div className="text-xs truncate text-gray-500">
                                {item.description}
                              </div>
                            </div>

                            {/* Keyboard shortcut */}
                            {item.shortcut && (
                              <span className="hidden sm:flex items-center gap-0.5 flex-shrink-0">
                                {item.shortcut.split(' ').map((part, i) => (
                                  <kbd
                                    key={i}
                                    className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-500"
                                  >
                                    {part}
                                  </kbd>
                                ))}
                              </span>
                            )}

                            {/* Enter hint on selected */}
                            {isSelected && (
                              <CornerDownLeft
                                size={12}
                                className="text-gray-600 flex-shrink-0 sm:hidden"
                              />
                            )}
                          </motion.button>
                        )
                      })}
                    </motion.div>
                  ))
                )}
              </div>

              {/* ---- Footer hint ---- */}
              <div
                className="flex items-center justify-between px-4 py-2 text-[11px] border-t border-white/10"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <div className="flex items-center gap-4 text-gray-600">
                  <span className="flex items-center gap-1">
                    <kbd className="font-mono px-1 rounded bg-white/10 text-gray-500">
                      <ChevronUp size={10} className="inline" />
                      <ChevronDown size={10} className="inline" />
                    </kbd>{' '}
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="font-mono px-1 rounded bg-white/10 text-gray-500">
                      ↵
                    </kbd>{' '}
                    Select
                  </span>
                </div>
                <div className="flex items-center gap-4 text-gray-600">
                  <span className="flex items-center gap-1">
                    <kbd className="font-mono text-[10px] px-1.5 rounded bg-white/10 text-gray-500">
                      ⌘K
                    </kbd>{' '}
                    Toggle
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="font-mono px-1 rounded bg-white/10 text-gray-500">
                      esc
                    </kbd>{' '}
                    Close
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
