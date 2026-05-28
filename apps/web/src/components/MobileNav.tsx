import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Megaphone,
  Bot,
  Inbox,
  Menu,
} from 'lucide-react'
import { useUIStore } from '../store/useUIStore'
import { cn } from '@/lib/utils'

/* ──────────────────────────────────────────────
   Mobile Bottom Tab Bar
   Visible only on screens < 768px
   ────────────────────────────────────────────── */

interface TabItem {
  label: string
  path: string
  icon: React.ElementType
}

const TABS: TabItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Campaigns', path: '/campaigns', icon: Megaphone },
  { label: 'AI Agent', path: '/ai-agent', icon: Bot },
  { label: 'Inbox', path: '/inbox', icon: Inbox },
  { label: 'Menu', path: '#menu', icon: Menu },
]

export default function MobileNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { toggleMobileSidebar } = useUIStore()

  const handleTabClick = (tab: TabItem) => {
    if (tab.path === '#menu') {
      toggleMobileSidebar()
    } else {
      navigate(tab.path)
    }
  }

  return (
    <nav
      role="navigation"
      aria-label="Mobile bottom navigation"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-16 px-2 border-t border-white/5 md:hidden"
      style={{
        background: 'rgba(10, 10, 10, 0.92)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }}
    >
      {/* Top highlight line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-white/5" />

      {TABS.map((tab) => {
        const isActive =
          tab.path === '#menu'
            ? false
            : location.pathname === tab.path ||
              location.pathname.startsWith(`${tab.path}/`)

        return (
          <button
            key={tab.label}
            onClick={() => handleTabClick(tab)}
            className={cn(
              'relative flex flex-col items-center justify-center gap-1 w-16 h-full rounded-lg transition-all duration-200',
              'active:scale-95',
              isActive
                ? 'text-[#c3f53b]'
                : 'text-gray-500 hover:text-gray-300'
            )}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
          >
            {/* Active indicator dot */}
            {isActive && (
              <motion.div
                layoutId="mobileNavIndicator"
                className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#c3f53b]"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}

            <tab.icon
              size={22}
              strokeWidth={isActive ? 2.5 : 1.5}
              className="transition-all duration-200"
            />

            <span
              className={cn(
                'text-[10px] font-medium leading-none transition-colors duration-200',
                isActive ? 'text-[#c3f53b]' : 'text-gray-500'
              )}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
