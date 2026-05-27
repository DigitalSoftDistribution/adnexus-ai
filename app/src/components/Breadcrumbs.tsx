// @ts-nocheck
import { Link, useLocation } from 'react-router-dom'
import { Home, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ──────────────────────────────────────────────
   Reusable Breadcrumbs Component

   Props:
   - items?: Array of { label, href? } — if not provided,
     breadcrumbs are auto-generated from current route
   - homeHref?: string — Home link target (default: /dashboard)
   - className?: string — additional CSS classes

   Shows Home > Section > Page with clickable links
   ────────────────────────────────────────────── */

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
  homeHref?: string
  className?: string
}

/* ──────────────────────────────────────────────
   Route-based breadcrumb mapping
   ────────────────────────────────────────────── */

function getRouteBreadcrumbItems(pathname: string): BreadcrumbItem[] {
  const segments: Record<string, BreadcrumbItem[]> = {
    '/dashboard': [{ label: 'Dashboard' }],
    '/campaigns': [{ label: 'Campaigns' }],
    '/ads': [{ label: 'Ads' }],
    '/ai-agent': [{ label: 'AI Agent' }],
    '/reports': [{ label: 'Reports' }],
    '/inbox': [{ label: 'Inbox' }],
    '/drafts': [{ label: 'Drafts' }],
    '/rules': [{ label: 'Rules' }],
    '/audit': [{ label: 'Audit Log' }],
    '/settings': [{ label: 'Settings' }],
    '/morning-brief': [{ label: 'Morning Brief' }],
    '/ab-testing': [{ label: 'A/B Testing' }],
    '/integrations/slack': [{ label: 'Integrations' }],
  }

  for (const [route, items] of Object.entries(segments)) {
    if (pathname === route) return items
    if (pathname.startsWith(`${route}/`)) {
      return [...items, { label: 'Detail' }]
    }
  }

  if (pathname.startsWith('/campaigns/')) {
    return [
      { label: 'Campaigns', href: '/campaigns' },
      { label: 'Detail' },
    ]
  }
  if (pathname.startsWith('/ads/')) {
    return [
      { label: 'Ads', href: '/ads' },
      { label: 'Detail' },
    ]
  }

  return [{ label: 'Page' }]
}

export default function Breadcrumbs({
  items,
  homeHref = '/dashboard',
  className,
}: BreadcrumbsProps) {
  const location = useLocation()
  const pathname = location.pathname

  // Skip breadcrumbs for marketing/public/auth pages
  if (
    pathname === '/' ||
    pathname === '/blog' ||
    pathname.startsWith('/blog/') ||
    pathname.startsWith('/compare/') ||
    pathname.startsWith('/tools') ||
    ['/signin', '/signup', '/forgot-password', '/onboarding'].includes(pathname)
  ) {
    return null
  }

  // Use provided items or auto-generate from route
  const breadcrumbItems = items ?? getRouteBreadcrumbItems(pathname)

  if (!breadcrumbItems || breadcrumbItems.length === 0) {
    return null
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        'flex items-center gap-1.5 text-sm flex-wrap',
        className
      )}
    >
      {/* Home link */}
      <Link
        to={homeHref}
        className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors duration-200"
        aria-label="Home"
      >
        <Home size={14} className="flex-shrink-0" />
        <span className="hidden sm:inline">Home</span>
      </Link>

      {/* Breadcrumb items */}
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1

        return (
          <div key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            <ChevronRight
              size={14}
              className="text-gray-600 flex-shrink-0"
              aria-hidden="true"
            />
            {item.href && !isLast ? (
              <Link
                to={item.href}
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  isLast
                    ? 'text-white font-medium'
                    : 'text-gray-400'
                )}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </div>
        )
      })}
    </nav>
  )
}

/* ──────────────────────────────────────────────
   Named export for manual item generation
   ────────────────────────────────────────────── */

export { getRouteBreadcrumbItems }
