import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Link,
  Plug,
  Check,
  ArrowRight,
  Settings,
  Sparkles,
  Webhook,
  FileSpreadsheet,
  Zap,
  ShoppingBag,
  CreditCard,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import PageTransition from '@/components/PageTransition'
import SEO from '../components/SEO';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type IntegrationStatus = 'connected' | 'available' | 'coming_soon'

interface Integration {
  id: string
  name: string
  description: string
  category: string
  status: IntegrationStatus
  connectedAt?: string
  icon: React.ReactNode
  color: string
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const integrations: Integration[] = [
  {
    id: 'meta-ads',
    name: 'Meta Ads',
    description: 'Official API connection for Facebook and Instagram advertising campaigns. Sync audiences, creatives, and performance data.',
    category: 'Ad Platform',
    status: 'connected',
    connectedAt: '2025-11-15',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
    color: '#E1306C',
  },
  {
    id: 'google-ads',
    name: 'Google Ads',
    description: 'Official Google Ads API integration. Manage search, display, and video campaigns directly from the dashboard.',
    category: 'Ad Platform',
    status: 'connected',
    connectedAt: '2025-10-28',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M1.212 18.271c-.245-.386-.394-.836-.394-1.323 0-.54.17-1.031.469-1.43l.011-.016 6.816-9.015c.255-.337.637-.553 1.067-.553.43 0 .812.216 1.067.553l2.178 2.88-2.729 3.607-3.262-4.312-5.465 7.222h9.038l2.179 2.88H3.4c-.908 0-1.648-.74-1.648-1.648 0-.234.051-.456.141-.657l.015-.031.304-.458zM22.788 18.271l-6.816-9.015-2.179 2.88-3.261 4.312-1.634-2.156 4.895-6.469c.255-.337.637-.553 1.067-.553.43 0 .812.216 1.067.553l8.323 11.007.015.031c.09.201.141.423.141.657 0 .908-.74 1.648-1.648 1.648h-7.261l2.179-2.88h3.912l.304.458.015.031c.09.201.141.423.141.657 0 .487-.149.937-.394 1.323l-.011.016z" />
      </svg>
    ),
    color: '#4285F4',
  },
  {
    id: 'tiktok-ads',
    name: 'TikTok Ads',
    description: 'Official TikTok for Business API. Launch and manage TikTok ad campaigns with full creative and audience control.',
    category: 'Ad Platform',
    status: 'connected',
    connectedAt: '2025-12-01',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.4 0 .78.08 1.13.22v-3.5a6.37 6.37 0 00-1.13-.11A6.34 6.34 0 003.14 15.2a6.34 6.34 0 006.32 6.34 6.34 6.34 0 006.32-6.34V8.83a8.2 8.2 0 004.77 1.52v-3.5c-.05-.02-.1-.04-.16-.16z" />
      </svg>
    ),
    color: '#000000',
  },
  {
    id: 'snapchat-ads',
    name: 'Snapchat Ads',
    description: 'Official Snapchat Marketing API. Create Snap ads, story ads, and collection ads with advanced targeting.',
    category: 'Ad Platform',
    status: 'connected',
    connectedAt: '2026-01-10',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301a.42.42 0 01.17-.032.4.4 0 01.202.058c.092.056.14.14.14.24 0 .179-.177.396-.42.548a3.13 3.13 0 01-.454.24c-.463.208-1.09.558-1.332 1.15-.053.13-.065.292-.037.49.065.458.373.779.753 1.17.21.22.451.471.651.783.115.18.18.39.18.6 0 .42-.27.79-.72.97a2.46 2.46 0 01-.9.17c-.3 0-.6-.06-.88-.12-.3-.06-.61-.12-.9-.12-.21 0-.45.03-.67.179-.39.27-.75.569-1.09.869-.45.39-.93.81-1.47.96-.15.045-.3.06-.45.06-.27 0-.54-.06-.78-.12-.45-.12-.87-.36-1.29-.66-.3-.21-.6-.45-.93-.69a4.93 4.93 0 00-.66-.42c-.27-.12-.57-.18-.87-.18-.3 0-.6.06-.9.12-.27.06-.54.12-.84.12a2.46 2.46 0 01-.9-.17c-.45-.18-.72-.55-.72-.97 0-.21.06-.42.18-.6.21-.3.45-.57.66-.78.39-.39.69-.72.75-1.17.03-.2.02-.36-.04-.49-.24-.6-.87-.96-1.33-1.17a2.99 2.99 0 01-.45-.24c-.24-.15-.42-.36-.42-.55 0-.1.05-.18.14-.24a.4.4 0 01.2-.06c.06 0 .12.01.17.03.39.18.74.28 1.03.3.24 0 .36-.06.42-.09-.01-.18-.02-.35-.03-.51l-.003-.06c-.104-1.628-.23-3.654.3-4.847C6.296 1.069 9.652.793 10.643.793h1.563z" />
      </svg>
    ),
    color: '#FFFC00',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Configure webhook notifications to keep your team informed about campaign performance, alerts, and approvals.',
    category: 'Notifications',
    status: 'available',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 01.003 15.165a2.527 2.527 0 012.52-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834.003a2.528 2.528 0 012.521 2.52v2.52H8.834zM8.834 6.313a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165.003a2.528 2.528 0 012.523 2.52v6.312zM15.165 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z" />
      </svg>
    ),
    color: '#4A154B',
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Export campaign reports, performance metrics, and custom analytics directly to Google Sheets for further analysis.',
    category: 'Export',
    status: 'available',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M11.318 12.545H7.91v-1.909h3.408v1.91zm4.5 0H12.41v-1.909h3.408v1.91zm0-3.454H7.91V7.182h7.909v1.91zm4.5-4.09L18.409 0H1.227v24h21.546V8.727h-4.955V5zm.545 1.227l2.727 2.5h-2.727v-2.5zM2.455 22.773V1.227h14.318v6.273H20.546v15.273H2.455z" />
      </svg>
    ),
    color: '#0F9D58',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Build automated workflows connecting your ad data with 5000+ apps. Trigger actions based on campaign events.',
    category: 'Automation',
    status: 'available',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M20.71 0H3.29A3.29 3.29 0 000 3.29v17.42A3.29 3.29 0 003.29 24h17.42A3.29 3.29 0 0024 20.71V3.29A3.29 3.29 0 0020.71 0zM8.68 17.68H5.7V6.32h2.98v11.36zm9.62 0h-2.98V9.87h-3.74V6.32h10.46v3.55h-3.74v7.81z" />
      </svg>
    ),
    color: '#FF4A00',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Sync e-commerce data, product catalogs, and conversion events. Track ROAS and customer acquisition metrics.',
    category: 'E-commerce',
    status: 'available',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M15.337 23.979c0 .101-.101.151-.202.151s-1.868.252-1.868.252-1.264.252-1.415.303c0 0 0-.151-.05-.303-.051-.202-1.415-5.304-1.415-5.304s-2.023-.656-2.225-.706a.473.473 0 01-.303-.252s-2.275-5.758-2.376-6.01c-.05-.05-.101-.101-.202-.151l1.163-.454s-.05-.05-.101-.101c-.05-.05-.101-.151-.151-.252C6.083 10.848 5.58 9.585 5.58 9.585s.05-.05.101-.05c.151-.05.252-.151.353-.202.152-.1.304-.201.405-.352.101-.152.152-.303.202-.505.05-.202.05-.404.05-.606 0-.252-.05-.454-.101-.656a1.53 1.53 0 00-.303-.505c-.151-.151-.303-.252-.505-.353a1.81 1.81 0 00-.656-.151 2.26 2.26 0 00-.707.05c-.202.05-.404.151-.606.252-.201.101-.353.252-.505.404-.151.151-.252.353-.353.555-.1.201-.151.403-.201.655-.05.252-.05.454-.05.707 0 .201 0 .403.05.605.05.202.101.404.202.555.1.202.201.353.302.505l.051.05a4.97 4.97 0 01-.656.303c-.454.151-.908.252-1.364.252-.202 0-.353 0-.555-.05-.202-.05-.353-.101-.505-.202a1.237 1.237 0 01-.353-.353c-.1-.151-.151-.302-.201-.504-.05-.202-.05-.353-.05-.555 0-.202 0-.404.05-.555.05-.202.101-.353.202-.505.1-.151.201-.303.353-.454.151-.151.302-.252.454-.353.201-.1.353-.201.555-.252.201-.05.403-.1.655-.1.151 0 .303 0 .454.05.151.05.303.1.454.151l.05-.151c.05-.101.05-.202.101-.253.05-.1.101-.201.151-.302.05-.101.151-.202.202-.303.05-.1.151-.201.252-.302.101-.1.202-.202.353-.302.151-.1.303-.202.454-.252.202-.1.404-.151.606-.201.202-.05.454-.05.656-.05.252 0 .504.05.706.1.252.05.454.151.656.252.201.101.403.252.555.403.151.151.302.353.454.555.1.201.201.403.302.655.05.252.1.454.1.706 0 .252 0 .504-.05.706-.05.252-.1.454-.201.656-.1.201-.201.403-.353.554-.151.202-.302.353-.454.505-.201.151-.403.252-.605.353-.201.1-.454.151-.656.202-.252.05-.454.05-.706.05h-.151l-.151.454-.202.555-.151.454c-.05.151-.1.302-.151.454-.05.151-.1.303-.15.454-.05.151-.101.303-.151.454l-.05.151c.101-.05.202-.1.303-.15.302-.152.604-.253.908-.303.302-.05.655-.05.957.05.302.1.554.252.756.454.201.201.353.454.454.756.1.302.1.555.05.857-.05.302-.201.555-.403.807-.201.202-.454.403-.756.504-.302.1-.554.151-.857.1-.302 0-.605-.1-.857-.252-.302-.151-.554-.353-.756-.605-.201-.252-.353-.504-.454-.807-.1-.302-.1-.605 0-.857.05-.101.05-.202.1-.252l1.515 5.304.05.151c.202.706.454 1.464.555 2.022.05.252.101.454.101.605v.152c0 .05-.05.1-.05.151l-.05.05zm8.433-17.269l-1.97 5.354c-.05.151-.15.252-.302.303-.151.05-.252.05-.403 0l-2.376-.908c-.202-.05-.353-.252-.353-.454v-4.194h.05c0-.05 0-.05.05-.1.05-.202.202-.354.353-.455.202-.1.404-.15.606-.15.202 0 .403.05.605.15.202.1.353.253.454.455.1.201.15.403.15.605 0 .201-.05.403-.15.605-.1.201-.252.353-.454.454-.201.1-.403.15-.605.15h-.05v2.725l1.515.555 1.718-4.598c.05-.151.151-.252.302-.303.151-.05.302-.05.454 0l.202.1c.05.05.1.1.15.201.05.101.05.202.05.303 0 .101-.05.202-.1.303z" />
      </svg>
    ),
    color: '#96BF48',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'CRM integration to sync leads, contacts, and deal data. Attribute revenue back to ad campaigns with full funnel visibility.',
    category: 'CRM',
    status: 'available',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.984 2.21 2.21 0 00-4.418 0c0 .852.489 1.59 1.199 1.95v2.881a6.596 6.596 0 00-3.95 1.666l-7.539-5.88a2.248 2.248 0 00.101-.647A2.24 2.24 0 002.584.833 2.24 2.24 0 00.346 3.07c0 1.235 1.003 2.238 2.238 2.238.5 0 .96-.166 1.334-.445l7.467 5.824a6.534 6.534 0 00.921 7.71l-2.36 2.36a2.065 2.065 0 00-.576-.082 2.078 2.078 0 00-2.075 2.075A2.078 2.078 0 009.414 24a2.078 2.078 0 002.075-2.075 2.065 2.065 0 00-.082-.576l2.316-2.316a6.588 6.588 0 105.51-11.103zm-1.075 9.663a3.383 3.383 0 11-6.766 0 3.383 3.383 0 016.766 0z" />
      </svg>
    ),
    color: '#FF7A59',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Billing integration for automated invoicing, subscription management, and payment processing for agency clients.',
    category: 'Billing',
    status: 'connected',
    connectedAt: '2025-09-20',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
      </svg>
    ),
    color: '#635BFF',
  },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusBadge(status: IntegrationStatus) {
  switch (status) {
    case 'connected':
      return (
        <Badge className="bg-[#c3f53b]/15 text-[#c3f53b] border-[#c3f53b]/30 hover:bg-[#c3f53b]/25 font-medium text-xs gap-1">
          <Check className="w-3 h-3" />
          Connected
        </Badge>
      )
    case 'available':
      return (
        <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 font-medium text-xs">
          Available
        </Badge>
      )
    case 'coming_soon':
      return (
        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20 font-medium text-xs">
          Coming Soon
        </Badge>
      )
    default:
      return null
  }
}

function actionButton(integration: Integration, onAction: (id: string) => void) {
  switch (integration.status) {
    case 'connected':
      return (
        <Button
          variant="outline"
          size="sm"
          className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700 hover:text-white text-xs h-8 gap-1.5"
          onClick={() => onAction(integration.id)}
        >
          <Settings className="w-3.5 h-3.5" />
          Configure
        </Button>
      )
    case 'available':
      return (
        <Button
          size="sm"
          className="bg-[#c3f53b] text-zinc-900 hover:bg-[#b1e030] text-xs h-8 gap-1.5 font-semibold"
          onClick={() => onAction(integration.id)}
        >
          <Plug className="w-3.5 h-3.5" />
          Connect
        </Button>
      )
    case 'coming_soon':
      return (
        <Button
          variant="outline"
          size="sm"
          disabled
          className="border-zinc-700 text-zinc-600 cursor-not-allowed text-xs h-8"
        >
          Coming Soon
        </Button>
      )
    default:
      return null
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Integrations() {
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [items, setItems] = useState<Integration[]>(integrations)

  const handleAction = (id: string) => {
    const integration = items.find((i) => i.id === id)
    if (!integration) return

    if (integration.status === 'connected') {
      // Open configuration — simulate
      return
    }

    if (integration.status === 'available') {
      setConnectingId(id)
      // Simulate connection flow
      setTimeout(() => {
        setItems((prev) =>
          prev.map((i) =>
            i.id === id
              ? { ...i, status: 'connected' as IntegrationStatus, connectedAt: new Date().toISOString().split('T')[0] }
              : i
          )
        )
        setConnectingId(null)
      }, 1500)
    }
  }

  /* ── group by category ── */
  const categories = items.reduce<Record<string, Integration[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  const categoryOrder = ['Ad Platform', 'Notifications', 'Export', 'Automation', 'E-commerce', 'CRM', 'Billing']
  const orderedCategories = categoryOrder.filter((c) => categories[c])

  return (
    <>
    <SEO
      title="Integrations"
      description="Connect AdNexus AI with your favorite tools. Integrate Slack, CRM platforms, analytics tools, and third-party marketing apps."
      keywords="integrations, third-party apps, Slack integration, API connections"
    />
    <PageTransition>
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        {/* ── Header ── */}
        <div className="border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#c3f53b]/10 border border-[#c3f53b]/20 flex items-center justify-center">
                    <Link className="w-4.5 h-4.5 text-[#c3f53b]" />
                  </div>
                  Integrations Marketplace
                </h1>
                <p className="text-zinc-400 mt-2 text-sm max-w-xl">
                  Connect your favorite tools and platforms to streamline your workflow.
                  All integrations use secure OAuth authentication.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-white">{items.filter((i) => i.status === 'connected').length} / {items.length}</p>
                  <p className="text-xs text-zinc-500">Connected</p>
                </div>
                <div className="w-12 h-12 rounded-full border-2 border-zinc-700 flex items-center justify-center">
                  <span className="text-xs font-bold text-[#c3f53b]">
                    {Math.round((items.filter((i) => i.status === 'connected').length / items.length) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
          {orderedCategories.map((category) => (
            <section key={category}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                  {category}
                </h2>
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-xs text-zinc-600 font-medium">
                  {categories[category].length} integration{categories[category].length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categories[category].map((integration, idx) => (
                  <motion.div
                    key={integration.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                    className={`group relative rounded-xl border ${
                      integration.status === 'connected'
                        ? 'border-[#c3f53b]/20 bg-zinc-900/60'
                        : 'border-zinc-800 bg-zinc-900/40'
                    } hover:border-zinc-700 transition-all duration-200 overflow-hidden`}
                  >
                    {/* Connected indicator stripe */}
                    {integration.status === 'connected' && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#c3f53b]/60 to-transparent" />
                    )}

                    <div className="p-5">
                      {/* Icon & Status */}
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className="w-11 h-11 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
                          style={{
                            backgroundColor: `${integration.color}18`,
                            color: integration.color,
                          }}
                        >
                          {integration.icon}
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          {statusBadge(integration.status)}
                          {integration.connectedAt && (
                            <span className="text-[10px] text-zinc-600">
                              Since {integration.connectedAt}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Name & Description */}
                      <h3 className="text-sm font-semibold text-white mb-1.5">
                        {integration.name}
                      </h3>
                      <p className="text-xs text-zinc-500 leading-relaxed mb-4 line-clamp-3">
                        {integration.description}
                      </p>

                      {/* Category tag */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wide">
                          {integration.category}
                        </span>
                        {connectingId === integration.id ? (
                          <div className="flex items-center gap-1.5 text-xs text-[#c3f53b]">
                            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                            Connecting...
                          </div>
                        ) : (
                          actionButton(integration, handleAction)
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          ))}

          {/* ── Help / CTA ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 p-6 text-center"
          >
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3">
              <Webhook className="w-5 h-5 text-zinc-500" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">
              Need a custom integration?
            </h3>
            <p className="text-xs text-zinc-500 mb-4 max-w-md mx-auto">
              Our API supports custom webhooks and integrations. Build your own or request one from our team.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs h-8 gap-1.5"
              >
                <Code className="w-3.5 h-3.5" />
                View API Docs
              </Button>
              <Button
                size="sm"
                className="bg-[#c3f53b] text-zinc-900 hover:bg-[#b1e030] text-xs h-8 gap-1.5 font-semibold"
              >
                Request Integration
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
    </>
  )
}

/* ── Missing import helper ── */
function Code(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  )
}
