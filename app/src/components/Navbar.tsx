// @ts-nocheck
import { useEffect, useState, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu,
  Search,
  Command,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  CheckCheck,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useUIStore } from '../store/useUIStore'
import { getPageTitle } from './Sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { cn } from '@/lib/utils'
import GlobalSearch from './GlobalSearch'

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

interface NotificationItem {
  id: string
  title: string
  message: string
  type: 'success' | 'warning' | 'info' | 'error'
  time: string
  read: boolean
}

/* ──────────────────────────────────────────────
   Mock notifications
   ────────────────────────────────────────────── */

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    title: 'Campaign Approved',
    message: 'Your "Summer Sale" campaign has been approved.',
    type: 'success',
    time: '2 min ago',
    read: false,
  },
  {
    id: '2',
    title: 'Budget Alert',
    message: 'Daily budget for "Q4 Push" is at 85%.',
    type: 'warning',
    time: '1 hr ago',
    read: false,
  },
  {
    id: '3',
    title: 'New AI Suggestion',
    message: 'AI generated 3 new ad variations for review.',
    type: 'info',
    time: '3 hrs ago',
    read: false,
  },
  {
    id: '4',
    title: 'Report Ready',
    message: 'Weekly performance report is now available.',
    type: 'success',
    time: '5 hrs ago',
    read: true,
  },
  {
    id: '5',
    title: 'Connection Issue',
    message: 'Meta Ads API experienced a brief outage.',
    type: 'error',
    time: '1 day ago',
    read: true,
  },
]

/* ──────────────────────────────────────────────
   Notification Icon helper
   ────────────────────────────────────────────── */

function NotificationIcon({ type }: { type: NotificationItem['type'] }) {
  switch (type) {
    case 'success':
      return <CheckCheck size={14} className="text-emerald-400" />
    case 'warning':
      return <AlertTriangle size={14} className="text-amber-400" />
    case 'error':
      return <AlertTriangle size={14} className="text-red-400" />
    default:
      return <Info size={14} className="text-blue-400" />
  }
}

/* ──────────────────────────────────────────────
   Navbar Component
   ────────────────────────────────────────────── */

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { toggleMobileSidebar, setGlobalSearchOpen } = useUIStore()
  const [scrolled, setScrolled] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS)

  // Track scroll for backdrop blur
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Keyboard shortcut: cmd+K for global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setGlobalSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setGlobalSearchOpen])

  const pageTitle = getPageTitle(location.pathname)
  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 h-16 flex items-center px-4 lg:px-6 transition-all duration-300',
        scrolled
          ? 'bg-[#050505]/85 backdrop-blur-xl border-b border-white/5'
          : 'bg-transparent border-b border-transparent'
      )}
      style={{
        left: 'var(--sidebar-width, 240px)',
      }}
      role="banner"
      aria-label="Top navigation"
    >
      {/* ── Left: Hamburger + Page Title ── */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger: mobile only */}
        <button
          onClick={toggleMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c3f53b]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[#050505]"
          aria-label="Open navigation menu"
          type="button"
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        {/* Page title */}
        <AnimatePresence mode="wait">
          <motion.h1
            key={pageTitle}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="text-base lg:text-lg font-semibold text-white truncate"
          >
            {pageTitle}
          </motion.h1>
        </AnimatePresence>
      </div>

      {/* ── Center: Global Search ── */}
      <div className="hidden md:flex flex-1 justify-center max-w-xl mx-4">
        <button
          onClick={() => setGlobalSearchOpen(true)}
          className="group w-full flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c3f53b]/30"
          aria-label="Open global search — Command K"
          type="button"
        >
          <Search size={15} className="text-gray-500 group-hover:text-gray-400 transition-colors" aria-hidden="true" />
          <span className="text-sm text-gray-500 group-hover:text-gray-400 transition-colors">
            Search campaigns, ads, drafts...
          </span>
          <span className="ml-auto flex items-center gap-0.5 text-[11px] text-gray-600 font-medium">
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-500 font-mono">
              <Command size={9} aria-hidden="true" />
            </kbd>
            <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-500 font-mono">
              K
            </kbd>
          </span>
        </button>
      </div>

      {/* ── Right: Actions ── */}
      <nav className="flex items-center gap-1.5 lg:gap-2 ml-auto flex-shrink-0" aria-label="User actions">
        {/* Mobile search button */}
        <button
          onClick={() => setGlobalSearchOpen(true)}
          className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c3f53b]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[#050505]"
          aria-label="Open global search"
          type="button"
        >
          <Search size={18} aria-hidden="true" />
        </button>

        {/* ── Notification Bell ── */}
        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c3f53b]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[#050505]"
              aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ''}`}
              type="button"
            >
              <Bell size={18} aria-hidden="true" />
              {unreadCount > 0 && (
                <span
                  className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#c3f53b] text-[10px] font-bold text-black flex items-center justify-center"
                  aria-hidden="true"
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-[360px] bg-[#111111] border border-white/10 p-0 shadow-2xl"
            sideOffset={8}
            role="dialog"
            aria-label="Notifications panel"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] text-gray-400 hover:text-[#c3f53b] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c3f53b]/30 rounded px-1"
                  aria-label={`Mark all ${unreadCount} notifications as read`}
                  type="button"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="max-h-[360px] overflow-y-auto" role="list" aria-label="Notification items">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  No notifications yet
                </div>
              ) : (
                notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => {
                      markAsRead(notif.id)
                      setNotifOpen(false)
                    }}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03] border-b border-white/[0.03] last:border-0',
                      !notif.read && 'bg-white/[0.02]'
                    )}
                    role="listitem"
                    aria-label={`${notif.title} — ${notif.read ? 'Read' : 'Unread'} notification`}
                    type="button"
                  >
                    <div className="flex-shrink-0 mt-0.5" aria-hidden="true">
                      <NotificationIcon type={notif.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm truncate',
                          !notif.read ? 'font-medium text-white' : 'text-gray-300'
                        )}
                      >
                        {notif.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-gray-600 mt-1">{notif.time}</p>
                    </div>
                    {!notif.read && (
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[#c3f53b] mt-1.5" aria-hidden="true" />
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-white/5 text-center">
              <Link
                to="/inbox"
                className="text-xs text-gray-400 hover:text-[#c3f53b] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c3f53b]/30 rounded px-1"
                onClick={() => setNotifOpen(false)}
              >
                View all in Inbox
              </Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* ── Workspace Badge ── */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/5"
          aria-label="Current workspace"
        >
          <div className="w-3.5 h-3.5 rounded-sm bg-[#c3f53b]/20 flex items-center justify-center">
            <span className="text-[8px] font-bold text-[#c3f53b]">W</span>
          </div>
          <span className="text-xs font-medium text-gray-300 hidden xl:inline">
            {user?.workspace_id
              ? `Workspace ${user.workspace_id.slice(0, 8)}`
              : 'Main Workspace'}
          </span>
        </div>

        {/* ── User Avatar Dropdown ── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 pl-1 pr-1.5 py-1 rounded-lg hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c3f53b]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[#050505]"
              aria-label={`${user?.name || 'User'} account menu`}
              type="button"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={`${user.name} avatar`}
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-semibold text-white ring-1 ring-white/10">
                  {user?.name
                    ? user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : 'U'}
                </div>
              )}
              <ChevronDown size={14} className="text-gray-500 hidden sm:block" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-[#111111] border border-white/10 shadow-2xl"
            sideOffset={8}
            role="menu"
            aria-label="User account options"
          >
            <DropdownMenuLabel className="px-3 py-2.5">
              <div className="flex items-center gap-3">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={`${user.name} avatar`}
                    className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-white ring-1 ring-white/10">
                    {user?.name
                      ? user.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)
                      : 'U'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem
              onClick={() => navigate('/settings')}
              className="gap-2.5 text-sm text-gray-300 focus:text-white focus:bg-white/5 cursor-pointer"
              role="menuitem"
            >
              <User size={14} aria-hidden="true" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate('/settings')}
              className="gap-2.5 text-sm text-gray-300 focus:text-white focus:bg-white/5 cursor-pointer"
              role="menuitem"
            >
              <Settings size={14} aria-hidden="true" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem
              onClick={() => logout()}
              className="gap-2.5 text-sm text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
              role="menuitem"
            >
              <LogOut size={14} aria-hidden="true" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      {/* Global Search Modal */}
      <GlobalSearch />
    </header>
  )
}
