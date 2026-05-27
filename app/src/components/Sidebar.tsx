// @ts-nocheck
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Megaphone,
  Image,
  Bot,
  BarChart3,
  Inbox,
  FileText,
  ClipboardCheck,
  Settings,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sunrise,
  ScrollText,
  Plug,
  Calendar,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useUIStore } from '../store/useUIStore'
import { useIsMobile } from '../hooks/use-mobile'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip'
import { cn } from '@/lib/utils'

/* ──────────────────────────────────────────────
   Navigation config
   ────────────────────────────────────────────── */

interface NavItem {
  label: string
  path: string
  icon: React.ElementType
  badge?: number
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'MAIN',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Campaigns', path: '/campaigns', icon: Megaphone },
      { label: 'Ads', path: '/ads', icon: Image },
      { label: 'Inbox', path: '/inbox', icon: Inbox, badge: 3 },
    ],
  },
  {
    title: 'INTELLIGENCE',
    items: [
      { label: 'AI Agent', path: '/ai-agent', icon: Bot },
      { label: 'Reports', path: '/reports', icon: BarChart3 },
      { label: 'Forecasting', path: '/forecasting', icon: TrendingUp },
      { label: 'Schedule', path: '/schedule', icon: Calendar },
      { label: 'Morning Brief', path: '/morning-brief', icon: Sunrise },
    ],
  },
  {
    title: 'AUTOMATION',
    items: [
      { label: 'Drafts', path: '/drafts', icon: FileText, badge: 5 },
      { label: 'Rules', path: '/rules', icon: ScrollText },
      { label: 'A/B Testing', path: '/ab-testing', icon: FlaskConical },
    ],
  },
  {
    title: 'MANAGE',
    items: [
      { label: 'Settings', path: '/settings', icon: Settings },
      { label: 'Integrations', path: '/integrations/slack', icon: Plug },
      { label: 'Audit', path: '/audit', icon: ClipboardCheck },
    ],
  },
]

/* ──────────────────────────────────────────────
   Route → page title mapping for breadcrumbs
   ────────────────────────────────────────────── */

export function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/campaigns': 'Campaigns',
    '/ads': 'Ads',
    '/ai-agent': 'AI Agent',
    '/reports': 'Reports',
    '/forecasting': 'Forecasting',
    '/inbox': 'Inbox',
    '/drafts': 'Drafts',
    '/rules': 'Rules',
    '/audit': 'Audit Log',
    '/settings': 'Settings',
    '/morning-brief': 'Morning Brief',
    '/creative-studio': 'Creative Studio',
    '/ab-testing': 'A/B Testing',
    '/templates': 'Templates',
    '/calendar': 'Calendar',
    '/schedule': 'Schedule',
    '/agency': 'Agency',
    '/audiences': 'Audiences',
    '/pacing': 'Budget Pacing',
    '/creative-brief': 'Creative Brief',
    '/approvals': 'Approvals',
    '/billing': 'Billing',
    '/developers': 'Developer Portal',
    '/integrations/slack': 'Integrations',
  }
  return titles[pathname] || ''
}

export function getPageSection(pathname: string): string {
  if (pathname === '/dashboard') return 'Overview'
  if (['/campaigns', '/ads', '/inbox'].includes(pathname)) return 'Main'
  if (['/ai-agent', '/reports', '/forecasting', '/schedule', '/morning-brief'].includes(pathname)) return 'Intelligence'
  if (['/drafts', '/rules', '/ab-testing'].includes(pathname)) return 'Automation'
  if (['/settings', '/integrations/slack', '/audit'].includes(pathname)) return 'Manage'
  if (['/creative-studio', '/templates', '/calendar'].includes(pathname)) return 'Tools'
  if (['/agency', '/audiences', '/pacing'].includes(pathname)) return 'Agency'
  return 'App'
}

/* ──────────────────────────────────────────────
   Animated badge component
   ────────────────────────────────────────────── */

function NavBadge({ count, collapsed }: { count: number; collapsed: boolean }) {
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold bg-[#c3f53b]/15 text-[#c3f53b]',
        collapsed
          ? 'min-w-[18px] h-[18px] px-1 text-[10px]'
          : 'min-w-[20px] h-5 px-1.5 text-[11px]'
      )}
      aria-hidden="true"
    >
      {count}
    </motion.span>
  )
}

/* ──────────────────────────────────────────────
   Sidebar Nav Item (desktop)
   ────────────────────────────────────────────── */

function SidebarNavItem({
  item,
  collapsed,
}: {
  item: NavItem
  collapsed: boolean
}) {
  const location = useLocation()
  const isActive = location.pathname === item.path

  const inner = (
    <Link
      to={item.path}
      className={cn(
        'group relative flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c3f53b]/50',
        isActive
          ? 'border-l-2 border-[#c3f53b] bg-white/5 text-white'
          : 'border-l-2 border-transparent text-gray-400 hover:bg-white/[0.02] hover:text-white'
      )}
      aria-current={isActive ? 'page' : undefined}
      aria-label={item.badge ? `${item.label} — ${item.badge} unread` : item.label}
      role="link"
    >
      <item.icon
        size={18}
        className={cn(
          'flex-shrink-0 transition-colors duration-200',
          isActive ? 'text-[#c3f53b]' : 'text-gray-400 group-hover:text-white'
        )}
        aria-hidden="true"
      />
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="flex-1 whitespace-nowrap overflow-hidden"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
      {!collapsed && item.badge !== undefined && item.badge > 0 && (
        <NavBadge count={item.badge} collapsed={false} />
      )}
      {collapsed && item.badge !== undefined && item.badge > 0 && (
        <span className="absolute top-1.5 right-1.5" aria-hidden="true">
          <span className="block w-2 h-2 rounded-full bg-[#c3f53b]" />
        </span>
      )}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent
          side="right"
          sideOffset={8}
          className="bg-[#1a1a1a] text-white border border-white/10 text-xs font-medium px-3 py-1.5 rounded-lg shadow-xl flex items-center gap-2"
        >
          <span>{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <NavBadge count={item.badge} collapsed />
          )}
        </TooltipContent>
      </Tooltip>
    )
  }

  return inner
}

/* ──────────────────────────────────────────────
   Demo Mode Indicator
   ────────────────────────────────────────────── */

function DemoModeIndicator({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center py-2 transition-all duration-200',
        collapsed ? 'justify-center px-2' : 'px-4 gap-2.5'
      )}
      aria-hidden="true"
    >
      <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
      </span>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="text-[11px] font-medium text-emerald-400 whitespace-nowrap overflow-hidden uppercase tracking-wider"
          >
            Demo
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ──────────────────────────────────────────────
   Sidebar Content (shared between desktop & mobile)
   ────────────────────────────────────────────── */

function SidebarContent({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth()
  const { logout } = useAuth()

  return (
    <div className="flex flex-col h-full">
      {/* ── Logo ── */}
      <div
        className={cn(
          'flex items-center h-16 flex-shrink-0 border-b border-white/5',
          collapsed ? 'justify-center px-0' : 'px-4 gap-2'
        )}
      >
        <Link to="/dashboard" className="flex items-center gap-1.5" aria-label="AdNexus AI Dashboard home">
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="font-bold text-lg text-white tracking-tight whitespace-nowrap overflow-hidden"
              >
                AdNexus
              </motion.span>
            )}
          </AnimatePresence>
          <motion.span
            layout
            className="text-[#c3f53b] font-bold text-lg"
            aria-hidden="true"
          >
            {collapsed ? 'A' : 'AI'}
          </motion.span>
        </Link>
      </div>

      {/* ── Navigation Groups ── */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden py-4 custom-scrollbar"
        aria-label="Main navigation"
        role="navigation"
      >
        {NAV_GROUPS.map((group, groupIndex) => (
          <motion.div
            key={group.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.05, duration: 0.25 }}
            className="mb-5"
          >
            {/* Group header */}
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <h3 className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-600 select-none">
                    {group.title}
                  </h3>
                </motion.div>
              )}
            </AnimatePresence>
            {collapsed && (
              <div className="flex justify-center mb-2" aria-hidden="true">
                <div className="w-6 h-px bg-white/5" />
              </div>
            )}

            {/* Group items */}
            <ul className="space-y-0.5" role="menubar">
              {group.items.map((item) => (
                <li key={item.path} role="none">
                  <SidebarNavItem
                    item={item}
                    collapsed={collapsed}
                  />
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </nav>

      {/* ── Bottom: Demo Mode + User & Workspace ── */}
      <div className="flex-shrink-0 border-t border-white/5">
        {/* Demo Mode Indicator */}
        <DemoModeIndicator collapsed={collapsed} />

        {/* Workspace badge */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-4 py-2"
            >
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                <div className="w-5 h-5 rounded bg-[#c3f53b]/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-[#c3f53b]">W</span>
                </div>
                <span className="text-xs font-medium text-gray-300 truncate flex-1">
                  {user?.workspace_id
                    ? `Workspace ${user.workspace_id.slice(0, 8)}`
                    : 'Main Workspace'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User row + logout */}
        <div
          className={cn(
            'flex items-center gap-3 py-3',
            collapsed ? 'justify-center px-2' : 'px-4'
          )}
        >
          {/* Avatar */}
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <div
                className="relative flex-shrink-0 cursor-default"
                role="img"
                aria-label={`${user?.name || 'User'} profile avatar — ${user?.role || 'Member'}`}
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={`${user.name} avatar`}
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-white ring-1 ring-white/10">
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
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0a0a0a]" />
              </div>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent
                side="right"
                sideOffset={8}
                className="bg-[#1a1a1a] text-white border border-white/10 text-xs font-medium px-3 py-1.5 rounded-lg shadow-xl"
              >
                {user?.name || 'User'}
              </TooltipContent>
            )}
          </Tooltip>

          {/* Name + Role */}
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 min-w-0 overflow-hidden"
              >
                <p className="text-sm font-medium text-white truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-[11px] text-gray-500 capitalize truncate">
                  {user?.role || 'Member'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Logout button */}
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <button
                onClick={() => logout()}
                className={cn(
                  'flex-shrink-0 p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0a0a0a]',
                  collapsed && 'p-2'
                )}
                title="Log out"
                aria-label="Log out of account"
                type="button"
              >
                <LogOut size={collapsed ? 16 : 14} aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="bg-[#1a1a1a] text-white border border-white/10 text-xs font-medium px-3 py-1.5 rounded-lg shadow-xl"
            >
              Log out
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   Main Sidebar Component
   ────────────────────────────────────────────── */

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen } =
    useUIStore()
  const isMobile = useIsMobile()

  // Close mobile sidebar on route change
  const location = useLocation()
  useEffect(() => {
    if (mobileSidebarOpen) {
      setMobileSidebarOpen(false)
    }
  }, [location.pathname])

  // ── Mobile: Sheet/drawer ──
  if (isMobile) {
    return (
      <>
        <AnimatePresence>
          {mobileSidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
                onClick={() => setMobileSidebarOpen(false)}
                aria-hidden="true"
              />
              {/* Drawer */}
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="fixed left-0 top-0 bottom-0 z-[70] w-[280px]"
                style={{
                  background: '#0a0a0a',
                  borderRight: '1px solid rgba(255,255,255,0.05)',
                }}
                role="dialog"
                aria-label="Mobile navigation menu"
                aria-modal="true"
                aria-expanded="true"
              >
                <SidebarContent collapsed={false} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </>
    )
  }

  // ── Desktop: Collapsible sidebar ──
  return (
    <TooltipProvider delayDuration={150}>
      <motion.aside
        animate={{ width: sidebarCollapsed ? 64 : 240 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="fixed left-0 top-0 bottom-0 z-40 flex flex-col overflow-hidden"
        style={{
          background: '#0a0a0a',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
        role="navigation"
        aria-label="Main navigation"
        aria-expanded={!sidebarCollapsed}
      >
        <SidebarContent collapsed={sidebarCollapsed} />

        {/* ── Collapse toggle button ── */}
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <button
              onClick={toggleSidebar}
              className="absolute -right-3 top-[70px] z-50 w-6 h-6 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:border-white/20 transition-all duration-150 shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c3f53b]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0a0a0a]"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!sidebarCollapsed}
              type="button"
            >
              <AnimatePresence mode="wait" initial={false}>
                {sidebarCollapsed ? (
                  <motion.div
                    key="chevron-right"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ChevronRight size={12} aria-hidden="true" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="chevron-left"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ChevronLeft size={12} aria-hidden="true" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={6}
            className="bg-[#1a1a1a] text-white border border-white/10 text-xs font-medium px-3 py-1.5 rounded-lg shadow-xl"
          >
            {sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          </TooltipContent>
        </Tooltip>
      </motion.aside>
    </TooltipProvider>
  )
}
