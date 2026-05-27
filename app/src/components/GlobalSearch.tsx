// @ts-nocheck
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Command,
  Megaphone,
  Image,
  ClipboardList,
  Users,
  Settings,
  Clock,
  X,
  ArrowRight,
  TrendingUp,
  BarChart3,
  FileText,
  Target,
  Sparkles,
  ChevronRight,
  CornerDownLeft,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  Globe,
  Zap,
  Wallet,
  Bell,
  Shield,
  Palette,
  User,
  CreditCard,
  Key,
  CircleDollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '../store/useUIStore'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SearchResult {
  id: string
  title: string
  description: string
  route: string
  category: SearchCategory
  icon?: React.ElementType
  badge?: string
  meta?: string
  keywords?: string[]
  priority?: number
}

export type SearchCategory =
  | 'campaigns'
  | 'ads'
  | 'drafts'
  | 'audiences'
  | 'settings'
  | 'recent'

interface RecentEntry {
  term: string
  timestamp: number
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const RECENT_STORAGE_KEY = 'adnexus_global_search_recent'
const MAX_RECENT_ITEMS = 8
const RECENT_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/* ------------------------------------------------------------------ */
/*  Category configuration                                             */
/* ------------------------------------------------------------------ */

const CATEGORY_CONFIG: Record<
  SearchCategory,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  recent: {
    label: 'Recent Searches',
    icon: Clock,
    color: 'text-gray-400',
    bgColor: 'bg-white/5',
  },
  campaigns: {
    label: 'Campaigns',
    icon: Megaphone,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  ads: {
    label: 'Ads',
    icon: Image,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  drafts: {
    label: 'Drafts',
    icon: ClipboardList,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  audiences: {
    label: 'Audiences',
    icon: Users,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  settings: {
    label: 'Settings',
    icon: Settings,
    color: 'text-gray-400',
    bgColor: 'bg-white/5',
  },
}

const CATEGORY_ORDER: SearchCategory[] = [
  'recent',
  'campaigns',
  'ads',
  'drafts',
  'audiences',
  'settings',
]

/* ------------------------------------------------------------------ */
/*  Mock Data — Searchable Results                                     */
/*  Will be replaced with real API calls later                         */
/* ------------------------------------------------------------------ */

const MOCK_RESULTS: SearchResult[] = [
  /* ── Campaigns ── */
  {
    id: 'camp-1',
    title: 'Summer Sale 2024',
    description: 'Multi-platform summer promotion campaign',
    route: '/campaigns',
    category: 'campaigns',
    icon: Megaphone,
    badge: 'Active',
    meta: 'Meta, Google · $12.4K spend · 8.2% CTR',
    keywords: ['summer', 'sale', 'promotion', 'seasonal'],
    priority: 1,
  },
  {
    id: 'camp-2',
    title: 'Q4 Holiday Push',
    description: 'Holiday season campaign across all platforms',
    route: '/campaigns',
    category: 'campaigns',
    icon: Megaphone,
    badge: 'Active',
    meta: 'Meta, TikTok · $24.1K spend · 6.5% CTR',
    keywords: ['holiday', 'q4', 'christmas', 'winter'],
    priority: 1,
  },
  {
    id: 'camp-3',
    title: 'Product Launch - Pixel Pro',
    description: 'New product launch awareness campaign',
    route: '/campaigns',
    category: 'campaigns',
    icon: Megaphone,
    badge: 'Paused',
    meta: 'Google · $5.8K spend · 4.1% CTR',
    keywords: ['launch', 'product', 'awareness', 'pixel'],
    priority: 2,
  },
  {
    id: 'camp-4',
    title: 'Retargeting - Cart Abandoners',
    description: 'Retargeting users who abandoned cart',
    route: '/campaigns',
    category: 'campaigns',
    icon: Megaphone,
    badge: 'Active',
    meta: 'Meta · $8.2K spend · 12.1% CTR',
    keywords: ['retargeting', 'cart', 'abandoners', 'remarketing'],
    priority: 1,
  },
  {
    id: 'camp-5',
    title: 'Brand Awareness - Spring',
    description: 'Spring brand awareness push',
    route: '/campaigns',
    category: 'campaigns',
    icon: Megaphone,
    badge: 'Draft',
    meta: 'Meta, Google, TikTok · Not started',
    keywords: ['brand', 'awareness', 'spring', 'reach'],
    priority: 3,
  },
  {
    id: 'camp-6',
    title: 'Black Friday 2024',
    description: 'Black Friday deals promotion',
    route: '/campaigns',
    category: 'campaigns',
    icon: Megaphone,
    badge: 'Scheduled',
    meta: 'All platforms · $50K budget · Starts Nov 29',
    keywords: ['black friday', 'deals', 'discount', 'bfcm'],
    priority: 1,
  },

  /* ── Ads ── */
  {
    id: 'ad-1',
    title: 'Summer Sale - Carousel Ad',
    description: 'Product carousel for summer collection',
    route: '/ads',
    category: 'ads',
    icon: Image,
    badge: 'Active',
    meta: '3.8% CTR · 1.2% CVR · Fatigue: Low',
    keywords: ['carousel', 'product', 'collection'],
    priority: 1,
  },
  {
    id: 'ad-2',
    title: 'Holiday Video - 15s',
    description: '15-second video ad for holiday push',
    route: '/ads',
    category: 'ads',
    icon: Image,
    badge: 'Active',
    meta: '5.1% CTR · 2.3% CVR · Fatigue: Medium',
    keywords: ['video', 'holiday', '15s', 'creative'],
    priority: 1,
  },
  {
    id: 'ad-3',
    title: 'Pixel Pro - Single Image',
    description: 'Static image ad for product launch',
    route: '/ads',
    category: 'ads',
    icon: Image,
    badge: 'Under Review',
    meta: 'Awaiting approval · Submitted 2h ago',
    keywords: ['image', 'static', 'product', 'launch'],
    priority: 2,
  },
  {
    id: 'ad-4',
    title: 'Retargeting - Dynamic Creative',
    description: 'Dynamic creative optimization ad set',
    route: '/ads',
    category: 'ads',
    icon: Image,
    badge: 'Active',
    meta: '8.4% CTR · 4.1% CVR · Fatigue: Low',
    keywords: ['dynamic', 'dco', 'creative', 'optimization'],
    priority: 1,
  },
  {
    id: 'ad-5',
    title: 'Story Ad - Instagram',
    description: 'Instagram Stories full-screen ad',
    route: '/ads',
    category: 'ads',
    icon: Image,
    badge: 'Active',
    meta: '6.2% CTR · 1.8% CVR · Fatigue: High',
    keywords: ['story', 'instagram', 'stories', 'full-screen'],
    priority: 1,
  },

  /* ── Drafts ── */
  {
    id: 'draft-1',
    title: 'Draft: Back to School Campaign',
    description: 'Pending approval for back to school push',
    route: '/drafts',
    category: 'drafts',
    icon: ClipboardList,
    badge: 'Pending',
    meta: 'Submitted by Alex · 3 days ago',
    keywords: ['back to school', 'education', 'pending'],
    priority: 1,
  },
  {
    id: 'draft-2',
    title: 'Draft: New Year Promo',
    description: 'New Year promotional campaign draft',
    route: '/drafts',
    category: 'drafts',
    icon: ClipboardList,
    badge: 'Needs Review',
    meta: 'Submitted by Sarah · 1 day ago',
    keywords: ['new year', 'promo', 'january'],
    priority: 2,
  },
  {
    id: 'draft-3',
    title: 'Draft: Influencer Partnership',
    description: 'Influencer collaboration campaign draft',
    route: '/drafts',
    category: 'drafts',
    icon: ClipboardList,
    badge: 'Approved',
    meta: 'Approved by Mike · Ready to publish',
    keywords: ['influencer', 'partnership', 'collaboration'],
    priority: 1,
  },
  {
    id: 'draft-4',
    title: 'Draft: Flash Sale - 24h',
    description: '24-hour flash sale campaign proposal',
    route: '/drafts',
    category: 'drafts',
    icon: ClipboardList,
    badge: 'Pending',
    meta: 'Submitted by Lisa · 5 hours ago',
    keywords: ['flash sale', '24h', 'urgent', 'limited'],
    priority: 1,
  },

  /* ── Audiences ── */
  {
    id: 'aud-1',
    title: 'Lookalike - High Value Customers',
    description: '1% lookalike of top 5% customers',
    route: '/audiences',
    category: 'audiences',
    icon: Users,
    badge: '2.4M',
    meta: 'Meta · Created 2 weeks ago',
    keywords: ['lookalike', 'high value', 'customers', 'lal'],
    priority: 1,
  },
  {
    id: 'aud-2',
    title: 'Website Visitors - 30 Days',
    description: 'All website visitors in the last 30 days',
    route: '/audiences',
    category: 'audiences',
    icon: Users,
    badge: '840K',
    meta: 'Meta, Google · Auto-refresh enabled',
    keywords: ['website', 'visitors', 'retargeting', 'pixel'],
    priority: 1,
  },
  {
    id: 'aud-3',
    title: 'Email List - Subscribers',
    description: 'Custom audience from email subscribers',
    route: '/audiences',
    category: 'audiences',
    icon: Users,
    badge: '125K',
    meta: 'Meta · Last synced 2h ago',
    keywords: ['email', 'subscribers', 'list', 'crm'],
    priority: 2,
  },
  {
    id: 'aud-4',
    title: 'Engaged Shoppers - 7 Days',
    description: 'Users who engaged with products in 7 days',
    route: '/audiences',
    category: 'audiences',
    icon: Users,
    badge: '45K',
    meta: 'Google · High intent segment',
    keywords: ['engaged', 'shoppers', 'high intent', 'warm'],
    priority: 1,
  },
  {
    id: 'aud-5',
    title: 'Cart Abandoners - 24h',
    description: 'Users who abandoned cart in last 24 hours',
    route: '/audiences',
    category: 'audiences',
    icon: Users,
    badge: '12K',
    meta: 'Meta · Dynamic refresh · Urgent',
    keywords: ['cart', 'abandoners', 'urgent', 'hot'],
    priority: 1,
  },

  /* ── Settings ── */
  {
    id: 'set-1',
    title: 'Account Settings',
    description: 'Profile, password, and account management',
    route: '/settings',
    category: 'settings',
    icon: User,
    keywords: ['profile', 'password', 'account', 'personal'],
    priority: 1,
  },
  {
    id: 'set-2',
    title: 'Platform Integrations',
    description: 'Connect Meta, Google, TikTok ad accounts',
    route: '/integrations',
    category: 'settings',
    icon: Globe,
    keywords: ['integrations', 'meta', 'google', 'tiktok', 'connect'],
    priority: 1,
  },
  {
    id: 'set-3',
    title: 'Billing & Credits',
    description: 'Manage payment methods and credit usage',
    route: '/billing/credits',
    category: 'settings',
    icon: CreditCard,
    keywords: ['billing', 'payment', 'credits', 'subscription'],
    priority: 2,
  },
  {
    id: 'set-4',
    title: 'API Keys',
    description: 'Developer API keys and webhook settings',
    route: '/developers',
    category: 'settings',
    icon: Key,
    keywords: ['api', 'keys', 'developer', 'webhook', 'tokens'],
    priority: 2,
  },
  {
    id: 'set-5',
    title: 'Notifications',
    description: 'Email, Slack, and in-app notification preferences',
    route: '/settings',
    category: 'settings',
    icon: Bell,
    keywords: ['notifications', 'alerts', 'email', 'slack'],
    priority: 3,
  },
  {
    id: 'set-6',
    title: 'Team Members',
    description: 'Manage team access and permissions',
    route: '/settings',
    category: 'settings',
    icon: Users,
    keywords: ['team', 'members', 'users', 'permissions', 'roles'],
    priority: 2,
  },
  {
    id: 'set-7',
    title: 'Appearance',
    description: 'Theme, colors, and display preferences',
    route: '/appearance',
    category: 'settings',
    icon: Palette,
    keywords: ['theme', 'dark', 'light', 'appearance', 'display'],
    priority: 3,
  },
  {
    id: 'set-8',
    title: 'Security & Privacy',
    description: '2FA, session management, and data privacy',
    route: '/settings',
    category: 'settings',
    icon: Shield,
    keywords: ['security', '2fa', 'privacy', 'mfa', 'auth'],
    priority: 2,
  },
  {
    id: 'set-9',
    title: 'Automation Rules',
    description: 'AI agent rules and automation settings',
    route: '/ai-agent',
    category: 'settings',
    icon: Zap,
    keywords: ['automation', 'rules', 'ai', 'agent', 'triggers'],
    priority: 1,
  },
  {
    id: 'set-10',
    title: 'Budget Pacing',
    description: 'Budget allocation and spend control settings',
    route: '/pacing',
    category: 'settings',
    icon: CircleDollarSign,
    keywords: ['budget', 'pacing', 'spend', 'allocation', 'limits'],
    priority: 2,
  },
]

/* ------------------------------------------------------------------ */
/*  localStorage helpers                                               */
/* ------------------------------------------------------------------ */

function loadRecent(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentEntry[]
    return parsed.filter((r) => Date.now() - r.timestamp < RECENT_TTL_MS)
  } catch {
    return []
  }
}

function saveRecent(entries: RecentEntry[]) {
  localStorage.setItem(
    RECENT_STORAGE_KEY,
    JSON.stringify(entries.slice(0, MAX_RECENT_ITEMS))
  )
}

function addRecentSearch(term: string) {
  if (!term.trim()) return
  const existing = loadRecent()
  const filtered = existing.filter(
    (e) => e.term.toLowerCase() !== term.toLowerCase()
  )
  const next = [
    { term: term.trim(), timestamp: Date.now() },
    ...filtered,
  ].slice(0, MAX_RECENT_ITEMS)
  saveRecent(next)
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_STORAGE_KEY)
}

function removeRecentSearch(term: string) {
  const existing = loadRecent()
  const filtered = existing.filter(
    (e) => e.term.toLowerCase() !== term.toLowerCase()
  )
  saveRecent(filtered)
}

/* ------------------------------------------------------------------ */
/*  Fuzzy search engine                                                */
/* ------------------------------------------------------------------ */

function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase().trim()
  const t = text.toLowerCase().trim()

  if (!q || !t) return 0

  // Exact match
  if (t === q) return 1000
  // Starts with query
  if (t.startsWith(q)) return 800 - t.length
  // Word boundary match
  const wordBoundaries = t.split(/\s+/)
  for (let i = 0; i < wordBoundaries.length; i++) {
    if (wordBoundaries[i].startsWith(q)) return 600 - i * 50
  }
  // Includes query
  if (t.includes(q)) return 400 - t.indexOf(q)

  // Fuzzy: each char in query appears in text in order
  let qi = 0
  let consecutiveBonus = 0
  let lastMatchIndex = -1
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      if (lastMatchIndex !== -1 && ti === lastMatchIndex + 1) {
        consecutiveBonus += 20
      }
      qi++
      lastMatchIndex = ti
    }
  }
  if (qi === q.length) return 200 + consecutiveBonus

  return 0
}

function searchResults(
  items: SearchResult[],
  query: string
): SearchResult[] {
  if (!query.trim()) return items

  const q = query.trim()

  return items
    .map((item) => {
      let score = 0

      // Title match (highest weight)
      score = Math.max(score, fuzzyScore(q, item.title) * 3)
      // Description match
      score = Math.max(score, fuzzyScore(q, item.description) * 1.5)
      // Keywords match
      if (item.keywords) {
        for (const kw of item.keywords) {
          score = Math.max(score, fuzzyScore(q, kw) * 2)
        }
      }
      // Badge match
      if (item.badge) {
        score = Math.max(score, fuzzyScore(q, item.badge))
      }
      // Meta match
      if (item.meta) {
        score = Math.max(score, fuzzyScore(q, item.meta) * 0.5)
      }

      // Priority boost
      if (item.priority) {
        score += (4 - item.priority) * 10
      }

      return { item, score }
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.item)
}

/* ------------------------------------------------------------------ */
/*  Group results by category                                          */
/* ------------------------------------------------------------------ */

function groupByCategory(
  results: SearchResult[]
): { category: SearchCategory; items: SearchResult[] }[] {
  const map = new Map<SearchCategory, SearchResult[]>()

  results.forEach((r) => {
    const arr = map.get(r.category) || []
    arr.push(r)
    map.set(r.category, arr)
  })

  const grouped: { category: SearchCategory; items: SearchResult[] }[] = []
  CATEGORY_ORDER.forEach((cat) => {
    if (map.has(cat)) {
      grouped.push({ category: cat, items: map.get(cat)! })
    }
  })

  return grouped
}

/* ------------------------------------------------------------------ */
/*  Default icon helper                                                */
/* ------------------------------------------------------------------ */

function getDefaultIcon(category: SearchCategory): React.ElementType {
  return CATEGORY_CONFIG[category]?.icon || FileText
}

/* ------------------------------------------------------------------ */
/*  Highlight matching text                                            */
/* ------------------------------------------------------------------ */

function HighlightText({
  text,
  query,
}: {
  text: string
  query: string
}) {
  if (!query.trim()) return <>{text}</>

  const q = query.toLowerCase()
  const t = text.toLowerCase()

  if (!t.includes(q)) return <>{text}</>

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let searchIndex = 0

  while (searchIndex < text.length) {
    const matchIndex = t.indexOf(q, searchIndex)
    if (matchIndex === -1) break

    if (matchIndex > lastIndex) {
      parts.push(
        <span key={`pre-${matchIndex}`}>
          {text.slice(lastIndex, matchIndex)}
        </span>
      )
    }

    parts.push(
      <mark
        key={`match-${matchIndex}`}
        className="bg-[#c3f53b]/20 text-[#c3f53b] rounded px-0.5 font-medium"
      >
        {text.slice(matchIndex, matchIndex + q.length)}
      </mark>
    )

    searchIndex = matchIndex + q.length
    lastIndex = matchIndex + q.length
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`post-${lastIndex}`}>{text.slice(lastIndex)}</span>)
  }

  return <>{parts}</>
}

/* ------------------------------------------------------------------ */
/*  GlobalSearch Component                                             */
/* ------------------------------------------------------------------ */

export default function GlobalSearch() {
  const navigate = useNavigate()
  const location = useLocation()
  const { globalSearchOpen, setGlobalSearchOpen } = useUIStore()

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recent, setRecent] = useState<RecentEntry[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)
  const lastPathRef = useRef(location.pathname)

  /* ---- sync open state from store ---- */
  useEffect(() => {
    if (globalSearchOpen) {
      setIsOpen(true)
      setGlobalSearchOpen(false)
    }
  }, [globalSearchOpen, setGlobalSearchOpen])

  /* ---- close on route change ---- */
  useEffect(() => {
    if (location.pathname !== lastPathRef.current) {
      setIsOpen(false)
      setQuery('')
      lastPathRef.current = location.pathname
    }
  }, [location.pathname])

  /* ---- load recent on open ---- */
  useEffect(() => {
    if (isOpen) {
      setRecent(loadRecent())
      setSelectedIndex(0)
    }
  }, [isOpen])

  /* ---- focus input on open ---- */
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  /* ---- scroll selected into view ---- */
  useEffect(() => {
    if (selectedRef.current && listRef.current) {
      selectedRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }, [selectedIndex])

  /* ---- keyboard shortcut: Cmd+K ---- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
        if (isOpen) {
          setQuery('')
        }
      }

      if (!isOpen) return

      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          setQuery('')
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => {
            const max = effectiveResults.length - 1
            return max >= 0 ? (prev < max ? prev + 1 : 0) : 0
          })
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => {
            const max = effectiveResults.length - 1
            return max >= 0 ? (prev > 0 ? prev - 1 : max) : 0
          })
          break
        case 'Enter':
          e.preventDefault()
          if (effectiveResults[selectedIndex]) {
            handleSelectResult(effectiveResults[selectedIndex])
          }
          break
        case 'Home':
          e.preventDefault()
          setSelectedIndex(0)
          break
        case 'End':
          e.preventDefault()
          setSelectedIndex(Math.max(effectiveResults.length - 1, 0))
          break
        case 'PageDown':
          e.preventDefault()
          setSelectedIndex((prev) =>
            Math.min(prev + 5, effectiveResults.length - 1)
          )
          break
        case 'PageUp':
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 5, 0))
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex])

  /* ---- close handler ---- */
  const handleClose = useCallback(() => {
    setIsOpen(false)
    setQuery('')
  }, [])

  /* ---- filter results ---- */
  const filteredResults = useMemo(
    () => searchResults(MOCK_RESULTS, query),
    [query]
  )

  /* ---- build recent search results ---- */
  const recentSearchResults: SearchResult[] = useMemo(() => {
    if (query.trim()) return []
    return recent.map((entry) => ({
      id: `recent-${entry.timestamp}`,
      title: entry.term,
      description: `Recent search from ${new Date(entry.timestamp).toLocaleDateString()}`,
      route: '#',
      category: 'recent' as const,
      icon: Clock,
    }))
  }, [recent, query])

  /* ---- effective results (recents when no query, filtered when query) ---- */
  const effectiveResults: SearchResult[] = useMemo(() => {
    if (query.trim()) return filteredResults
    return recentSearchResults.length > 0 ? recentSearchResults : MOCK_RESULTS
  }, [query, filteredResults, recentSearchResults])

  /* ---- group results ---- */
  const grouped = useMemo(
    () => groupByCategory(effectiveResults),
    [effectiveResults]
  )

  /* ---- select result ---- */
  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      // If it's a recent search item, populate the query
      if (result.category === 'recent' && result.route === '#') {
        setQuery(result.title)
        return
      }

      // Save search term to recent
      if (query.trim()) {
        addRecentSearch(query.trim())
      }

      // Navigate
      navigate(result.route)
      setIsOpen(false)
      setQuery('')
    },
    [navigate, query]
  )

  /* ---- recent search handlers ---- */
  const handleRecentClick = useCallback((term: string) => {
    setQuery(term)
  }, [])

  const handleClearRecent = useCallback(() => {
    clearRecentSearches()
    setRecent([])
  }, [])

  const handleRemoveRecentItem = useCallback((term: string) => {
    removeRecentSearch(term)
    setRecent((prev) => prev.filter((r) => r.term !== term))
  }, [])

  /* ---- click recent from list ---- */
  const handleRecentResultClick = useCallback(
    (result: SearchResult) => {
      if (result.category === 'recent') {
        setQuery(result.title)
      } else {
        handleSelectResult(result)
      }
    },
    [handleSelectResult]
  )

  /* ---- render helpers ---- */
  const hasQuery = query.trim().length > 0
  const hasResults = effectiveResults.length > 0

  /* ---- compute global index for a result within grouped items ---- */
  const getGlobalIndex = useCallback(
    (targetResult: SearchResult): number => {
      return effectiveResults.findIndex(
        (r) => r.id === targetResult.id
      )
    },
    [effectiveResults]
  )

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex flex-col items-center"
          style={{
            background: 'rgba(5, 5, 5, 0.88)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose()
          }}
        >
          {/* ---- Search Input ---- */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{
              duration: 0.25,
              ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
            }}
            className="w-full max-w-3xl px-4 pt-[12vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={cn(
                'flex items-center gap-3 px-5 py-4 rounded-2xl border transition-all duration-200',
                'bg-[#0e0e0e] border-white/10 shadow-2xl',
                'focus-within:border-[#c3f53b]/30 focus-within:shadow-[0_0_20px_rgba(195,245,59,0.05)]'
              )}
            >
              <Search
                size={20}
                className={cn(
                  'flex-shrink-0 transition-colors',
                  query ? 'text-[#c3f53b]' : 'text-gray-500'
                )}
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSelectedIndex(0)
                }}
                placeholder="Search campaigns, ads, drafts, audiences, settings..."
                className="flex-1 bg-transparent text-lg text-white placeholder:text-gray-600 outline-none"
                aria-label="Global search"
                aria-autocomplete="list"
                aria-controls="global-search-results"
                aria-activedescendant={
                  effectiveResults[selectedIndex]?.id
                    ? `gs-result-${effectiveResults[selectedIndex].id}`
                    : undefined
                }
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('')
                    inputRef.current?.focus()
                  }}
                  className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Clear search"
                  type="button"
                >
                  <X size={16} />
                </button>
              )}
              <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                <kbd className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-gray-500 font-mono">
                  ESC
                </kbd>
              </div>
            </div>
          </motion.div>

          {/* ---- Results Area ---- */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            className="w-full max-w-3xl px-4 mt-3 flex-1 overflow-hidden flex flex-col min-h-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Stats bar */}
            {hasQuery && (
              <div className="flex items-center justify-between px-2 py-2 mb-1">
                <span className="text-[11px] text-gray-600">
                  {hasResults
                    ? `Found ${effectiveResults.length} result${effectiveResults.length !== 1 ? 's' : ''} for "${query}"`
                    : `No results for "${query}"`}
                </span>
                <span className="text-[10px] text-gray-700">
                  {MOCK_RESULTS.length} indexed items
                </span>
              </div>
            )}

            <div
              ref={listRef}
              id="global-search-results"
              className="flex-1 overflow-y-auto pb-4 space-y-1 scrollbar-thin"
              role="listbox"
              aria-label="Search results"
            >
              {/* Recent searches (shown when no query) */}
              {!hasQuery && recent.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-2 py-2">
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-gray-500" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Recent Searches
                      </span>
                    </div>
                    <button
                      onClick={handleClearRecent}
                      className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
                      type="button"
                    >
                      Clear all
                    </button>
                  </div>
                  {recent.map((entry) => (
                    <button
                      key={entry.timestamp}
                      onClick={() => handleRecentClick(entry.term)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left',
                        'text-gray-300 hover:text-white hover:bg-white/[0.04]',
                        'transition-colors duration-100 group'
                      )}
                      type="button"
                    >
                      <Clock
                        size={14}
                        className="text-gray-600 group-hover:text-gray-400 transition-colors"
                      />
                      <span className="text-sm">{entry.term}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveRecentItem(entry.term)
                        }}
                        className="ml-auto p-1 rounded-md text-gray-700 hover:text-gray-400 hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all"
                        type="button"
                        aria-label={`Remove ${entry.term} from recent searches`}
                      >
                        <X size={12} />
                      </button>
                      <ChevronRight
                        size={14}
                        className="text-gray-700 group-hover:text-gray-500 transition-colors"
                      />
                    </button>
                  ))}
                  <div className="my-2 border-t border-white/5" />
                </div>
              )}

              {/* Suggested quick searches when empty */}
              {!hasQuery && recent.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-6"
                >
                  <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-12 h-12 rounded-xl bg-[#c3f53b]/10 flex items-center justify-center mb-3">
                      <Sparkles size={22} className="text-[#c3f53b]" />
                    </div>
                    <p className="text-sm text-gray-400 mb-1">
                      Search across your ad accounts
                    </p>
                    <p className="text-xs text-gray-600 max-w-xs">
                      Find campaigns, ads, drafts, audiences, and settings
                      instantly. Your recent searches will appear here.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 px-2">
                    {[
                      { label: 'Active Campaigns', icon: Megaphone },
                      { label: 'Summer Sale', icon: TrendingUp },
                      { label: 'Meta Ads', icon: Target },
                      { label: 'Budget Settings', icon: Wallet },
                    ].map((suggestion) => (
                      <button
                        key={suggestion.label}
                        onClick={() => handleRecentClick(suggestion.label)}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2.5 rounded-xl',
                          'bg-white/[0.02] border border-white/[0.04]',
                          'hover:bg-white/[0.05] hover:border-white/10',
                          'transition-all text-left group'
                        )}
                        type="button"
                      >
                        <suggestion.icon
                          size={14}
                          className="text-gray-600 group-hover:text-gray-400 transition-colors"
                        />
                        <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                          {suggestion.label}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 px-2">
                    <p className="text-[10px] text-gray-700 uppercase tracking-wider font-medium mb-2">
                      Popular
                    </p>
                    <div className="space-y-1">
                      {MOCK_RESULTS.slice(0, 5).map((result) => {
                        const config = CATEGORY_CONFIG[result.category]
                        const Icon = result.icon || getDefaultIcon(result.category)
                        return (
                          <button
                            key={result.id}
                            onClick={() => handleSelectResult(result)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2 rounded-lg',
                              'hover:bg-white/[0.03] transition-colors text-left group'
                            )}
                            type="button"
                          >
                            <div
                              className={cn(
                                'w-7 h-7 rounded-lg flex items-center justify-center',
                                config.bgColor
                              )}
                            >
                              <Icon size={13} className={config.color} />
                            </div>
                            <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                              {result.title}
                            </span>
                            <ArrowRight
                              size={11}
                              className="ml-auto text-gray-700 group-hover:text-gray-500 transition-colors"
                            />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Grouped results */}
              {hasResults &&
                grouped.map(({ category, items }) => {
                  const config = CATEGORY_CONFIG[category]
                  const CatIcon = config.icon

                  return (
                    <div key={category} className="space-y-0.5">
                      {/* Category header */}
                      <div className="flex items-center gap-2 px-2 py-2 mt-1">
                        <div
                          className={cn(
                            'w-5 h-5 rounded-md flex items-center justify-center',
                            config.bgColor
                          )}
                        >
                          <CatIcon size={11} className={config.color} />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                          {config.label}
                        </span>
                        <span className="text-[10px] text-gray-700 ml-1">
                          {items.length}
                        </span>
                      </div>

                      {/* Items */}
                      {items.map((result) => {
                        const globalIdx = getGlobalIndex(result)
                        const isSelected = globalIdx === selectedIndex
                        const Icon =
                          result.icon || getDefaultIcon(category)

                        return (
                          <button
                            key={result.id}
                            ref={isSelected ? selectedRef : null}
                            id={`gs-result-${result.id}`}
                            onClick={() => {
                              if (category === 'recent') {
                                handleRecentResultClick(result)
                              } else {
                                handleSelectResult(result)
                              }
                            }}
                            onMouseEnter={() => onSelectIndex(globalIdx)}
                            className={cn(
                              'w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-left',
                              'transition-all duration-75 group',
                              isSelected
                                ? 'bg-white/[0.08] ring-1 ring-[#c3f53b]/20'
                                : 'hover:bg-white/[0.04]'
                            )}
                            role="option"
                            aria-selected={isSelected}
                            type="button"
                          >
                            {/* Icon */}
                            <div
                              className={cn(
                                'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                                config.bgColor
                              )}
                            >
                              <Icon size={16} className={config.color} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    'text-sm font-medium truncate',
                                    isSelected
                                      ? 'text-white'
                                      : 'text-gray-200'
                                  )}
                                >
                                  <HighlightText
                                    text={result.title}
                                    query={query}
                                  />
                                </span>
                                {result.badge && (
                                  <span
                                    className={cn(
                                      'flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium',
                                      result.badge === 'Active' &&
                                        'bg-emerald-500/10 text-emerald-400',
                                      result.badge === 'Paused' &&
                                        'bg-amber-500/10 text-amber-400',
                                      result.badge === 'Draft' &&
                                        'bg-gray-500/10 text-gray-400',
                                      result.badge === 'Scheduled' &&
                                        'bg-blue-500/10 text-blue-400',
                                      result.badge === 'Pending' &&
                                        'bg-orange-500/10 text-orange-400',
                                      result.badge === 'Needs Review' &&
                                        'bg-red-500/10 text-red-400',
                                      result.badge === 'Approved' &&
                                        'bg-emerald-500/10 text-emerald-400',
                                      result.badge === 'Under Review' &&
                                        'bg-blue-500/10 text-blue-400',
                                      ![
                                        'Active',
                                        'Paused',
                                        'Draft',
                                        'Scheduled',
                                        'Pending',
                                        'Needs Review',
                                        'Approved',
                                        'Under Review',
                                      ].includes(result.badge) &&
                                        'bg-white/5 text-gray-400'
                                    )}
                                  >
                                    {result.badge}
                                  </span>
                                )}
                              </div>
                              {result.description && (
                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                  <HighlightText
                                    text={result.description}
                                    query={query}
                                  />
                                </p>
                              )}
                              {result.meta && (
                                <p className="text-[10px] text-gray-600 mt-0.5 flex items-center gap-1">
                                  <BarChart3 size={9} />
                                  {result.meta}
                                </p>
                              )}
                            </div>

                            {/* Action indicator */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {isSelected && category !== 'recent' && (
                                <CornerDownLeft
                                  size={13}
                                  className="text-[#c3f53b]"
                                />
                              )}
                              {isSelected && category === 'recent' && (
                                <span className="text-[10px] text-gray-500">
                                  Search
                                </span>
                              )}
                              {!isSelected && (
                                <ArrowRight
                                  size={13}
                                  className="text-gray-700 group-hover:text-gray-500 transition-colors"
                                />
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}

              {/* Empty state */}
              {hasQuery && !hasResults && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-16 px-4"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-4">
                    <Search size={24} className="text-gray-600" />
                  </div>
                  <p className="text-sm text-gray-400 mb-1">
                    No results for &ldquo;{query}&rdquo;
                  </p>
                  <p className="text-xs text-gray-600 max-w-sm text-center mb-6">
                    Try adjusting your search terms. You can search by campaign
                    name, ad title, audience segment, or settings page.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {['Summer Sale', 'Meta Ads', 'Active', 'Retargeting'].map(
                      (suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => handleRecentClick(suggestion)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                            'bg-white/[0.03] border border-white/5',
                            'hover:bg-white/[0.06] hover:border-white/10',
                            'transition-all'
                          )}
                          type="button"
                        >
                          <Search size={10} className="text-gray-600" />
                          <span className="text-[11px] text-gray-500">
                            {suggestion}
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* ---- Footer ---- */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-t border-white/5 bg-[#0a0a0a]/50 rounded-b-2xl mb-4">
              <div className="flex items-center gap-4 text-[11px] text-gray-600">
                <span className="flex items-center gap-1">
                  <kbd className="font-mono px-1 rounded bg-white/5 border border-white/10 text-gray-500">
                    <ChevronUp size={10} className="inline" />
                    <ChevronDownIcon size={10} className="inline" />
                  </kbd>{' '}
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="font-mono px-1 rounded bg-white/5 border border-white/10 text-gray-500">
                    ↵
                  </kbd>{' '}
                  Select
                </span>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-gray-600">
                <span className="hidden sm:flex items-center gap-1">
                  <kbd className="font-mono text-[10px] px-1.5 rounded bg-white/5 border border-white/10 text-gray-500 flex items-center gap-0.5">
                    <Command size={9} />K
                  </kbd>{' '}
                  Toggle
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="font-mono px-1 rounded bg-white/5 border border-white/10 text-gray-500">
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
  )
}
