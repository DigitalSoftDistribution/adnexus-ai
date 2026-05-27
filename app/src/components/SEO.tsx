/**
 * SEO Component – Dynamic meta tag & Open Graph management
 * Provides per-page control over title, description, keywords,
 * Open Graph, Twitter Cards, canonical URL, and robots directives.
 */

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/* ─────────────────────────────────────────────
   Configuration
   ───────────────────────────────────────────── */
export const SEO_CONFIG = {
  siteName: 'AdNexus AI',
  baseUrl: 'https://adnexus.ai',
  defaultImage: '/og-default.png',
  twitterHandle: '@AdNexusAI',
  locale: 'en_US',
  themeColor: '#0A0F1E',
} as const

export interface SEOProps {
  /** Page title (appended with site name) */
  title: string
  /** Meta description (recommended: 150-160 chars) */
  description: string
  /** Comma-separated keywords */
  keywords?: string
  /** OG image URL (absolute or relative) */
  image?: string
  /** Absolute canonical URL (auto-derived if omitted) */
  canonical?: string
  /** Robots directive override (default: index, follow) */
  robots?: string
  /** OG type (default: website) */
  ogType?: 'website' | 'article' | 'product' | 'software'
  /** Article publish date (ISO 8601) */
  articlePublishedTime?: string
  /** Article modified date (ISO 8601) */
  articleModifiedTime?: string
  /** Article author name */
  articleAuthor?: string
  /** Article tags */
  articleTags?: string[]
  /** Twitter card type (default: summary_large_image) */
  twitterCard?: 'summary' | 'summary_large_image' | 'app'
  /** No index flag – shorthand for robots="noindex, nofollow" */
  noindex?: boolean
  /** Additional meta tags as key-value pairs */
  additionalMeta?: Record<string, string>
}

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */
function ensureAbsoluteUrl(url: string): string {
  if (!url) return `${SEO_CONFIG.baseUrl}${SEO_CONFIG.defaultImage}`
  if (url.startsWith('http')) return url
  if (url.startsWith('/')) return `${SEO_CONFIG.baseUrl}${url}`
  return `${SEO_CONFIG.baseUrl}/${url}`
}

/**
 * Set or update a <meta> tag by its name attribute.
 */
function setMetaTag(name: string, content: string | undefined, attr: 'name' | 'property' = 'name') {
  if (!content) {
    // Remove existing tag if content is empty
    const existing = document.querySelector(`meta[${attr}="${name}"]`)
    if (existing) existing.remove()
    return
  }
  let tag = document.querySelector(`meta[${attr}="${name}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, name)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

/**
 * Set or update the <title> tag.
 */
function setTitle(title: string) {
  const fullTitle = title.includes(SEO_CONFIG.siteName)
    ? title
    : `${title} | ${SEO_CONFIG.siteName}`
  document.title = fullTitle
  // Update og:title to match
  setMetaTag('og:title', fullTitle, 'property')
}

/**
 * Set or update the canonical link tag.
 */
function setCanonical(url: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', url)
}

/**
 * Remove previously-set OG/Twitter article meta tags
 * that are page-specific.
 */
function cleanupArticleMeta() {
  const articleMetaKeys = [
    'article:published_time',
    'article:modified_time',
    'article:author',
    'article:tag',
  ]
  articleMetaKeys.forEach((key) => {
    const existing = document.querySelectorAll(`meta[property="${key}"]`)
    existing.forEach((el) => el.remove())
  })
}

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */
export default function SEO({
  title,
  description,
  keywords,
  image,
  canonical: canonicalProp,
  robots,
  ogType = 'website',
  articlePublishedTime,
  articleModifiedTime,
  articleAuthor,
  articleTags,
  twitterCard = 'summary_large_image',
  noindex = false,
  additionalMeta,
}: SEOProps) {
  const location = useLocation()

  useEffect(() => {
    const canonicalUrl = canonicalProp || `${SEO_CONFIG.baseUrl}${location.pathname}`
    const absoluteImage = ensureAbsoluteUrl(image || SEO_CONFIG.defaultImage)
    const robotsContent = noindex
      ? 'noindex, nofollow'
      : robots || 'index, follow'

    /* ── Basic Meta ── */
    setTitle(title)
    setMetaTag('description', description, 'name')
    if (keywords) setMetaTag('keywords', keywords, 'name')
    setMetaTag('robots', robotsContent, 'name')

    /* ── Canonical ── */
    setCanonical(canonicalUrl)
    setMetaTag('og:url', canonicalUrl, 'property')

    /* ── Open Graph ── */
    setMetaTag('og:site_name', SEO_CONFIG.siteName, 'property')
    setMetaTag('og:type', ogType, 'property')
    setMetaTag('og:locale', SEO_CONFIG.locale, 'property')
    setMetaTag('og:description', description, 'property')
    setMetaTag('og:image', absoluteImage, 'property')
    setMetaTag('og:image:width', '1200', 'property')
    setMetaTag('og:image:height', '630', 'property')
    setMetaTag('og:image:alt', title, 'property')

    /* ── Twitter Card ── */
    setMetaTag('twitter:card', twitterCard, 'name')
    setMetaTag('twitter:site', SEO_CONFIG.twitterHandle, 'name')
    setMetaTag('twitter:title', title, 'name')
    setMetaTag('twitter:description', description, 'name')
    setMetaTag('twitter:image', absoluteImage, 'name')
    setMetaTag('twitter:image:alt', title, 'name')

    /* ── Article-specific OG (only for article type) ── */
    cleanupArticleMeta()
    if (ogType === 'article') {
      if (articlePublishedTime) {
        setMetaTag('article:published_time', articlePublishedTime, 'property')
      }
      if (articleModifiedTime) {
        setMetaTag('article:modified_time', articleModifiedTime, 'property')
      }
      if (articleAuthor) {
        setMetaTag('article:author', articleAuthor, 'property')
      }
      articleTags?.forEach((tag) => {
        setMetaTag('article:tag', tag, 'property')
      })
    }

    /* ── Additional meta tags ── */
    if (additionalMeta) {
      Object.entries(additionalMeta).forEach(([name, content]) => {
        setMetaTag(name, content, 'name')
      })
    }

    /* ── Theme color ── */
    let themeMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null
    if (!themeMeta) {
      themeMeta = document.createElement('meta')
      themeMeta.setAttribute('name', 'theme-color')
      document.head.appendChild(themeMeta)
    }
    themeMeta.setAttribute('content', SEO_CONFIG.themeColor)

    /* ── Cleanup on unmount ── */
    return () => {
      // Meta tags persist across navigation; new page overrides them.
      // We intentionally leave them so the next page can replace.
      cleanupArticleMeta()
    }
  }, [
    title,
    description,
    keywords,
    image,
    canonicalProp,
    robots,
    ogType,
    articlePublishedTime,
    articleModifiedTime,
    articleAuthor,
    articleTags,
    twitterCard,
    noindex,
    additionalMeta,
    location.pathname,
  ])

  return null
}
