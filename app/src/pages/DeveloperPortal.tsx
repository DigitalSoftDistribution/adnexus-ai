// @ts-nocheck
import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Cpu,
  Key,
  Webhook,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Terminal,
  Code2,
  Globe,
  Search,
  Lock,
  Shield,
  Eye,
  EyeOff,
  AlertTriangle,
  Bell,
  Send,
  Brain,
  Filter,
  FileText,
  Download,
  ExternalLink,
  Play,
  BookMarked,
  Layers,
  Zap,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  DEMO MODE CHECK                                                    */
/* ------------------------------------------------------------------ */

const isDemoMode = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_DEMO_MODE === 'true' || import.meta.env.MODE === 'demo';
  }
  try {
    return window.location.search.includes('demo=true') || localStorage.getItem('demo_mode') === 'true';
  } catch {
    return false;
  }
};

const DEMO_MODE = isDemoMode();

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

interface Endpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  category: string;
  parameters: { name: string; type: string; required: boolean; description: string }[];
  requestExample: string;
  responseExample: string;
}

interface McpTool {
  id: string;
  name: string;
  description: string;
  type: 'read' | 'write' | 'agent';
  parameters: { name: string; type: string; required: boolean; description: string }[];
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsed: string;
  status: 'active' | 'revoked' | 'expired';
  environment: 'production' | 'sandbox' | 'development';
}

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  secret: string;
  status: 'active' | 'paused' | 'failing';
  createdAt: string;
  lastDelivery: string | null;
  successRate: number;
}

interface SdkDownload {
  id: string;
  name: string;
  language: string;
  version: string;
  install: string;
  clone: string;
  downloadUrl: string;
  docsUrl: string;
  icon: React.ReactNode;
  color: string;
  size: string;
  updatedAt: string;
}

interface DocSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  articles: { title: string; url: string; readTime: string }[];
}

/* ------------------------------------------------------------------ */
/*  MOCK DATA — API KEYS                                               */
/* ------------------------------------------------------------------ */

const mockApiKeys: ApiKey[] = [
  {
    id: 'key_prod_001',
    name: 'Production API Key',
    key: 'adnexus_sk_prod_a1b2c3d4e5f6789abcdef0123456789ab',
    prefix: 'adnexus_sk_prod_',
    scopes: ['campaigns:read', 'campaigns:write', 'reports:read', 'agent:read'],
    createdAt: '2026-01-15T10:30:00Z',
    lastUsed: '2026-05-20T08:45:00Z',
    status: 'active',
    environment: 'production',
  },
  {
    id: 'key_sandbox_001',
    name: 'Sandbox Test Key',
    key: 'adnexus_sk_sandbox_z9y8x7w6v5u4t3s2r1q0p9876543210fed',
    prefix: 'adnexus_sk_sandbox_',
    scopes: ['campaigns:read', 'campaigns:write', 'drafts:read', 'drafts:write', 'webhooks:write'],
    createdAt: '2026-03-10T14:20:00Z',
    lastUsed: '2026-05-19T16:30:00Z',
    status: 'active',
    environment: 'sandbox',
  },
  {
    id: 'key_dev_001',
    name: 'Development Key',
    key: 'adnexus_sk_dev_feedcba09876543210fedcba98765432',
    prefix: 'adnexus_sk_dev_',
    scopes: ['campaigns:read', 'reports:read'],
    createdAt: '2026-02-01T09:00:00Z',
    lastUsed: '2026-05-18T11:15:00Z',
    status: 'active',
    environment: 'development',
  },
  {
    id: 'key_legacy_001',
    name: 'Legacy Integration',
    key: 'adnexus_sk_legacy_1234567890abcdef1234567890abcdef',
    prefix: 'adnexus_sk_legacy_',
    scopes: ['campaigns:read', 'agent:read'],
    createdAt: '2025-08-20T12:00:00Z',
    lastUsed: '2026-04-15T09:00:00Z',
    status: 'expired',
    environment: 'production',
  },
];

/* ------------------------------------------------------------------ */
/*  MOCK DATA — WEBHOOK ENDPOINTS                                      */
/* ------------------------------------------------------------------ */

const mockWebhookEndpoints: WebhookEndpoint[] = [
  {
    id: 'wh_primary',
    url: 'https://api.yourcompany.com/webhooks/adnexus',
    events: ['campaign.created', 'campaign.status_changed', 'draft.approved', 'alert.anomaly'],
    secret: 'whsec_a1b2c3d4e5f6789abcdef0123456789ab',
    status: 'active',
    createdAt: '2026-01-20T08:00:00Z',
    lastDelivery: '2026-05-20T14:32:05Z',
    successRate: 99.2,
  },
  {
    id: 'wh_alerts',
    url: 'https://alerts.yourcompany.com/slack/adnexus',
    events: ['alert.budget_cap', 'alert.creative_fatigue', 'alert.anomaly'],
    secret: 'whsec_z9y8x7w6v5u4t3s2r1q0p9876543210fe',
    status: 'active',
    createdAt: '2026-02-15T10:00:00Z',
    lastDelivery: '2026-05-20T14:30:00Z',
    successRate: 97.8,
  },
  {
    id: 'wh_reports',
    url: 'https://reports.yourcompany.com/webhook',
    events: ['report.generated'],
    secret: 'whsec_reports_feedcba09876543210fedcba9876543',
    status: 'active',
    createdAt: '2026-03-01T12:00:00Z',
    lastDelivery: '2026-05-20T12:00:00Z',
    successRate: 100,
  },
  {
    id: 'wh_backup',
    url: 'https://backup.yourcompany.com/webhooks/adnexus',
    events: ['campaign.created', 'campaign.updated', 'campaign.ended', 'draft.created', 'draft.approved', 'draft.rejected'],
    secret: 'whsec_backup_1234567890abcdef1234567890abcdef',
    status: 'paused',
    createdAt: '2026-01-10T09:00:00Z',
    lastDelivery: null,
    successRate: 0,
  },
];

/* ------------------------------------------------------------------ */
/*  MOCK DATA — SDK DOWNLOADS                                          */
/* ------------------------------------------------------------------ */

const mockSdkDownloads: SdkDownload[] = [
  {
    id: 'sdk_node', name: 'Node.js', language: 'JavaScript / TypeScript',
    version: 'v3.2.1', install: 'npm install @adnexus/sdk',
    clone: 'git clone https://github.com/adnexus/sdk-node.git',
    downloadUrl: 'https://github.com/adnexus/sdk-node/releases/download/v3.2.1/adnexus-sdk-node-3.2.1.tgz',
    docsUrl: 'https://docs.adnexus.io/sdks/node', icon: <Terminal size={18} />,
    color: '#10B981', size: '142 KB', updatedAt: '2026-05-18',
  },
  {
    id: 'sdk_python', name: 'Python', language: 'Python 3.9+',
    version: 'v2.8.4', install: 'pip install adnexus-sdk',
    clone: 'git clone https://github.com/adnexus/sdk-python.git',
    downloadUrl: 'https://github.com/adnexus/sdk-python/releases/download/v2.8.4/adnexus_sdk-2.8.4-py3-none-any.whl',
    docsUrl: 'https://docs.adnexus.io/sdks/python', icon: <Code2 size={18} />,
    color: '#F59E0B', size: '89 KB', updatedAt: '2026-05-15',
  },
  {
    id: 'sdk_go', name: 'Go', language: 'Go 1.21+',
    version: 'v1.5.2', install: 'go get github.com/adnexus/sdk-go',
    clone: 'git clone https://github.com/adnexus/sdk-go.git',
    downloadUrl: 'https://github.com/adnexus/sdk-go/releases/download/v1.5.2/adnexus-sdk-go-v1.5.2.zip',
    docsUrl: 'https://docs.adnexus.io/sdks/go', icon: <Globe size={18} />,
    color: '#3B82F6', size: '203 KB', updatedAt: '2026-05-12',
  },
  {
    id: 'sdk_ruby', name: 'Ruby', language: 'Ruby 3.0+',
    version: 'v1.3.0', install: 'gem install adnexus-sdk',
    clone: 'git clone https://github.com/adnexus/sdk-ruby.git',
    downloadUrl: 'https://github.com/adnexus/sdk-ruby/releases/download/v1.3.0/adnexus-sdk-ruby-1.3.0.gem',
    docsUrl: 'https://docs.adnexus.io/sdks/ruby', icon: <Code2 size={18} />,
    color: '#EF4444', size: '76 KB', updatedAt: '2026-05-10',
  },
  {
    id: 'sdk_php', name: 'PHP', language: 'PHP 8.1+',
    version: 'v2.1.3', install: 'composer require adnexus/sdk',
    clone: 'git clone https://github.com/adnexus/sdk-php.git',
    downloadUrl: 'https://github.com/adnexus/sdk-php/releases/download/v2.1.3/adnexus-sdk-php-2.1.3.zip',
    docsUrl: 'https://docs.adnexus.io/sdks/php', icon: <Code2 size={18} />,
    color: '#8B5CF6', size: '118 KB', updatedAt: '2026-05-08',
  },
  {
    id: 'sdk_rust', name: 'Rust', language: 'Rust 1.75+',
    version: 'v0.9.1', install: 'cargo add adnexus-sdk',
    clone: 'git clone https://github.com/adnexus/sdk-rust.git',
    downloadUrl: 'https://github.com/adnexus/sdk-rust/releases/download/v0.9.1/adnexus-sdk-rs-0.9.1.tar.gz',
    docsUrl: 'https://docs.adnexus.io/sdks/rust', icon: <Terminal size={18} />,
    color: '#F97316', size: '167 KB', updatedAt: '2026-05-05',
  },
];

/* ------------------------------------------------------------------ */
/*  MOCK DATA — DOCUMENTATION SECTIONS                                 */
/* ------------------------------------------------------------------ */

const mockDocSections: DocSection[] = [
  {
    id: 'docs_getting_started',
    title: 'Getting Started',
    description: 'Quick setup guides and first API calls',
    icon: <Play size={18} />,
    articles: [
      { title: 'Creating Your First API Key', url: '#docs-create-key', readTime: '3 min' },
      { title: 'Making Your First Request', url: '#docs-first-request', readTime: '5 min' },
      { title: 'Authentication Quickstart', url: '#docs-auth-quickstart', readTime: '4 min' },
      { title: 'SDK Installation Guide', url: '#docs-sdk-install', readTime: '6 min' },
      { title: 'Webhook Setup Tutorial', url: '#docs-webhook-setup', readTime: '8 min' },
    ],
  },
  {
    id: 'docs_api_guides',
    title: 'API Guides',
    description: 'Detailed guides for common API workflows',
    icon: <BookMarked size={18} />,
    articles: [
      { title: 'Campaign Lifecycle Management', url: '#docs-campaign-lifecycle', readTime: '12 min' },
      { title: 'Working with Draft Approvals', url: '#docs-draft-approvals', readTime: '10 min' },
      { title: 'Budget Pacing & Optimization', url: '#docs-budget-pacing', readTime: '8 min' },
      { title: 'Audience Segmentation', url: '#docs-audiences', readTime: '7 min' },
      { title: 'Report Generation & Scheduling', url: '#docs-reports', readTime: '9 min' },
    ],
  },
  {
    id: 'docs_integrations',
    title: 'Integrations',
    description: 'Connect AdNexus with your existing stack',
    icon: <Layers size={18} />,
    articles: [
      { title: 'Slack Notifications Setup', url: '#docs-slack', readTime: '5 min' },
      { title: 'Zapier Integration', url: '#docs-zapier', readTime: '6 min' },
      { title: 'Salesforce CRM Sync', url: '#docs-salesforce', readTime: '10 min' },
      { title: 'HubSpot Connector', url: '#docs-hubspot', readTime: '8 min' },
      { title: 'Custom ETL Pipeline', url: '#docs-etl', readTime: '15 min' },
    ],
  },
  {
    id: 'docs_advanced',
    title: 'Advanced Topics',
    description: 'Deep dives into advanced features',
    icon: <Zap size={18} />,
    articles: [
      { title: 'AI Agent Configuration', url: '#docs-ai-agent', readTime: '12 min' },
      { title: 'Anomaly Detection Tuning', url: '#docs-anomaly', readTime: '10 min' },
      { title: 'Rate Limiting & Throttling', url: '#docs-rate-limits', readTime: '7 min' },
      { title: 'Custom Webhook Events', url: '#docs-custom-webhooks', readTime: '11 min' },
      { title: 'MCP Server Deployment', url: '#docs-mcp-deploy', readTime: '14 min' },
    ],
  },
  {
    id: 'docs_reference',
    title: 'Reference',
    description: 'Complete API reference and schemas',
    icon: <FileText size={18} />,
    articles: [
      { title: 'OpenAPI 3.0 Spec', url: '#docs-openapi', readTime: '20 min' },
      { title: 'Error Codes & Handling', url: '#docs-errors', readTime: '6 min' },
      { title: 'Pagination Guide', url: '#docs-pagination', readTime: '4 min' },
      { title: 'Changelog v3.0', url: '#docs-changelog', readTime: '8 min' },
      { title: 'Deprecation Policy', url: '#docs-deprecation', readTime: '3 min' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  EXISTING MOCK DATA                                                 */
/* ------------------------------------------------------------------ */

const categories = ['Auth', 'Campaigns', 'Ad Sets', 'Ads', 'Drafts', 'Reports', 'Audiences', 'Webhooks', 'Agent'];

const endpoints: Endpoint[] = [
  {
    id: 'auth-token', method: 'POST', path: '/v1/auth/token',
    description: 'Exchange API key for JWT access token', category: 'Auth',
    parameters: [
      { name: 'api_key', type: 'string', required: true, description: 'Your AdNexus API key' },
      { name: 'expires_in', type: 'integer', required: false, description: 'Token lifetime in seconds (default: 3600)' },
    ],
    requestExample: `curl -X POST https://api.adnexus.io/v1/auth/token \\\n  -H "Content-Type: application/json" \\\n  -d '{"api_key": "adnexus_sk_a1b2c3d4"}'`,
    responseExample: `{\n  "access_token": "eyJhbGciOiJIUzI1NiIs...",\n  "token_type": "Bearer",\n  "expires_in": 3600,\n  "scope": "campaigns:read drafts:write"\n}`,
  },
  {
    id: 'auth-refresh', method: 'POST', path: '/v1/auth/refresh',
    description: 'Refresh an expiring JWT token', category: 'Auth',
    parameters: [
      { name: 'refresh_token', type: 'string', required: true, description: 'Refresh token from initial auth' },
    ],
    requestExample: `curl -X POST https://api.adnexus.io/v1/auth/refresh \\\n  -H "Content-Type: application/json" \\\n  -d '{"refresh_token": "rt_abc123..."}'`,
    responseExample: `{\n  "access_token": "eyJhbGciOiJIUzI1NiIs...",\n  "expires_in": 3600\n}`,
  },
  {
    id: 'camp-list', method: 'GET', path: '/v1/campaigns',
    description: 'List all campaigns with optional filtering', category: 'Campaigns',
    parameters: [
      { name: 'platform', type: 'string', required: false, description: 'Filter by platform: meta, google, tiktok, snap' },
      { name: 'status', type: 'string', required: false, description: 'Filter by status: active, paused, draft, ended' },
      { name: 'limit', type: 'integer', required: false, description: 'Max results per page (default: 50)' },
      { name: 'offset', type: 'integer', required: false, description: 'Pagination offset' },
    ],
    requestExample: `curl -X GET "https://api.adnexus.io/v1/campaigns?platform=meta&status=active&limit=10" \\\n  -H "Authorization: Bearer {token}"`,
    responseExample: `{\n  "data": [\n    {\n      "id": "camp_123",\n      "name": "Summer Sale 2026",\n      "platform": "meta",\n      "status": "active",\n      "budget": 5000,\n      "spend": 3240,\n      "roas": 3.82\n    }\n  ],\n  "pagination": { "total": 42, "limit": 10, "offset": 0 }\n}`,
  },
  {
    id: 'camp-get', method: 'GET', path: '/v1/campaigns/{id}',
    description: 'Get a single campaign by ID', category: 'Campaigns',
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'Campaign ID (path param)' },
    ],
    requestExample: `curl -X GET https://api.adnexus.io/v1/campaigns/camp_123 \\\n  -H "Authorization: Bearer {token}"`,
    responseExample: `{\n  "id": "camp_123",\n  "name": "Summer Sale 2026",\n  "platform": "meta",\n  "status": "active",\n  "budget": 5000,\n  "spend": 3240,\n  "conversions": 1247,\n  "ctr": 2.41,\n  "roas": 3.82,\n  "created_at": "2026-05-01T08:00:00Z"\n}`,
  },
  {
    id: 'camp-create', method: 'POST', path: '/v1/campaigns',
    description: 'Create a new campaign (requires draft approval for write keys)', category: 'Campaigns',
    parameters: [
      { name: 'name', type: 'string', required: true, description: 'Campaign name' },
      { name: 'platform', type: 'string', required: true, description: 'Platform: meta, google, tiktok, snap' },
      { name: 'budget', type: 'number', required: true, description: 'Daily budget in USD' },
      { name: 'objective', type: 'string', required: true, description: 'Campaign objective' },
    ],
    requestExample: `curl -X POST https://api.adnexus.io/v1/campaigns \\\n  -H "Authorization: Bearer {token}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "Q3 Launch", "platform": "google", "budget": 10000, "objective": "conversions"}'`,
    responseExample: `{\n  "id": "camp_999",\n  "name": "Q3 Launch",\n  "status": "draft",\n  "draft_id": "draft_789",\n  "message": "Campaign created as draft pending approval"\n}`,
  },
  {
    id: 'camp-update', method: 'PATCH', path: '/v1/campaigns/{id}',
    description: 'Update campaign fields (creates a draft for approval)', category: 'Campaigns',
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'Campaign ID' },
      { name: 'budget', type: 'number', required: false, description: 'New daily budget' },
      { name: 'status', type: 'string', required: false, description: 'active, paused, ended' },
    ],
    requestExample: `curl -X PATCH https://api.adnexus.io/v1/campaigns/camp_123 \\\n  -H "Authorization: Bearer {token}" \\\n  -d '{"budget": 7500}'`,
    responseExample: `{\n  "draft_id": "draft_456",\n  "message": "Budget change pending approval",\n  "old_budget": 5000,\n  "new_budget": 7500\n}`,
  },
  {
    id: 'adset-list', method: 'GET', path: '/v1/ad-sets',
    description: 'List all ad sets', category: 'Ad Sets',
    parameters: [
      { name: 'campaign_id', type: 'string', required: false, description: 'Filter by parent campaign' },
      { name: 'limit', type: 'integer', required: false, description: 'Max results (default: 50)' },
    ],
    requestExample: `curl -X GET "https://api.adnexus.io/v1/ad-sets?campaign_id=camp_123" \\\n  -H "Authorization: Bearer {token}"`,
    responseExample: `{\n  "data": [\n    { "id": "as_456", "name": "Lookalike 1%", "targeting": { "age": "25-45" }, "budget": 2000 }\n  ]\n}`,
  },
  {
    id: 'ads-list', method: 'GET', path: '/v1/ads',
    description: 'List ads with fatigue scores', category: 'Ads',
    parameters: [
      { name: 'ad_set_id', type: 'string', required: false, description: 'Filter by ad set' },
      { name: 'fatigue_threshold', type: 'number', required: false, description: 'Min fatigue score filter' },
    ],
    requestExample: `curl -X GET "https://api.adnexus.io/v1/ads?fatigue_threshold=3.0" \\\n  -H "Authorization: Bearer {token}"`,
    responseExample: `{\n  "data": [\n    {\n      "id": "ad_456",\n      "name": "Video Hook A",\n      "frequency": 4.2,\n      "fatigue_status": "critical",\n      "ctr": 1.8\n    }\n  ]\n}`,
  },
  {
    id: 'drafts-list', method: 'GET', path: '/v1/drafts',
    description: 'List pending drafts awaiting approval', category: 'Drafts',
    parameters: [
      { name: 'status', type: 'string', required: false, description: 'pending, approved, rejected' },
    ],
    requestExample: `curl -X GET https://api.adnexus.io/v1/drafts?status=pending \\\n  -H "Authorization: Bearer {token}"`,
    responseExample: `{\n  "data": [\n    {\n      "id": "draft_456",\n      "type": "budget_change",\n      "campaign_id": "camp_123",\n      "proposed_changes": { "budget": 7500 },\n      "status": "pending"\n    }\n  ]\n}`,
  },
  {
    id: 'drafts-approve', method: 'POST', path: '/v1/drafts/{id}/approve',
    description: 'Approve a draft to apply changes', category: 'Drafts',
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'Draft ID' },
      { name: 'comment', type: 'string', required: false, description: 'Optional approval comment' },
    ],
    requestExample: `curl -X POST https://api.adnexus.io/v1/drafts/draft_456/approve \\\n  -H "Authorization: Bearer {token}" \\\n  -d '{"comment": "Approved - aligns with Q3 strategy"}'`,
    responseExample: `{\n  "id": "draft_456",\n  "status": "approved",\n  "applied_at": "2026-05-20T14:28:12Z",\n  "campaign_id": "camp_123"\n}`,
  },
  {
    id: 'reports-generate', method: 'POST', path: '/v1/reports',
    description: 'Generate a performance report', category: 'Reports',
    parameters: [
      { name: 'type', type: 'string', required: true, description: 'weekly, monthly, custom' },
      { name: 'date_range', type: 'object', required: true, description: '{ start, end } ISO dates' },
      { name: 'platforms', type: 'string[]', required: false, description: 'Filter platforms' },
    ],
    requestExample: `curl -X POST https://api.adnexus.io/v1/reports \\\n  -H "Authorization: Bearer {token}" \\\n  -d '{"type": "weekly", "date_range": {"start": "2026-05-13", "end": "2026-05-20"}}'`,
    responseExample: `{\n  "report_id": "rep_789",\n  "status": "generating",\n  "estimated_time": 15,\n  "download_url": null\n}`,
  },
  {
    id: 'audiences-list', method: 'GET', path: '/v1/audiences',
    description: 'List audience segments', category: 'Audiences',
    parameters: [
      { name: 'platform', type: 'string', required: false, description: 'Filter by platform' },
    ],
    requestExample: `curl -X GET https://api.adnexus.io/v1/audiences \\\n  -H "Authorization: Bearer {token}"`,
    responseExample: `{\n  "data": [\n    { "id": "aud_123", "name": "Website Visitors 30d", "size": 45000, "platform": "meta" }\n  ]\n}`,
  },
  {
    id: 'agent-brief', method: 'POST', path: '/v1/agent/brief',
    description: 'Generate an AI optimization brief', category: 'Agent',
    parameters: [
      { name: 'campaign_ids', type: 'string[]', required: false, description: 'Target campaigns' },
      { name: 'focus_area', type: 'string', required: false, description: 'budget, creative, targeting, all' },
    ],
    requestExample: `curl -X POST https://api.adnexus.io/v1/agent/brief \\\n  -H "Authorization: Bearer {token}" \\\n  -d '{"campaign_ids": ["camp_123"], "focus_area": "budget"}'`,
    responseExample: `{\n  "brief_id": "brief_002",\n  "recommendations": 5,\n  "insights": [...],\n  "confidence": 0.92\n}`,
  },
  {
    id: 'webhooks-config', method: 'GET', path: '/v1/webhooks/config',
    description: 'Get current webhook configuration', category: 'Webhooks',
    parameters: [],
    requestExample: `curl -X GET https://api.adnexus.io/v1/webhooks/config \\\n  -H "Authorization: Bearer {token}"`,
    responseExample: `{\n  "url": "https://api.yourcompany.com/webhooks/adnexus",\n  "events": ["campaign.created", "draft.approved", "alert.anomaly"],\n  "secret": "whsec_***"\n}`,
  },
];

const mcpTools: McpTool[] = [
  { id: '1', name: 'list_campaigns', description: 'List all campaigns across connected platforms', type: 'read', parameters: [{ name: 'platform', type: 'string', required: false, description: 'Filter by platform' }, { name: 'status', type: 'string', required: false, description: 'Filter by status' }] },
  { id: '2', name: 'get_campaign', description: 'Get detailed info for a specific campaign', type: 'read', parameters: [{ name: 'campaign_id', type: 'string', required: true, description: 'Campaign ID' }] },
  { id: '3', name: 'get_campaign_metrics', description: 'Get performance metrics for a campaign', type: 'read', parameters: [{ name: 'campaign_id', type: 'string', required: true, description: 'Campaign ID' }, { name: 'date_range', type: 'object', required: false, description: 'Date range' }] },
  { id: '4', name: 'list_ad_sets', description: 'List ad sets for a campaign', type: 'read', parameters: [{ name: 'campaign_id', type: 'string', required: true, description: 'Campaign ID' }] },
  { id: '5', name: 'list_ads', description: 'List ads with performance data', type: 'read', parameters: [{ name: 'ad_set_id', type: 'string', required: false, description: 'Ad set ID' }] },
  { id: '6', name: 'get_creative_fatigue', description: 'Check creative fatigue scores', type: 'read', parameters: [{ name: 'ad_id', type: 'string', required: false, description: 'Specific ad ID' }] },
  { id: '7', name: 'list_audiences', description: 'List audience segments', type: 'read', parameters: [{ name: 'platform', type: 'string', required: false, description: 'Platform filter' }] },
  { id: '8', name: 'get_budget_pacing', description: 'Get budget pacing information', type: 'read', parameters: [{ name: 'campaign_id', type: 'string', required: false, description: 'Campaign ID' }] },
  { id: '9', name: 'get_roas_analysis', description: 'Analyze ROAS across campaigns', type: 'read', parameters: [{ name: 'campaign_ids', type: 'string[]', required: false, description: 'Campaign IDs' }] },
  { id: '10', name: 'get_attribution', description: 'Get attribution window data', type: 'read', parameters: [{ name: 'campaign_id', type: 'string', required: true, description: 'Campaign ID' }] },
  { id: '11', name: 'list_drafts', description: 'List pending approval drafts', type: 'read', parameters: [{ name: 'status', type: 'string', required: false, description: 'Filter by status' }] },
  { id: '12', name: 'get_anomaly_alerts', description: 'Get anomaly detection alerts', type: 'read', parameters: [{ name: 'severity', type: 'string', required: false, description: 'low, medium, high' }] },
  { id: '13', name: 'create_campaign', description: 'Create a new campaign draft', type: 'write', parameters: [{ name: 'name', type: 'string', required: true, description: 'Campaign name' }, { name: 'platform', type: 'string', required: true, description: 'Platform' }, { name: 'budget', type: 'number', required: true, description: 'Daily budget' }] },
  { id: '14', name: 'update_campaign_budget', description: 'Update campaign budget (creates draft)', type: 'write', parameters: [{ name: 'campaign_id', type: 'string', required: true, description: 'Campaign ID' }, { name: 'budget', type: 'number', required: true, description: 'New budget' }] },
  { id: '15', name: 'pause_campaign', description: 'Pause an active campaign', type: 'write', parameters: [{ name: 'campaign_id', type: 'string', required: true, description: 'Campaign ID' }] },
  { id: '16', name: 'resume_campaign', description: 'Resume a paused campaign', type: 'write', parameters: [{ name: 'campaign_id', type: 'string', required: true, description: 'Campaign ID' }] },
  { id: '17', name: 'approve_draft', description: 'Approve a pending draft', type: 'write', parameters: [{ name: 'draft_id', type: 'string', required: true, description: 'Draft ID' }] },
  { id: '18', name: 'reject_draft', description: 'Reject a pending draft', type: 'write', parameters: [{ name: 'draft_id', type: 'string', required: true, description: 'Draft ID' }, { name: 'reason', type: 'string', required: false, description: 'Rejection reason' }] },
  { id: '19', name: 'update_ad_set_targeting', description: 'Update ad set targeting', type: 'write', parameters: [{ name: 'ad_set_id', type: 'string', required: true, description: 'Ad set ID' }, { name: 'targeting', type: 'object', required: true, description: 'Targeting params' }] },
  { id: '20', name: 'create_audience', description: 'Create a new audience segment', type: 'write', parameters: [{ name: 'name', type: 'string', required: true, description: 'Audience name' }, { name: 'source', type: 'string', required: true, description: 'Source type' }] },
  { id: '21', name: 'generate_report', description: 'Generate a performance report', type: 'write', parameters: [{ name: 'type', type: 'string', required: true, description: 'Report type' }, { name: 'date_range', type: 'object', required: true, description: 'Date range' }] },
  { id: '22', name: 'generate_optimization_brief', description: 'Generate AI optimization brief', type: 'agent', parameters: [{ name: 'campaign_ids', type: 'string[]', required: false, description: 'Target campaigns' }, { name: 'focus_area', type: 'string', required: false, description: 'Focus area' }] },
  { id: '23', name: 'recommend_budget_shift', description: 'Get budget reallocation recommendations', type: 'agent', parameters: [{ name: 'from_campaign', type: 'string', required: true, description: 'Source campaign' }, { name: 'to_platform', type: 'string', required: false, description: 'Target platform' }] },
  { id: '24', name: 'detect_anomalies', description: 'Run anomaly detection on campaigns', type: 'agent', parameters: [{ name: 'campaign_ids', type: 'string[]', required: false, description: 'Campaign IDs' }, { name: 'metric', type: 'string', required: false, description: 'cpa, ctr, roas, spend' }] },
  { id: '25', name: 'generate_creative_variants', description: 'Generate creative copy variants', type: 'agent', parameters: [{ name: 'ad_id', type: 'string', required: true, description: 'Ad ID' }, { name: 'count', type: 'number', required: false, description: 'Number of variants' }] },
  { id: '26', name: 'analyze_creative_performance', description: 'Analyze creative performance trends', type: 'agent', parameters: [{ name: 'ad_id', type: 'string', required: true, description: 'Ad ID' }] },
  { id: '27', name: 'forecast_spend', description: 'Forecast spend for date range', type: 'agent', parameters: [{ name: 'campaign_ids', type: 'string[]', required: false, description: 'Campaign IDs' }, { name: 'days', type: 'number', required: false, description: 'Forecast horizon' }] },
  { id: '28', name: 'suggest_bid_adjustments', description: 'Get bid adjustment suggestions', type: 'agent', parameters: [{ name: 'ad_set_id', type: 'string', required: true, description: 'Ad set ID' }] },
  { id: '29', name: 'cross_platform_compare', description: 'Compare performance across platforms', type: 'agent', parameters: [{ name: 'metric', type: 'string', required: true, description: 'roas, cpa, ctr' }] },
  { id: '30', name: 'generate_morning_brief', description: 'Generate daily morning brief', type: 'agent', parameters: [{ name: 'date', type: 'string', required: false, description: 'Date (default: today)' }] },
];

const webhookEventTypes = [
  { id: 'campaign.created', category: 'Campaign', description: 'Triggered when a new campaign is created' },
  { id: 'campaign.updated', category: 'Campaign', description: 'Triggered when campaign fields are modified' },
  { id: 'campaign.status_changed', category: 'Campaign', description: 'Triggered when campaign status changes' },
  { id: 'campaign.ended', category: 'Campaign', description: 'Triggered when a campaign reaches its end date' },
  { id: 'draft.created', category: 'Draft', description: 'Triggered when a new draft is submitted for approval' },
  { id: 'draft.approved', category: 'Draft', description: 'Triggered when a draft is approved' },
  { id: 'draft.rejected', category: 'Draft', description: 'Triggered when a draft is rejected' },
  { id: 'alert.budget_cap', category: 'Alert', description: 'Triggered when daily budget cap is reached' },
  { id: 'alert.anomaly', category: 'Alert', description: 'Triggered when an anomaly is detected' },
  { id: 'alert.creative_fatigue', category: 'Alert', description: 'Triggered when creative fatigue exceeds threshold' },
  { id: 'report.generated', category: 'Report', description: 'Triggered when a report finishes generating' },
  { id: 'agent.action_executed', category: 'Agent', description: 'Triggered when AI agent executes an action' },
  { id: 'agent.brief_generated', category: 'Agent', description: 'Triggered when AI brief is generated' },
];

const signatureCode = `import crypto from 'crypto';

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(\`sha256=\${expected}\`)
  );
}

// Express middleware example
app.post('/webhooks/adnexus', (req, res) => {
  const sig = req.headers['x-adnexus-signature'];
  const secret = process.env.ADNEXUS_WEBHOOK_SECRET;
  
  if (!verifyWebhookSignature(req.body, sig, secret)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process the webhook event
  const event = req.body;
  console.log(\`Received \${event.type}\`);
  
  res.status(200).send('OK');
});`;

const jwtCurlExample = `curl -X POST https://api.adnexus.io/v1/auth/token \\\n  -H "Content-Type: application/json" \\\n  -d '{
    "api_key": "adnexus_sk_a1b2c3d4e5f6789"
  }'`;

const jwtJsExample = `// Using the AdNexus SDK
import { AdNexus } from '@adnexus/sdk';
import SEO from '../components/SEO';

const client = new AdNexus({
  apiKey: 'adnexus_sk_a1b2c3d4e5f6789',
});

// Token is handled automatically
const campaigns = await client.campaigns.list();

// Or manually with fetch
const response = await fetch('https://api.adnexus.io/v1/campaigns', {
  headers: {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json',
  },
});`;

const jwtPythonExample = `import requests

# Get token
resp = requests.post('https://api.adnexus.io/v1/auth/token', json={
    'api_key': 'adnexus_sk_a1b2c3d4e5f6789'
})
token = resp.json()['access_token']

# Use token
campaigns = requests.get(
    'https://api.adnexus.io/v1/campaigns',
    headers={'Authorization': f'Bearer {token}'}
).json()`;

/* ------------------------------------------------------------------ */
/*  HELPER COMPONENTS                                                  */
/* ------------------------------------------------------------------ */

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: '#0D1117', border: '1px solid #30363D' }}>
      {label && (
        <div className="flex items-center justify-between px-3 py-1.5" style={{ background: '#161B22', borderBottom: '1px solid #30363D' }}>
          <span className="text-[10px] font-mono-data" style={{ color: '#8B949E' }}>{label}</span>
          <button onClick={copy} className="rounded p-1 hover:bg-white/5 transition-colors">
            {copied ? <Check size={10} style={{ color: '#10B981' }} /> : <Copy size={10} style={{ color: '#8B949E' }} />}
          </button>
        </div>
      )}
      <pre className="overflow-x-auto p-3 text-xs font-mono-data leading-relaxed" style={{ color: '#C9D1D9' }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: '#10B981', POST: '#3B82F6', PUT: '#F59E0B', PATCH: '#8B5CF6', DELETE: '#EF4444',
  };
  return (
    <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold font-mono-data uppercase" style={{ background: `${colors[method] || '#555'}15`, color: colors[method] || '#555' }}>
      {method}
    </span>
  );
}

function McpTypeBadge({ type }: { type: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    read: { bg: 'rgba(16,185,129,0.12)', text: '#10B981', label: 'Read' },
    write: { bg: 'rgba(59,130,246,0.12)', text: '#3B82F6', label: 'Write' },
    agent: { bg: 'rgba(139,92,246,0.12)', text: '#8B5CF6', label: 'Agent' },
  };
  const c = config[type] || config.read;
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: c.bg, color: c.text }}>
      {c.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  DEMO MODE BANNER                                                   */
/* ------------------------------------------------------------------ */

function DemoBanner() {
  if (!DEMO_MODE) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 rounded-lg px-4 py-3 flex items-center gap-3"
      style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
    >
      <AlertTriangle size={18} style={{ color: '#F59E0B', flexShrink: 0 }} />
      <div className="flex-1">
        <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
          Demo Mode Active
        </p>
        <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          All data shown is mock data for demonstration purposes. API calls are simulated.
        </p>
      </div>
      <span className="rounded-full px-2.5 py-1 text-[10px] font-medium" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
        MOCK DATA
      </span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  TAB 1 — API REFERENCE                                              */
/* ------------------------------------------------------------------ */

function ApiReferenceTab() {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [catFilter, setCatFilter] = useState('All');

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const filtered = endpoints.filter(ep => {
    const matchSearch = !search || ep.path.includes(search) || ep.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'All' || ep.category === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-4">
      {DEMO_MODE && (
        <div className="rounded-lg p-3 text-xs" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
          <span className="font-medium" style={{ color: '#3B82F6' }}>Demo: </span>
          <span style={{ color: 'var(--text-secondary)' }}>Showing {endpoints.length} mock API endpoints across {categories.length} categories.</span>
        </div>
      )}
      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search endpoints..."
            className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={12} style={{ color: 'var(--text-tertiary)' }} />
          {['All', ...categories].map(c => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
              style={{
                background: catFilter === c ? 'var(--accent)' : 'var(--bg-secondary)',
                color: catFilter === c ? 'white' : 'var(--text-secondary)',
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{filtered.length} endpoint{filtered.length !== 1 ? 's' : ''}</p>

      {/* Endpoints */}
      <div className="space-y-2">
        {filtered.map(ep => (
          <motion.div
            key={ep.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg overflow-hidden"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
          >
            {/* Header */}
            <button
              onClick={() => toggle(ep.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
            >
              <MethodBadge method={ep.method} />
              <code className="font-mono-data text-sm" style={{ color: 'var(--text-primary)' }}>{ep.path}</code>
              <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>{ep.description}</span>
              <span className="ml-auto">
                {expanded[ep.id] ? <ChevronUp size={14} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />}
              </span>
            </button>

            {/* Expanded */}
            <AnimatePresence>
              {expanded[ep.id] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    {/* Parameters */}
                    {ep.parameters.length > 0 && (
                      <div className="pt-3">
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Parameters</h4>
                        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
                          <table className="w-full text-xs">
                            <thead>
                              <tr style={{ background: 'var(--bg-secondary)' }}>
                                <th scope="col" className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Name</th>
                                <th scope="col" className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Type</th>
                                <th scope="col" className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Required</th>
                                <th scope="col" className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ep.parameters.map(p => (
                                <tr key={p.name} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                  <td className="px-3 py-2 font-mono-data" style={{ color: 'var(--text-primary)' }}>{p.name}</td>
                                  <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{p.type}</td>
                                  <td className="px-3 py-2">
                                    {p.required ? (
                                      <span className="text-[10px] font-medium" style={{ color: '#EF4444' }}>Required</span>
                                    ) : (
                                      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Optional</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{p.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Examples */}
                    <div className="grid gap-3 md:grid-cols-2">
                      <CodeBlock code={ep.requestExample} label="Request" />
                      <CodeBlock code={ep.responseExample} label="Response" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TAB 2 — MCP TOOLS                                                  */
/* ------------------------------------------------------------------ */

function McpToolsTab() {
  const [filter, setFilter] = useState<'all' | 'read' | 'write' | 'agent'>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const filtered = mcpTools.filter(t => {
    const matchType = filter === 'all' || t.type === filter;
    const matchSearch = !search || t.name.includes(search) || t.description.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const toolIcons: Record<string, React.ReactNode> = {
    read: <Eye size={14} />, write: <Edit size={14} />, agent: <Brain size={14} />,
  };

  return (
    <div className="space-y-4">
      {DEMO_MODE && (
        <div className="rounded-lg p-3 text-xs" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
          <span className="font-medium" style={{ color: '#8B5CF6' }}>Demo: </span>
          <span style={{ color: 'var(--text-secondary)' }}>Showing {mcpTools.length} mock MCP tools (Read: {mcpTools.filter(t => t.type === 'read').length}, Write: {mcpTools.filter(t => t.type === 'write').length}, Agent: {mcpTools.filter(t => t.type === 'agent').length}).</span>
        </div>
      )}
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tools..."
            className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(['all', 'read', 'write', 'agent'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="rounded-full px-3 py-1 text-[11px] font-medium transition-colors capitalize"
              style={{
                background: filter === f ? 'var(--accent)' : 'var(--bg-secondary)',
                color: filter === f ? 'white' : 'var(--text-secondary)',
              }}
            >
              {f === 'all' ? 'All Tools' : f}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{filtered.length} of {mcpTools.length} tools</p>

      {/* Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(tool => (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg p-4 transition-all hover:border-blue-500/30"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span style={{ color: tool.type === 'read' ? '#10B981' : tool.type === 'write' ? '#3B82F6' : '#8B5CF6' }}>
                  {toolIcons[tool.type]}
                </span>
                <code className="font-mono-data text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{tool.name}</code>
              </div>
              <McpTypeBadge type={tool.type} />
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>{tool.description}</p>

            {/* Parameters toggle */}
            {tool.parameters.length > 0 && (
              <button
                onClick={() => toggle(tool.id)}
                className="flex items-center gap-1 text-[10px] transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {expanded[tool.id] ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                {tool.parameters.length} parameter{tool.parameters.length !== 1 ? 's' : ''}
              </button>
            )}

            <AnimatePresence>
              {expanded[tool.id] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-1.5">
                    {tool.parameters.map(p => (
                      <div key={p.name} className="flex items-center gap-2 text-[11px]">
                        <code className="font-mono-data px-1 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>{p.name}</code>
                        <span style={{ color: 'var(--text-tertiary)' }}>{p.type}</span>
                        {p.required && <span className="text-[9px]" style={{ color: '#EF4444' }}>required</span>}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TAB 3 — AUTHENTICATION (+ API KEYS)                                */
/* ------------------------------------------------------------------ */

function AuthenticationTab() {
  const [keyVisible, setKeyVisible] = useState<Record<string, boolean>>({});
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(DEMO_MODE ? mockApiKeys : []);
  const [selectedKey, setSelectedKey] = useState<string | null>(DEMO_MODE ? mockApiKeys[0]?.id ?? null : null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (DEMO_MODE) {
      setApiKeys(mockApiKeys);
      setSelectedKey(mockApiKeys[0]?.id ?? null);
    }
  }, []);

  const copyKey = (keyId: string, keyValue: string) => {
    navigator.clipboard.writeText(keyValue).catch(() => {});
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleKeyVisible = (keyId: string) => {
    setKeyVisible(p => ({ ...p, [keyId]: !p[keyId] }));
  };

  const activeKey = apiKeys.find(k => k.id === selectedKey);

  return (
    <div className="space-y-6 max-w-4xl">
      {DEMO_MODE && (
        <div className="rounded-lg p-3 text-xs" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
          <span className="font-medium" style={{ color: '#10B981' }}>Demo: </span>
          <span style={{ color: 'var(--text-secondary)' }}>Showing {mockApiKeys.length} mock API keys across {new Set(mockApiKeys.map(k => k.environment)).size} environments.</span>
        </div>
      )}

      {/* JWT Overview */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} style={{ color: 'var(--accent)' }} />
          <h3 className="font-space text-base font-semibold" style={{ color: 'var(--text-primary)' }}>JWT Authentication</h3>
        </div>
        <div className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <p>All API requests require a valid JWT bearer token. To obtain a token, exchange your API key using the <code className="font-mono-data px-1 rounded" style={{ background: 'var(--bg-secondary)' }}>/v1/auth/token</code> endpoint.</p>
          <p>Tokens expire after 1 hour (3600 seconds). Use the <code className="font-mono-data px-1 rounded" style={{ background: 'var(--bg-secondary)' }}>/v1/auth/refresh</code> endpoint to get a new token before expiry.</p>
          <div className="flex items-center gap-2 rounded-lg p-3" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <AlertTriangle size={14} style={{ color: 'var(--status-warning)', flexShrink: 0 }} />
            <span className="text-xs" style={{ color: 'var(--text-primary)' }}>Never expose your API key in client-side code. Use environment variables or a backend proxy.</span>
          </div>
        </div>
      </motion.div>

      {/* API Keys List (Demo Mode) */}
      {DEMO_MODE && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <Key size={16} style={{ color: 'var(--accent)' }} />
            <h4 className="font-space text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Your API Keys ({apiKeys.length})</h4>
          </div>

          {/* Key Selector */}
          <div className="flex flex-wrap gap-2 mb-4">
            {apiKeys.map(k => (
              <button
                key={k.id}
                onClick={() => setSelectedKey(k.id)}
                className="rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors"
                style={{
                  background: selectedKey === k.id ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: selectedKey === k.id ? 'white' : 'var(--text-secondary)',
                  border: selectedKey === k.id ? 'none' : '1px solid var(--border-subtle)',
                }}
              >
                {k.name}
                <span
                  className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full"
                  style={{
                    background: k.status === 'active' ? '#10B981' : k.status === 'expired' ? '#EF4444' : '#F59E0B',
                  }}
                />
              </button>
            ))}
          </div>

          {/* Selected Key Details */}
          {activeKey && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg p-3 font-mono-data text-sm" style={{ background: 'var(--bg-secondary)' }}>
                <span className="truncate" style={{ color: 'var(--text-secondary)' }}>
                  {keyVisible[activeKey.id] ? activeKey.key : activeKey.prefix + '••••••••••••••••••••••••••'}
                </span>
                <button onClick={() => toggleKeyVisible(activeKey.id)} className="ml-auto rounded p-1 hover:bg-white/5 shrink-0">
                  {keyVisible[activeKey.id] ? <EyeOff size={14} style={{ color: 'var(--text-tertiary)' }} /> : <Eye size={14} style={{ color: 'var(--text-tertiary)' }} />}
                </button>
                <button onClick={() => copyKey(activeKey.id, activeKey.key)} className="rounded p-1 hover:bg-white/5 shrink-0">
                  {copiedKey === activeKey.id ? <Check size={14} style={{ color: '#10B981' }} /> : <Copy size={14} style={{ color: 'var(--text-tertiary)' }} />}
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg p-2.5" style={{ background: 'var(--bg-secondary)' }}>
                  <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--text-tertiary)' }}>Environment</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ background: activeKey.environment === 'production' ? '#EF4444' : activeKey.environment === 'sandbox' ? '#F59E0B' : '#10B981' }} />
                    {activeKey.environment}
                  </span>
                </div>
                <div className="rounded-lg p-2.5" style={{ background: 'var(--bg-secondary)' }}>
                  <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--text-tertiary)' }}>Status</span>
                  <span className="text-xs font-medium" style={{ color: activeKey.status === 'active' ? '#10B981' : activeKey.status === 'expired' ? '#EF4444' : '#F59E0B' }}>
                    {activeKey.status}
                  </span>
                </div>
                <div className="rounded-lg p-2.5" style={{ background: 'var(--bg-secondary)' }}>
                  <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--text-tertiary)' }}>Last Used</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{new Date(activeKey.lastUsed).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Scopes */}
              <div>
                <span className="text-[10px] uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>Scopes</span>
                <div className="flex flex-wrap gap-1.5">
                  {activeKey.scopes.map(scope => (
                    <span key={scope} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--accent)' }}>
                      {scope}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Fallback single key display (non-demo) */}
      {!DEMO_MODE && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card-surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <Key size={16} style={{ color: 'var(--accent)' }} />
            <h4 className="font-space text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Your API Key</h4>
          </div>
          <div className="flex items-center gap-2 rounded-lg p-3 font-mono-data text-sm" style={{ background: 'var(--bg-secondary)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              {keyVisible['default'] ? 'adnexus_sk_a1b2c3d4e5f6789abcdef01' : 'adnexus_sk_••••••••••••••••••••'}
            </span>
            <button onClick={() => toggleKeyVisible('default')} className="ml-auto rounded p-1 hover:bg-white/5">
              {keyVisible['default'] ? <EyeOff size={14} style={{ color: 'var(--text-tertiary)' }} /> : <Eye size={14} style={{ color: 'var(--text-tertiary)' }} />}
            </button>
            <button className="rounded p-1 hover:bg-white/5"><Copy size={14} style={{ color: 'var(--text-tertiary)' }} /></button>
          </div>
        </motion.div>
      )}

      {/* Code Examples */}
      <div className="grid gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <CodeBlock code={jwtCurlExample} label="cURL" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <CodeBlock code={jwtJsExample} label="JavaScript / TypeScript" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <CodeBlock code={jwtPythonExample} label="Python" />
        </motion.div>
      </div>

      {/* Permission Scopes */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={16} style={{ color: 'var(--accent)' }} />
          <h4 className="font-space text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Permission Scopes</h4>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { scope: 'campaigns:read', desc: 'Read campaign data' },
            { scope: 'campaigns:write', desc: 'Create/modify campaigns' },
            { scope: 'drafts:read', desc: 'View draft approvals' },
            { scope: 'drafts:write', desc: 'Submit/review drafts' },
            { scope: 'reports:read', desc: 'Generate and read reports' },
            { scope: 'agent:read', desc: 'AI insights and briefs' },
            { scope: 'webhooks:write', desc: 'Configure webhooks' },
            { scope: 'admin', desc: 'Full account access' },
          ].map(s => (
            <div key={s.scope} className="flex items-center gap-2 rounded-lg p-2.5" style={{ background: 'var(--bg-secondary)' }}>
              <code className="font-mono-data text-[11px]" style={{ color: 'var(--accent)' }}>{s.scope}</code>
              <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{s.desc}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TAB 4 — WEBHOOKS (+ ENDPOINTS)                                     */
/* ------------------------------------------------------------------ */

function WebhooksTab() {
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [webhookEndpoints, setWebhookEndpoints] = useState<WebhookEndpoint[]>(DEMO_MODE ? mockWebhookEndpoints : []);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(DEMO_MODE ? mockWebhookEndpoints[0]?.id ?? null : null);
  const [secretVisible, setSecretVisible] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (DEMO_MODE) {
      setWebhookEndpoints(mockWebhookEndpoints);
      setSelectedEndpoint(mockWebhookEndpoints[0]?.id ?? null);
    }
  }, []);

  const toggleSecret = (epId: string) => {
    setSecretVisible(p => ({ ...p, [epId]: !p[epId] }));
  };

  const activeEndpoint = webhookEndpoints.find(e => e.id === selectedEndpoint);

  const payloadExample = `{
  "id": "evt_a1b2c3d4e5f6",
  "type": "campaign.status_changed",
  "timestamp": "2026-05-20T14:32:05Z",
  "data": {
    "campaign_id": "camp_123",
    "name": "Summer Sale 2026",
    "old_status": "draft",
    "new_status": "active",
    "changed_by": "user@company.com"
  }
}`;

  return (
    <div className="space-y-6 max-w-4xl">
      {DEMO_MODE && (
        <div className="rounded-lg p-3 text-xs" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
          <span className="font-medium" style={{ color: '#F59E0B' }}>Demo: </span>
          <span style={{ color: 'var(--text-secondary)' }}>Showing {mockWebhookEndpoints.length} mock webhook endpoints with {webhookEventTypes.length} event types.</span>
        </div>
      )}

      {/* Webhook Endpoints List (Demo Mode) */}
      {DEMO_MODE && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <Webhook size={16} style={{ color: 'var(--accent)' }} />
            <h3 className="font-space text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Webhook Endpoints ({webhookEndpoints.length})</h3>
          </div>

          <div className="space-y-2 mb-4">
            {webhookEndpoints.map(ep => (
              <button
                key={ep.id}
                onClick={() => setSelectedEndpoint(ep.id)}
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
                style={{
                  background: selectedEndpoint === ep.id ? 'rgba(59,130,246,0.08)' : 'var(--bg-secondary)',
                  border: `1px solid ${selectedEndpoint === ep.id ? 'rgba(59,130,246,0.25)' : 'var(--border-subtle)'}`,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: ep.status === 'active' ? '#10B981' : ep.status === 'failing' ? '#EF4444' : '#F59E0B',
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{ep.url}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{ep.events.length} events &middot; {ep.successRate}% success</p>
                </div>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0"
                  style={{
                    background: ep.status === 'active' ? 'rgba(16,185,129,0.12)' : ep.status === 'failing' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                    color: ep.status === 'active' ? '#10B981' : ep.status === 'failing' ? '#EF4444' : '#F59E0B',
                  }}
                >
                  {ep.status}
                </span>
              </button>
            ))}
          </div>

          {/* Selected Endpoint Details */}
          {activeEndpoint && (
            <div className="rounded-lg p-4 space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Secret</span>
                <span className="font-mono-data text-xs flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                  {secretVisible[activeEndpoint.id] ? activeEndpoint.secret : 'whsec_••••••••••••••••••••••••••••••••'}
                </span>
                <button onClick={() => toggleSecret(activeEndpoint.id)} className="rounded p-1 hover:bg-white/5 shrink-0">
                  {secretVisible[activeEndpoint.id] ? <EyeOff size={12} style={{ color: 'var(--text-tertiary)' }} /> : <Eye size={12} style={{ color: 'var(--text-tertiary)' }} />}
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {activeEndpoint.events.map(evt => (
                  <span key={evt} className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }}>
                    {evt}
                  </span>
                ))}
              </div>
              {activeEndpoint.lastDelivery && (
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                  Last delivery: {new Date(activeEndpoint.lastDelivery).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Event Types */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={18} style={{ color: 'var(--accent)' }} />
          <h3 className="font-space text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Webhook Events</h3>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          Subscribe to events to receive real-time notifications at your endpoint. Each event includes a typed payload and HMAC-SHA256 signature for verification.
        </p>

        <div className="space-y-2">
          {webhookEventTypes.map(evt => (
            <div
              key={evt.id}
              className="rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--border-subtle)' }}
            >
              <button
                onClick={() => setExpandedEvent(expandedEvent === evt.id ? null : evt.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
              >
                <code className="font-mono-data text-xs" style={{ color: 'var(--accent)' }}>{evt.id}</code>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>{evt.category}</span>
                <span className="text-xs ml-1" style={{ color: 'var(--text-secondary)' }}>{evt.description}</span>
                <span className="ml-auto">
                  {expandedEvent === evt.id ? <ChevronUp size={14} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />}
                </span>
              </button>
              <AnimatePresence>
                {expandedEvent === evt.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3">
                      <CodeBlock code={payloadExample} label="Payload Schema" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Signature Verification */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} style={{ color: 'var(--accent)' }} />
          <h3 className="font-space text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Signature Verification</h3>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
          Verify webhook authenticity using the <code className="font-mono-data" style={{ color: 'var(--accent)' }}>X-AdNexus-Signature</code> header. The signature is computed as HMAC-SHA256 of the raw request body using your webhook secret.
        </p>
        <CodeBlock code={signatureCode} label="Node.js / TypeScript" />
      </motion.div>

      {/* Delivery & Retry */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <Send size={16} style={{ color: 'var(--accent)' }} />
          <h4 className="font-space text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Delivery & Retries</h4>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Timeout', value: '10 seconds' },
            { label: 'Retries', value: '3 (exponential backoff)' },
            { label: 'Retry schedule', value: '1s, 5s, 25s' },
          ].map(item => (
            <div key={item.label} className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-secondary)' }}>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>{item.label}</p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TAB 5 — SDKs                                                       */
/* ------------------------------------------------------------------ */

function SdksTab() {
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [sdks, setSdks] = useState<SdkDownload[]>(DEMO_MODE ? mockSdkDownloads : []);

  useEffect(() => {
    if (DEMO_MODE) {
      setSdks(mockSdkDownloads);
    }
  }, []);

  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(p => ({ ...p, [key]: true }));
    setTimeout(() => setCopied(p => ({ ...p, [key]: false })), 2000);
  };

  const displaySdks = DEMO_MODE ? sdks : [
    { id: 'sdk_node', name: 'Node.js', language: 'JavaScript', install: 'npm install @adnexus/sdk', clone: 'git clone https://github.com/adnexus/sdk-node.git', icon: <Terminal size={18} />, color: '#10B981' },
    { id: 'sdk_python', name: 'Python', language: 'Python', install: 'pip install adnexus-sdk', clone: 'git clone https://github.com/adnexus/sdk-python.git', icon: <Code2 size={18} />, color: '#F59E0B' },
    { id: 'sdk_go', name: 'Go', language: 'Go', install: 'go get github.com/adnexus/sdk-go', clone: 'git clone https://github.com/adnexus/sdk-go.git', icon: <Globe size={18} />, color: '#3B82F6' },
    { id: 'sdk_ruby', name: 'Ruby', language: 'Ruby', install: 'gem install adnexus-sdk', clone: 'git clone https://github.com/adnexus/sdk-ruby.git', icon: <Code2 size={18} />, color: '#EF4444' },
    { id: 'sdk_php', name: 'PHP', language: 'PHP', install: 'composer require adnexus/sdk', clone: 'git clone https://github.com/adnexus/sdk-php.git', icon: <Code2 size={18} />, color: '#8B5CF6' },
    { id: 'sdk_rust', name: 'Rust', language: 'Rust', install: 'cargo add adnexus-sdk', clone: 'git clone https://github.com/adnexus/sdk-rust.git', icon: <Terminal size={18} />, color: '#F97316' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {DEMO_MODE && (
        <div className="rounded-lg p-3 text-xs" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
          <span className="font-medium" style={{ color: '#3B82F6' }}>Demo: </span>
          <span style={{ color: 'var(--text-secondary)' }}>Showing {mockSdkDownloads.length} mock SDK packages with download links and version info.</span>
        </div>
      )}

      {/* SDK Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displaySdks.map((sdk, i) => (
          <motion.div
            key={sdk.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card-surface p-5"
          >
            <div className="flex items-center gap-2 mb-3" style={{ color: sdk.color }}>
              {sdk.icon}
              <span className="font-space text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{sdk.name}</span>
              <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: `${sdk.color}15`, color: sdk.color }}>{sdk.language}</span>
            </div>

            {/* Version & Size (demo only) */}
            {DEMO_MODE && 'version' in sdk && (
              <div className="flex items-center gap-3 mb-3 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                <span>Version: <strong style={{ color: 'var(--text-secondary)' }}>{sdk.version}</strong></span>
                <span>Size: <strong style={{ color: 'var(--text-secondary)' }}>{sdk.size}</strong></span>
                <span>Updated: <strong style={{ color: 'var(--text-secondary)' }}>{sdk.updatedAt}</strong></span>
              </div>
            )}

            <div className="space-y-2">
              <div className="rounded-lg p-2.5" style={{ background: 'var(--bg-secondary)' }}>
                <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--text-tertiary)' }}>Install</span>
                <div className="flex items-center justify-between gap-2">
                  <code className="font-mono-data text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>{sdk.install}</code>
                  <button onClick={() => copy(`${sdk.name}-install`, sdk.install)} className="rounded p-1 hover:bg-white/5 shrink-0">
                    {copied[`${sdk.name}-install`] ? <Check size={10} style={{ color: '#10B981' }} /> : <Copy size={10} style={{ color: 'var(--text-tertiary)' }} />}
                  </button>
                </div>
              </div>
              <div className="rounded-lg p-2.5" style={{ background: 'var(--bg-secondary)' }}>
                <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--text-tertiary)' }}>Clone</span>
                <div className="flex items-center justify-between gap-2">
                  <code className="font-mono-data text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>{sdk.clone}</code>
                  <button onClick={() => copy(`${sdk.name}-clone`, sdk.clone)} className="rounded p-1 hover:bg-white/5 shrink-0">
                    {copied[`${sdk.name}-clone`] ? <Check size={10} style={{ color: '#10B981' }} /> : <Copy size={10} style={{ color: 'var(--text-tertiary)' }} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Download & Docs Links (demo only) */}
            {DEMO_MODE && 'downloadUrl' in sdk && (
              <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <a
                  href={sdk.downloadUrl}
                  onClick={e => { e.preventDefault(); }}
                  className="flex items-center gap-1 text-[10px] font-medium rounded px-2 py-1 transition-colors"
                  style={{ background: `${sdk.color}12`, color: sdk.color }}
                >
                  <Download size={10} />
                  Download
                </a>
                <a
                  href={sdk.docsUrl}
                  onClick={e => { e.preventDefault(); }}
                  className="flex items-center gap-1 text-[10px] font-medium rounded px-2 py-1 transition-colors"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                >
                  <ExternalLink size={10} />
                  Docs
                </a>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Quick Start */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card-surface p-5">
        <h3 className="font-space text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Quick Start</h3>
        <CodeBlock
          label="Node.js"
          code={`import { AdNexus } from '@adnexus/sdk';

const client = new AdNexus({
  apiKey: process.env.ADNEXUS_API_KEY,
});

// List campaigns
const campaigns = await client.campaigns.list({
  platform: 'meta',
  status: 'active',
});

// Get metrics
const metrics = await client.campaigns.metrics('camp_123', {
  dateRange: { start: '2026-05-01', end: '2026-05-20' },
});

// Approve a draft
await client.drafts.approve('draft_456');

// Generate a report
const report = await client.reports.generate({
  type: 'weekly',
  dateRange: { start: '2026-05-13', end: '2026-05-20' },
});`}
        />
      </motion.div>

      {/* MCP Client Config */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="card-surface p-5">
        <h3 className="font-space text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>MCP Client Configuration</h3>
        <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>Add to your Claude Desktop or other MCP client config:</p>
        <CodeBlock
          label="claude_desktop_config.json"
          code={`{
  "mcpServers": {
    "adnexus": {
      "command": "npx",
      "args": ["-y", "@adnexus/mcp-server"],
      "env": {
        "ADNEXUS_API_KEY": "adnexus_sk_..."
      }
    }
  }
}`}
        />
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TAB 6 — DOCUMENTATION (Demo Mode Only)                             */
/* ------------------------------------------------------------------ */

function DocumentationTab() {
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  if (!DEMO_MODE) {
    return (
      <div className="max-w-4xl rounded-lg p-8 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <FileText size={32} style={{ color: 'var(--text-tertiary)', margin: '0 auto 12px' }} />
        <h3 className="font-space text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Documentation</h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Documentation sections are available in demo mode with mock content.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="rounded-lg p-3 text-xs" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
        <span className="font-medium" style={{ color: '#8B5CF6' }}>Demo: </span>
        <span style={{ color: 'var(--text-secondary)' }}>Showing {mockDocSections.length} documentation sections with {mockDocSections.reduce((acc, s) => acc + s.articles.length, 0)} mock articles.</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {mockDocSections.map((section, i) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card-surface p-5"
          >
            <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--accent)' }}>
              {section.icon}
              <h3 className="font-space text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{section.title}</h3>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>{section.description}</p>

            <div className="space-y-1">
              {section.articles.map((article, j) => (
                <a
                  key={j}
                  href={article.url}
                  onClick={e => e.preventDefault()}
                  className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors hover:bg-white/[0.02] group"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span className="flex items-center gap-2">
                    <FileText size={11} style={{ color: 'var(--text-tertiary)' }} />
                    {article.title}
                  </span>
                  <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                    <BookOpen size={9} />
                    {article.readTime}
                  </span>
                </a>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* API Status (Mock) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card-surface p-5">
        <h3 className="font-space text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>API Status</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { service: 'API Core', status: 'Operational', uptime: '99.99%', color: '#10B981' },
            { service: 'Auth Service', status: 'Operational', uptime: '99.97%', color: '#10B981' },
            { service: 'Webhook Delivery', status: 'Operational', uptime: '99.95%', color: '#10B981' },
            { service: 'AI Agent', status: 'Operational', uptime: '99.91%', color: '#10B981' },
          ].map(s => (
            <div key={s.service} className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-secondary)' }}>
              <span className="text-[10px] block mb-1" style={{ color: 'var(--text-tertiary)' }}>{s.service}</span>
              <span className="text-xs font-medium block mb-1" style={{ color: s.color }}>{s.status}</span>
              <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{s.uptime} uptime</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  EDIT ICON (used by MCP tab)                                        */
/* ------------------------------------------------------------------ */
function Edit({ size, ...props }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                     */
/* ------------------------------------------------------------------ */

const tabs = [
  { id: 'api-ref', label: 'API Reference', icon: <BookOpen size={16} /> },
  { id: 'mcp-tools', label: 'MCP Tools', icon: <Cpu size={16} /> },
  { id: 'auth', label: 'Authentication', icon: <Key size={16} /> },
  { id: 'webhooks', label: 'Webhooks', icon: <Webhook size={16} /> },
  { id: 'sdks', label: 'SDKs', icon: <Terminal size={16} /> },
  ...(DEMO_MODE ? [{ id: 'docs', label: 'Documentation', icon: <FileText size={16} /> }] : []),
];

export default function DeveloperPortal() {
  const [activeTab, setActiveTab] = useState('api-ref');

  return (
    <>
    <SEO
      title="Developer Portal"
      description="Access the AdNexus AI API documentation, manage API keys, configure webhooks, and build custom integrations."
      keywords="developer portal, API documentation, API keys, webhooks, custom integrations"
    />
    <div className="min-h-[100dvh] px-4 py-6 md:px-8" style={{ background: 'var(--bg-primary)' }}>
      {/* Demo Banner */}
      <DemoBanner />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
        className="mb-6"
      >
        <h1 className="font-space text-3xl font-bold tracking-tight md:text-4xl" style={{ color: 'var(--text-primary)' }}>
          Developer Portal
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          API reference, MCP tools, authentication guides, and SDKs
          {DEMO_MODE && <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>DEMO</span>}
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-1 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors"
            style={{ color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="dev-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ background: 'var(--accent)' }}
                transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'api-ref' && <ApiReferenceTab />}
          {activeTab === 'mcp-tools' && <McpToolsTab />}
          {activeTab === 'auth' && <AuthenticationTab />}
          {activeTab === 'webhooks' && <WebhooksTab />}
          {activeTab === 'sdks' && <SdksTab />}
          {activeTab === 'docs' && <DocumentationTab />}
        </motion.div>
      </AnimatePresence>
    </div>
    </>
  );
}
