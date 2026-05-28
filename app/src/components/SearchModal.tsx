import { useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  X,
  Megaphone,
  Image,
  ClipboardList,
  Users,
  Settings,
  Clock,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Sparkles,
  ChevronRight,
  Command,
  CornerDownLeft,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  FileText,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
}

export type SearchCategory =
  | 'campaigns'
  | 'ads'
  | 'drafts'
  | 'audiences'
  | 'settings'
  | 'recent'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  query: string
  onQueryChange: (query: string) => void
  results: SearchResult[]
  selectedIndex: number
  onSelectIndex: (index: number) => void
  onSelectResult: (result: SearchResult) => void
  recentSearches: string[]
  onClearRecent: () => void
  onRemoveRecentItem: (term: string) => void
  isLoading?: boolean
}

/* ------------------------------------------------------------------ */
/*  Category config                                                    */
/* ------------------------------------------------------------------ */

const CATEGORY_CONFIG: Record<
  SearchCategory,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  recent: { label: 'Recent Searches', icon: Clock, color: 'text-gray-400', bgColor: 'bg-white/5' },
  campaigns: { label: 'Campaigns', icon: Megaphone, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  ads: { label: 'Ads', icon: Image, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  drafts: { label: 'Drafts', icon: ClipboardList, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  audiences: { label: 'Audiences', icon: Users, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  settings: { label: 'Settings', icon: Settings, color: 'text-gray-400', bgColor: 'bg-white/5' },
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
/*  Highlight matching text                                            */
/* ------------------------------------------------------------------ */

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>

  const q = query.toLowerCase()
  const t = text.toLowerCase()

  // If no match, return as-is
  if (!t.includes(q)) return <>{text}</>

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let searchIndex = 0

  // Find all occurrences of query in text (case-insensitive)
  while (searchIndex < text.length) {
    const matchIndex = t.indexOf(q, searchIndex)
    if (matchIndex === -1) break

    // Add text before match
    if (matchIndex > lastIndex) {
      parts.push(
        <span key={`pre-${matchIndex}`}>{text.slice(lastIndex, matchIndex)}</span>
      )
    }

    // Add highlighted match
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

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={`post-${lastIndex}`}>{text.slice(lastIndex)}</span>)
  }

  return <>{parts}</>
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
/*  Default icons per category                                         */
/* ------------------------------------------------------------------ */

function getDefaultIcon(category: SearchCategory): React.ElementType {
  switch (category) {
    case 'campaigns':
      return Megaphone
    case 'ads':
      return Image
    case 'drafts':
      return ClipboardList
    case 'audiences':
      return Users
    case 'settings':
      return Settings
    case 'recent':
      return Clock
    default:
      return FileText
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SearchModal({
  isOpen,
  onClose,
  query,
  onQueryChange,
  results,
  selectedIndex,
  onSelectIndex,
  onSelectResult,
  recentSearches,
  onClearRecent,
  onRemoveRecentItem,
  isLoading = false,
}: SearchModalProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  /* ---- focus input on open ---- */
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
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

  /* ---- click outside to close ---- */
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose()
      }
    },
    [onClose]
  )

  /* ---- grouped results ---- */
  const grouped = groupByCategory(results)

  /* ---- empty state helpers ---- */
  const hasQuery = query.trim().length > 0
  const hasResults = results.length > 0
  const showRecentFallback = !hasQuery && recentSearches.length > 0

  /* ---- keyboard navigation from modal level ---- */
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        onSelectIndex(selectedIndex < results.length - 1 ? selectedIndex + 1 : 0)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        onSelectIndex(selectedIndex > 0 ? selectedIndex - 1 : results.length - 1)
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault()
        onSelectResult(results[selectedIndex])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [selectedIndex, results, onSelectIndex, onSelectResult, onClose]
  )

  /* ---- recent search click ---- */
  const handleRecentClick = useCallback(
    (term: string) => {
      onQueryChange(term)
    },
    [onQueryChange]
  )

  /* ---- navigate to route ---- */
  const goToRoute = useCallback(
    (route: string) => {
      navigate(route)
      onClose()
    },
    [navigate, onClose]
  )

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
            background: 'rgba(5, 5, 5, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
          onClick={handleBackdropClick}
        >
          {/* ---- Top Search Input ---- */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
            className="w-full max-w-3xl px-4 pt-[12vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={cn(
                'flex items-center gap-3 px-5 py-4 rounded-2xl border transition-all duration-200',
                'bg-[#111111] border-white/10 shadow-2xl',
                'focus-within:border-[#c3f53b]/30 focus-within:shadow-[#c3f53b]/5'
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
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Search campaigns, ads, drafts, audiences, settings..."
                className="flex-1 bg-transparent text-lg text-white placeholder:text-gray-600 outline-none"
                aria-label="Search"
                aria-autocomplete="list"
                aria-controls="search-results"
                aria-activedescendant={
                  results[selectedIndex]?.id
                    ? `result-${results[selectedIndex].id}`
                    : undefined
                }
              />
              {query && (
                <button
                  onClick={() => {
                    onQueryChange('')
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
            className="w-full max-w-3xl px-4 mt-4 flex-1 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              ref={listRef}
              id="search-results"
              className="flex-1 overflow-y-auto pb-8 space-y-1"
              role="listbox"
              aria-label="Search results"
            >
              {/* Loading state */}
              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-[#c3f53b] border-t-transparent rounded-full animate-spin" />
                  <span className="ml-3 text-sm text-gray-500">Searching...</span>
                </div>
              )}

              {/* Recent searches fallback (when no query) */}
              {showRecentFallback && !isLoading && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-2 py-2">
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-gray-500" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Recent Searches
                      </span>
                    </div>
                    <button
                      onClick={onClearRecent}
                      className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
                      type="button"
                    >
                      Clear all
                    </button>
                  </div>
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => handleRecentClick(term)}
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
                      <span className="text-sm">{term}</span>
                      <ChevronRight
                        size={14}
                        className="ml-auto text-gray-700 group-hover:text-gray-500 transition-colors"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Results grouped by category */}
              {hasResults &&
                !isLoading &&
                grouped.map(({ category, items }) => {
                  const config = CATEGORY_CONFIG[category]
                  const CatIcon = config.icon

                  return (
                    <div key={category} className="space-y-1">
                      {/* Category header */}
                      <div className="flex items-center gap-2 px-2 py-2 mt-2">
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

                      {/* Category items */}
                      {items.map((result) => {
                        const globalIdx = results.indexOf(result)
                        const isSelected = globalIdx === selectedIndex
                        const Icon = result.icon || getDefaultIcon(category)

                        return (
                          <button
                            key={result.id}
                            ref={isSelected ? selectedRef : null}
                            id={`result-${result.id}`}
                            onClick={() => onSelectResult(result)}
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
                                    isSelected ? 'text-white' : 'text-gray-200'
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
                                      category === 'campaigns' &&
                                        'bg-blue-500/10 text-blue-400',
                                      category === 'ads' &&
                                        'bg-emerald-500/10 text-emerald-400',
                                      category === 'drafts' &&
                                        'bg-amber-500/10 text-amber-400',
                                      category === 'audiences' &&
                                        'bg-purple-500/10 text-purple-400',
                                      category === 'settings' &&
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

                            {/* Arrow / Enter hint */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {isSelected && (
                                <CornerDownLeft
                                  size={13}
                                  className="text-[#c3f53b]"
                                />
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
              {hasQuery && !hasResults && !isLoading && (
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
                  <p className="text-xs text-gray-600 max-w-sm text-center">
                    Try searching for campaigns, ads, drafts, audiences, or
                    settings. Use partial keywords for better results.
                  </p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5">
                      <Target size={12} className="text-gray-500" />
                      <span className="text-[11px] text-gray-500">
                        Try &ldquo;summer sale&rdquo;
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5">
                      <TrendingUp size={12} className="text-gray-500" />
                      <span className="text-[11px] text-gray-500">
                        Try &ldquo;meta ads&rdquo;
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Initial state - no query, no recents */}
              {!hasQuery && recentSearches.length === 0 && !isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 px-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#c3f53b]/10 flex items-center justify-center mb-4">
                    <Sparkles size={22} className="text-[#c3f53b]" />
                  </div>
                  <p className="text-sm text-gray-400 mb-1">
                    Start typing to search
                  </p>
                  <p className="text-xs text-gray-600 text-center max-w-xs">
                    Search across all your campaigns, ads, drafts, audiences,
                    and settings pages. Recent searches will appear here.
                  </p>
                  <div className="mt-6 grid grid-cols-2 gap-2">
                    {[
                      'Active Campaigns',
                      'Summer Sale',
                      'Meta Ads',
                      'Settings',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleRecentClick(suggestion)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all text-left"
                        type="button"
                      >
                        <Search size={11} className="text-gray-600" />
                        <span className="text-xs text-gray-400">
                          {suggestion}
                        </span>
                      </button>
                    ))}
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
                  <kbd className="font-mono text-[10px] px-1.5 rounded bg-white/5 border border-white/10 text-gray-500">
                    <Command size={9} className="inline" />
                    K
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
