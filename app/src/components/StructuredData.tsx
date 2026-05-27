/**
 * StructuredData Component – JSON-LD Schema.org markup
 * Provides Organization, SoftwareApplication, and FAQPage schemas
 * for rich snippets in Google search results.
 */

import { useEffect } from 'react'
import { SEO_CONFIG } from './SEO'

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */

interface SchemaBase {
  '@context': 'https://schema.org'
  '@type': string
}

export interface OrganizationSchema extends SchemaBase {
  '@type': 'Organization'
  name: string
  url: string
  logo: string
  description: string
  sameAs: string[]
  contactPoint: {
    '@type': 'ContactPoint'
    contactType: string
    email: string
    availableLanguage: string[]
  }
}

export interface SoftwareApplicationSchema extends SchemaBase {
  '@type': 'SoftwareApplication'
  name: string
  applicationCategory: string
  operatingSystem: string
  description: string
  url: string
  offers: {
    '@type': 'Offer'
    price: string
    priceCurrency: string
    priceValidUntil?: string
  }
  aggregateRating?: {
    '@type': 'AggregateRating'
    ratingValue: string
    ratingCount: string
  }
  featureList?: string[]
  screenshot?: string
  softwareVersion?: string
  author: {
    '@type': 'Organization'
    name: string
    url: string
  }
}

export interface FAQPageSchema extends SchemaBase {
  '@type': 'FAQPage'
  mainEntity: FAQItem[]
}

interface FAQItem {
  '@type': 'Question'
  name: string
  acceptedAnswer: {
    '@type': 'Answer'
    text: string
  }
}

export interface BreadcrumbSchema extends SchemaBase {
  '@type': 'BreadcrumbList'
  itemListElement: BreadcrumbItem[]
}

interface BreadcrumbItem {
  '@type': 'ListItem'
  position: number
  name: string
  item: string
}

type Schema = OrganizationSchema | SoftwareApplicationSchema | FAQPageSchema | BreadcrumbSchema

/* ─────────────────────────────────────────────
   Preset Schemas
   ───────────────────────────────────────────── */

/**
 * Organization schema for AdNexus AI
 */
export function getOrganizationSchema(): OrganizationSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SEO_CONFIG.siteName,
    url: SEO_CONFIG.baseUrl,
    logo: `${SEO_CONFIG.baseUrl}/logo.png`,
    description:
      'AdNexus AI is the intelligent campaign workspace that helps marketing teams plan, launch, optimize, and report on ad campaigns with AI-powered tools.',
    sameAs: [
      'https://twitter.com/AdNexusAI',
      'https://linkedin.com/company/adnexus-ai',
      'https://github.com/adnexus-ai',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@adnexus.ai',
      availableLanguage: ['English'],
    },
  }
}

/**
 * SoftwareApplication schema for AdNexus AI
 */
export function getSoftwareApplicationSchema(): SoftwareApplicationSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SEO_CONFIG.siteName,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any (Web-based)',
    description:
      'AI-powered advertising campaign management platform for agencies and in-house marketing teams. Features include campaign optimization, A/B testing, audience management, automated reporting, and creative intelligence.',
    url: SEO_CONFIG.baseUrl,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      priceValidUntil: '2026-12-31',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1247',
    },
    featureList: [
      'AI-powered campaign optimization',
      'Multi-channel ad management',
      'A/B testing framework',
      'Audience segmentation & targeting',
      'Automated reporting & white-label reports',
      'Budget pacing & spend alerts',
      'Creative intelligence & asset management',
      'Competitive intelligence',
      'Team collaboration & approval workflows',
      'Developer API & webhooks',
    ],
    screenshot: `${SEO_CONFIG.baseUrl}/dashboard-screenshot.png`,
    softwareVersion: '2.0',
    author: {
      '@type': 'Organization',
      name: SEO_CONFIG.siteName,
      url: SEO_CONFIG.baseUrl,
    },
  }
}

/**
 * FAQPage schema with common AdNexus AI questions
 */
export function getFAQPageSchema(): FAQPageSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is AdNexus AI?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AdNexus AI is an intelligent campaign workspace that helps marketing teams and agencies plan, launch, optimize, and report on advertising campaigns using AI-powered tools. It unifies campaign management across multiple ad platforms into a single, collaborative interface.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which ad platforms does AdNexus AI support?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AdNexus AI supports Meta Ads (Facebook & Instagram), Google Ads, TikTok Ads, LinkedIn Ads, Twitter/X Ads, and Microsoft Advertising. You can manage all your campaigns from a single dashboard with cross-platform analytics and unified reporting.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is AdNexus AI suitable for agencies?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, AdNexus AI is built for agencies. Features include client scope management, white-label reports, multi-client dashboards, team collaboration tools, approval workflows, role-based access control, and consolidated billing across all client accounts.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does the AI Agent work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "The AdNexus AI Agent continuously monitors your campaigns, detects performance anomalies, suggests optimizations, and can auto-apply changes based on your approval settings. It learns from your campaign history and industry benchmarks to deliver increasingly relevant recommendations over time.",
        },
      },
      {
        '@type': 'Question',
        name: 'Does AdNexus AI offer a free trial?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, AdNexus AI offers a free tier with core campaign management features. Paid plans start with a 14-day free trial that includes access to all premium features including AI optimization, advanced reporting, and team collaboration tools. No credit card required to start.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I export reports from AdNexus AI?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Absolutely. AdNexus AI supports PDF, CSV, Excel, and PowerPoint report exports. Agency plans also include white-label report options with custom branding, scheduled delivery, and client-facing presentation modes.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is there a developer API available?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, AdNexus AI provides a comprehensive REST API with OAuth 2.0 authentication, webhooks support, and detailed documentation. Developers can build custom integrations, automate workflows, and pull campaign data programmatically.',
        },
      },
    ],
  }
}

/**
 * Build a breadcrumb schema from path segments
 */
export function getBreadcrumbSchema(path: string): BreadcrumbSchema {
  const segments = path.split('/').filter(Boolean)
  const items: BreadcrumbItem[] = []

  // Always start with Home
  items.push({
    '@type': 'ListItem',
    position: 1,
    name: 'Home',
    item: SEO_CONFIG.baseUrl,
  })

  let currentPath = ''
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    // Convert slug to display name (e.g., "ai-agent" → "AI Agent")
    const displayName = segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .replace('Ai ', 'AI ')
      .replace('Ab ', 'A/B ')

    items.push({
      '@type': 'ListItem',
      position: index + 2,
      name: displayName,
      item: `${SEO_CONFIG.baseUrl}${currentPath}`,
    })
  })

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  }
}

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */

interface StructuredDataProps {
  /** Schema object(s) to inject as JSON-LD */
  schema?: Schema | Schema[]
  /** Auto-inject common schemas (org + software) */
  defaults?: boolean
  /** Current path for breadcrumb schema (auto from window if omitted) */
  breadcrumbPath?: string
}

export default function StructuredData({
  schema,
  defaults = true,
  breadcrumbPath,
}: StructuredDataProps) {
  useEffect(() => {
    const schemas: Schema[] = []

    // Add default schemas
    if (defaults) {
      schemas.push(getOrganizationSchema())
      schemas.push(getSoftwareApplicationSchema())
    }

    // Add custom schema(s)
    if (schema) {
      if (Array.isArray(schema)) {
        schemas.push(...schema)
      } else {
        schemas.push(schema)
      }
    }

    // Add breadcrumb schema
    const path = breadcrumbPath || window.location.pathname
    if (path !== '/') {
      schemas.push(getBreadcrumbSchema(path))
    }

    // Create/update script tags
    // Remove old scripts from this component
    document.querySelectorAll(`script[data-structured-data]`).forEach((el) => el.remove())

    schemas.forEach((s) => {
      const script = document.createElement('script')
      script.setAttribute('type', 'application/ld+json')
      script.setAttribute('data-structured-data', '')
      script.textContent = JSON.stringify(s)
      document.head.appendChild(script)
    })

    // Cleanup on unmount
    return () => {
      document.querySelectorAll(`script[data-structured-data]`).forEach((el) => el.remove())
    }
  }, [schema, defaults, breadcrumbPath])

  return null
}
