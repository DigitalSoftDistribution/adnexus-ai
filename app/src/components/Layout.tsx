import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useIsMobile, useIsTablet } from '../hooks/use-mobile'
import { useUIStore } from '../store/useUIStore'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { getPageTitle } from './Sidebar'
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import Breadcrumbs from './Breadcrumbs'
import MobileNav from './MobileNav'
import ResponsiveGrid from './ResponsiveGrid'
import { AIChatOverlay } from './AIChatOverlay'
import { CommandPalette } from './CommandPalette'
import { ProductTour } from './ProductTour'
import DemoModeBanner from './DemoModeBanner'
import SkipLink from './SkipLink'
import LiveRegion from './LiveRegion'

interface LayoutProps {
  children: ReactNode
}

/* ──────────────────────────────────────────────
   Pages that should NOT have the app sidebar layout
   (marketing pages, auth pages, landing pages)
   ────────────────────────────────────────────── */

const PUBLIC_PAGES = ['/', '/blog', '/blog/', '/compare/', '/tools']
const AUTH_PAGES = ['/signin', '/signup', '/forgot-password', '/onboarding']

function isPublicPage(pathname: string): boolean {
  if (AUTH_PAGES.includes(pathname)) return true
  if (PUBLIC_PAGES.some((p) => pathname.startsWith(p) && (p === '/' ? pathname === '/' : true)))
    return true
  // Handle blog posts: /blog/slug
  if (pathname.startsWith('/blog/')) return true
  // Handle compare pages
  if (pathname.startsWith('/compare/')) return true
  return false
}

/* ──────────────────────────────────────────────
   Responsive padding utilities by breakpoint
   ────────────────────────────────────────────── */

function getContentPadding(isMobile: boolean, isTablet: boolean): string {
  if (isMobile) return 'px-3'
  if (isTablet) return 'px-4'
  return 'px-6 lg:px-8'
}

function getContentSpacing(isMobile: boolean): string {
  if (isMobile) return 'pb-20 pt-14'
  return 'pb-8 pt-16'
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore()
  const { helpOpen, setHelpOpen, shortcuts } = useKeyboardShortcuts()

  const publicPage = isPublicPage(location.pathname)
  const pageTitle = getPageTitle(location.pathname)

  // ── Auto-collapse sidebar on tablet, expand on desktop ──
  useEffect(() => {
    if (isTablet && !sidebarCollapsed) {
      setSidebarCollapsed(true)
    }
    if (!isTablet && !isMobile && sidebarCollapsed) {
      setSidebarCollapsed(false)
    }
  }, [isTablet, isMobile, sidebarCollapsed, setSidebarCollapsed])

  // ── Update document title ──
  useEffect(() => {
    const appName = 'AdNexus AI'
    if (pageTitle) {
      document.title = `${pageTitle} — ${appName}`
    } else {
      document.title = appName
    }
  }, [pageTitle])

  // ── Public / Auth pages: full-width, no sidebar ──
  if (publicPage) {
    return (
      <div className="min-h-[100dvh] flex flex-col" style={{ background: 'var(--bg-primary)' }}>
        <SkipLink />
        <LiveRegion />
        <DemoModeBanner />
        <motion.main
          id="main-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
          className="flex-1"
          tabIndex={-1}
        >
          {children}
        </motion.main>
        <AIChatOverlay />
        <CommandPalette />
        <KeyboardShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} shortcuts={shortcuts} />
      </div>
    )
  }

  // ── App pages: responsive sidebar + navbar + content layout ──
  // Mobile:   sidebar hidden, MobileNav at bottom
  // Tablet:   collapsed sidebar (icons only, 64px)
  // Desktop:  full sidebar (240px) or user-collapsed (64px)
  const sidebarWidth = isMobile ? 0 : sidebarCollapsed ? 64 : 240
  const padding = getContentPadding(isMobile, isTablet)
  const spacing = getContentSpacing(isMobile)
  const showMobileNav = isMobile

  return (
    <div
      className="min-h-[100dvh] flex"
      style={{
        background: 'var(--bg-primary)',
        '--sidebar-width': `${sidebarWidth}px`,
      } as React.CSSProperties}
    >
      <SkipLink />
      <LiveRegion />

      {/* ── Sidebar ── */}
      {/* Hidden on mobile, collapsed on tablet, full on desktop */}
      <div className={isMobile ? 'hidden' : 'block'}>
        <Sidebar />
      </div>

      {/* ── Main content area ── */}
      <div
        className="flex-1 flex flex-col min-h-[100dvh] transition-all duration-300"
        style={{
          marginLeft: isMobile ? 0 : `${sidebarWidth}px`,
        }}
      >
        {/* Top Navbar */}
        <Navbar />

        {/* Demo Mode Banner */}
        <DemoModeBanner />

        {/* ── Page content ── */}
        <main id="main-content" className={`flex-1 ${spacing}`} tabIndex={-1}>
          {/* Breadcrumbs + Page Title strip */}
          <div className={`${padding} pt-4 pb-3`}>
            <Breadcrumbs />

            {/* Page Title — shown below breadcrumbs on mobile, hidden on desktop (Navbar shows it) */}
            {isMobile && pageTitle && (
              <motion.h1
                key={pageTitle}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="text-xl font-bold text-white mt-2"
              >
                {pageTitle}
              </motion.h1>
            )}
          </div>

          {/* Page content with animation */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
            className={`${padding}`}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* ── Mobile Bottom Navigation ── */}
      {showMobileNav && <MobileNav />}

      {/* ── Global overlays ── */}
      <AIChatOverlay />
      <CommandPalette />
      <ProductTour />
      <KeyboardShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} shortcuts={shortcuts} />
    </div>
  )
}

// Re-export ResponsiveGrid for convenience
export { ResponsiveGrid }
