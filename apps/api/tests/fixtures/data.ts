// ============================================
// AdNexus AI — Test Fixtures
// ============================================
// Consistent UUIDs for cross-test references
// All data uses deterministic values for reproducible tests

// ─── UUIDs ───────────────────────────────────────────────────────

export const UUIDS = {
  // Users
  owner: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  admin: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
  analyst: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
  viewer: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
  unauthenticated: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5',

  // Workspaces
  workspace1: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  workspace2: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',

  // Ad Accounts
  metaAccount: 'cccccccc-cccc-cccc-cccc-ccccccccccc1',
  googleAccount: 'cccccccc-cccc-cccc-cccc-ccccccccccc2',
  tiktokAccount: 'cccccccc-cccc-cccc-cccc-ccccccccccc3',

  // Campaigns (internal IDs)
  campaign1: 'dddddddd-dddd-dddd-dddd-ddddddddddd1',
  campaign2: 'dddddddd-dddd-dddd-dddd-ddddddddddd2',
  campaign3: 'dddddddd-dddd-dddd-dddd-ddddddddddd3',

  // Platform Campaign IDs
  platformCampaign1: '12020000000000001',
  platformCampaign2: '12020000000000002',
  platformCampaign3: '12020000000000003',

  // AdSets
  adset1: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
  adset2: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2',

  // Ads
  ad1: 'ffffffff-ffff-ffff-ffff-fffffffffff1',
  ad2: 'ffffffff-ffff-ffff-ffff-fffffffffff2',

  // Drafts
  draft1: '11111111-1111-1111-1111-111111111111',
  draft2: '22222222-2222-2222-2222-222222222222',
  draft3: '33333333-3333-3333-3333-333333333333',
  draft4: '44444444-4444-4444-4444-444444444444',

  // Rules
  rule1: '55555555-5555-5555-5555-555555555555',
  rule2: '66666666-6666-6666-6666-666666666666',
  rule3: '77777777-7777-7777-7777-777777777777',

  // Webhooks
  webhook1: '88888888-8888-8888-8888-888888888888',
} as const;

// ─── Users ───────────────────────────────────────────────────────

export const mockUsers = {
  owner: {
    id: UUIDS.owner,
    email: 'owner@example.com',
    name: 'Workspace Owner',
    avatar_url: 'https://example.com/owner-avatar.png',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  admin: {
    id: UUIDS.admin,
    email: 'admin@example.com',
    name: 'Workspace Admin',
    avatar_url: 'https://example.com/admin-avatar.png',
    created_at: '2024-01-02T00:00:00.000Z',
    updated_at: '2024-01-02T00:00:00.000Z',
  },
  analyst: {
    id: UUIDS.analyst,
    email: 'analyst@example.com',
    name: 'Workspace Analyst',
    avatar_url: null,
    created_at: '2024-01-03T00:00:00.000Z',
    updated_at: '2024-01-03T00:00:00.000Z',
  },
  viewer: {
    id: UUIDS.viewer,
    email: 'viewer@example.com',
    name: 'Workspace Viewer',
    avatar_url: null,
    created_at: '2024-01-04T00:00:00.000Z',
    updated_at: '2024-01-04T00:00:00.000Z',
  },
  unauthenticated: {
    id: UUIDS.unauthenticated,
    email: 'unauth@example.com',
    name: 'Unauthenticated User',
    created_at: '2024-01-05T00:00:00.000Z',
    updated_at: '2024-01-05T00:00:00.000Z',
  },
} as const;

// ─── Passwords ───────────────────────────────────────────────────

export const mockPasswords = {
  ownerHash: '$2a$12$testhashedpasswordforownertesting',
  adminHash: '$2a$12$testhashedpasswordforadmintesting',
  analystHash: '$2a$12$testhashedpasswordforanalysttesting',
  viewerHash: '$2a$12$testhashedpasswordforviewertesting',
} as const;

// ─── Workspaces ──────────────────────────────────────────────────

export const mockWorkspaces = {
  free: {
    id: UUIDS.workspace1,
    name: "Test User's Workspace",
    slug: 'test-user-workspace-abc123',
    plan: 'free' as const,
    owner_id: UUIDS.owner,
    branding: {},
    settings: {},
    created_at: '2024-01-01T00:00:00.000Z',
  },
  pro: {
    id: UUIDS.workspace2,
    name: 'Pro Workspace',
    slug: 'pro-workspace-def456',
    plan: 'pro' as const,
    owner_id: UUIDS.owner,
    branding: { logo_url: 'https://example.com/logo.png' },
    settings: { timezone: 'UTC', currency: 'USD' },
    created_at: '2024-01-01T00:00:00.000Z',
  },
} as const;

// ─── Workspace Members ───────────────────────────────────────────

export const mockWorkspaceMembers = [
  { id: 'wm-1', workspace_id: UUIDS.workspace1, user_id: UUIDS.owner, role: 'owner' as const, created_at: '2024-01-01T00:00:00.000Z' },
  { id: 'wm-2', workspace_id: UUIDS.workspace1, user_id: UUIDS.admin, role: 'admin' as const, created_at: '2024-01-02T00:00:00.000Z' },
  { id: 'wm-3', workspace_id: UUIDS.workspace1, user_id: UUIDS.analyst, role: 'analyst' as const, created_at: '2024-01-03T00:00:00.000Z' },
  { id: 'wm-4', workspace_id: UUIDS.workspace1, user_id: UUIDS.viewer, role: 'viewer' as const, created_at: '2024-01-04T00:00:00.000Z' },
] as const;

// ─── Ad Accounts ─────────────────────────────────────────────────

export const mockAdAccounts = {
  meta: {
    id: UUIDS.metaAccount,
    workspace_id: UUIDS.workspace1,
    platform: 'meta' as const,
    account_id: 'act_1234567890',
    name: 'Meta Ad Account',
    status: 'active' as const,
    oauth_token: 'mock-meta-access-token',
    token_expires_at: '2024-12-31T23:59:59.000Z',
    metadata: { account_status: 1, currency: 'USD', timezone: 'America/New_York' },
    created_at: '2024-01-01T00:00:00.000Z',
  },
  google: {
    id: UUIDS.googleAccount,
    workspace_id: UUIDS.workspace1,
    platform: 'google' as const,
    account_id: '123-456-7890',
    name: 'Google Ads Account',
    status: 'active' as const,
    oauth_token: 'mock-google-access-token',
    token_expires_at: '2024-12-31T23:59:59.000Z',
    metadata: { currency: 'USD', timezone: 'America/Los_Angeles' },
    created_at: '2024-01-01T00:00:00.000Z',
  },
  tiktok: {
    id: UUIDS.tiktokAccount,
    workspace_id: UUIDS.workspace1,
    platform: 'tiktok' as const,
    account_id: 'tiktok_123456',
    name: 'TikTok Ad Account',
    status: 'disconnected' as const,
    oauth_token: null,
    token_expires_at: null,
    metadata: { currency: 'USD' },
    created_at: '2024-01-01T00:00:00.000Z',
  },
} as const;

// ─── Campaigns ───────────────────────────────────────────────────

export const mockCampaigns = {
  highSpend: {
    id: UUIDS.campaign1,
    ad_account_id: UUIDS.metaAccount,
    platform_campaign_id: UUIDS.platformCampaign1,
    name: 'High Spend Campaign',
    status: 'active' as const,
    objective: 'CONVERSIONS',
    daily_budget: 500,
    lifetime_budget: 0,
    budget_type: 'daily' as const,
    spend: 450,
    impressions: 500000,
    clicks: 2500,
    ctr: 0.5,
    conversions: 120,
    cpa: 3.75,
    roas: 4.2,
    frequency: 2.1,
    reach: 238095,
    cpm: 0.9,
    cpc: 0.18,
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    platform_data: {},
    created_at: '2024-01-01T00:00:00.000Z',
  },
  lowROAS: {
    id: UUIDS.campaign2,
    ad_account_id: UUIDS.metaAccount,
    platform_campaign_id: UUIDS.platformCampaign2,
    name: 'Low ROAS Campaign',
    status: 'active' as const,
    objective: 'CONVERSIONS',
    daily_budget: 200,
    lifetime_budget: 0,
    budget_type: 'daily' as const,
    spend: 180,
    impressions: 100000,
    clicks: 800,
    ctr: 0.8,
    conversions: 15,
    cpa: 12.0,
    roas: 0.8,
    frequency: 1.5,
    reach: 66666,
    cpm: 1.8,
    cpc: 0.225,
    start_date: '2024-02-01',
    end_date: '2024-12-31',
    platform_data: {},
    created_at: '2024-02-01T00:00:00.000Z',
  },
  paused: {
    id: UUIDS.campaign3,
    ad_account_id: UUIDS.googleAccount,
    platform_campaign_id: UUIDS.platformCampaign3,
    name: 'Paused Google Campaign',
    status: 'paused' as const,
    objective: 'LEAD_GENERATION',
    daily_budget: 100,
    lifetime_budget: 0,
    budget_type: 'daily' as const,
    spend: 50,
    impressions: 25000,
    clicks: 400,
    ctr: 1.6,
    conversions: 25,
    cpa: 2.0,
    roas: 3.5,
    frequency: 1.0,
    reach: 25000,
    cpm: 2.0,
    cpc: 0.125,
    start_date: '2024-03-01',
    end_date: '2024-12-31',
    platform_data: {},
    created_at: '2024-03-01T00:00:00.000Z',
  },
} as const;

// ─── AdSets ──────────────────────────────────────────────────────

export const mockAdSets = [
  {
    id: UUIDS.adset1,
    campaign_id: UUIDS.campaign1,
    platform_adset_id: '12020000000000011',
    name: 'AdSet 1 - Lookalike 1%',
    status: 'active' as const,
    daily_budget: 250,
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    bid_amount: undefined,
    targeting: { age_min: 25, age_max: 65, genders: [1, 2], geo_locations: { countries: ['US'] } },
    created_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: UUIDS.adset2,
    campaign_id: UUIDS.campaign1,
    platform_adset_id: '12020000000000012',
    name: 'AdSet 2 - Interest Targeting',
    status: 'active' as const,
    daily_budget: 250,
    bid_strategy: 'COST_CAP',
    bid_amount: 25,
    targeting: { age_min: 18, age_max: 45, interests: [{ id: '6003139266461', name: 'Digital marketing' }] },
    created_at: '2024-01-01T00:00:00.000Z',
  },
] as const;

// ─── Ads ─────────────────────────────────────────────────────────

export const mockAds = [
  {
    id: UUIDS.ad1,
    adset_id: UUIDS.adset1,
    platform_ad_id: '12020000000000101',
    name: 'Creative A - Video',
    status: 'active' as const,
    creative_type: 'video',
    creative_url: 'https://example.com/video1.mp4',
    creative_text: 'Check out our amazing product!',
    spend: 200,
    impressions: 250000,
    clicks: 1250,
    ctr: 0.5,
    conversions: 60,
    cpa: 3.33,
    roas: 5.0,
    frequency: 2.1,
    fatigue_score: 35,
    fatigue_status: 'healthy' as const,
    created_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: UUIDS.ad2,
    adset_id: UUIDS.adset1,
    platform_ad_id: '12020000000000102',
    name: 'Creative B - Carousel',
    status: 'active' as const,
    creative_type: 'carousel',
    creative_url: 'https://example.com/carousel1.jpg',
    creative_text: 'Swipe to see more',
    spend: 200,
    impressions: 250000,
    clicks: 1250,
    ctr: 0.5,
    conversions: 60,
    cpa: 3.33,
    roas: 4.5,
    frequency: 2.0,
    fatigue_score: 42,
    fatigue_status: 'warning' as const,
    created_at: '2024-01-01T00:00:00.000Z',
  },
] as const;

// ─── Drafts ──────────────────────────────────────────────────────

export const mockDrafts = {
  pendingBudget: {
    id: UUIDS.draft1,
    workspace_id: UUIDS.workspace1,
    platform: 'meta' as const,
    campaign_id: UUIDS.campaign1,
    draft_type: 'budget_change' as const,
    change_summary: 'Reduce "High Spend Campaign" budget by 20% ($500 → $400)',
    change_detail: {
      platform_campaign_id: UUIDS.platformCampaign1,
      field: 'daily_budget',
      old_value: 500,
      new_value: 400,
    },
    ai_reasoning: 'Rule "Budget Control" triggered because: spend_pct gte 90. decrease_budget action was executed.',
    impact_estimate: 'Save ~$100/day while maintaining performance',
    status: 'pending' as const,
    actor_type: 'ai' as const,
    actor_id: UUIDS.owner,
    actor_name: 'AI Agent',
    rule_id: UUIDS.rule1,
    created_at: '2024-06-01T10:00:00.000Z',
  },
  pendingStatus: {
    id: UUIDS.draft2,
    workspace_id: UUIDS.workspace1,
    platform: 'meta' as const,
    campaign_id: UUIDS.campaign2,
    draft_type: 'status_change' as const,
    change_summary: 'Pause "Low ROAS Campaign" — ROAS Monitor',
    change_detail: {
      platform_campaign_id: UUIDS.platformCampaign2,
      field: 'status',
      old_status: 'active',
      new_status: 'PAUSED',
    },
    ai_reasoning: 'Rule "ROAS Monitor" triggered because: roas lt 1. pause_campaign action was executed.',
    impact_estimate: 'Prevent further spend on underperforming campaign',
    status: 'pending' as const,
    actor_type: 'ai' as const,
    actor_id: UUIDS.owner,
    actor_name: 'AI Agent',
    rule_id: UUIDS.rule2,
    created_at: '2024-06-01T11:00:00.000Z',
  },
  approvedBudget: {
    id: UUIDS.draft3,
    workspace_id: UUIDS.workspace1,
    platform: 'meta' as const,
    campaign_id: UUIDS.campaign1,
    draft_type: 'budget_change' as const,
    change_summary: 'Approved budget increase',
    change_detail: {
      platform_campaign_id: UUIDS.platformCampaign1,
      field: 'daily_budget',
      old_value: 300,
      new_value: 500,
    },
    ai_reasoning: 'User-initiated budget change',
    status: 'approved' as const,
    actor_type: 'user' as const,
    actor_id: UUIDS.owner,
    actor_name: 'Workspace Owner',
    approver_id: UUIDS.owner,
    executed_at: '2024-06-01T12:00:00.000Z',
    resolved_at: '2024-06-01T12:00:00.000Z',
    created_at: '2024-06-01T09:00:00.000Z',
  },
  rejectedPause: {
    id: UUIDS.draft4,
    workspace_id: UUIDS.workspace1,
    platform: 'meta' as const,
    campaign_id: UUIDS.campaign2,
    draft_type: 'status_change' as const,
    change_summary: 'Pause campaign rejected',
    change_detail: {
      platform_campaign_id: UUIDS.platformCampaign2,
      field: 'status',
      old_status: 'active',
      new_status: 'PAUSED',
    },
    status: 'rejected' as const,
    actor_type: 'ai' as const,
    actor_id: UUIDS.owner,
    actor_name: 'AI Agent',
    approver_id: UUIDS.admin,
    approval_note: 'Campaign is seasonal, expected to improve next week',
    resolved_at: '2024-06-01T13:00:00.000Z',
    created_at: '2024-06-01T08:00:00.000Z',
  },
} as const;

// ─── Automation Rules ────────────────────────────────────────────

export const mockRules = {
  budgetControl: {
    id: UUIDS.rule1,
    workspace_id: UUIDS.workspace1,
    name: 'Budget Control',
    description: 'Reduce budget when spend exceeds 90% of daily budget',
    conditions: [
      { metric: 'spend_pct', operator: 'gte', value: 90 },
    ],
    actions: [
      { type: 'decrease_budget', params: { percentage: 20 } },
    ],
    platforms: ['meta' as const],
    status: 'active' as const,
    applied_count: 5,
    last_applied_at: '2024-06-01T10:00:00.000Z',
    created_at: '2024-01-01T00:00:00.000Z',
  },
  roasMonitor: {
    id: UUIDS.rule2,
    workspace_id: UUIDS.workspace1,
    name: 'ROAS Monitor',
    description: 'Pause campaigns with ROAS below 1.0',
    conditions: [
      { metric: 'roas', operator: 'lt', value: 1.0 },
    ],
    actions: [
      { type: 'pause_campaign', params: {} },
    ],
    platforms: ['meta' as const, 'google' as const],
    status: 'active' as const,
    applied_count: 3,
    last_applied_at: '2024-06-01T11:00:00.000Z',
    created_at: '2024-01-02T00:00:00.000Z',
  },
  highCPA: {
    id: UUIDS.rule3,
    workspace_id: UUIDS.workspace1,
    name: 'High CPA Alert',
    description: 'Alert when CPA exceeds $15 and ROAS is below 2',
    conditions: [
      { metric: 'cpa', operator: 'gt', value: 15 },
      { metric: 'roas', operator: 'lt', value: 2 },
    ],
    actions: [
      { type: 'create_draft', params: { notify: true } },
    ],
    platforms: ['meta' as const],
    status: 'active' as const,
    applied_count: 0,
    created_at: '2024-01-03T00:00:00.000Z',
  },
  pausedRule: {
    id: '99999999-9999-9999-9999-999999999999',
    workspace_id: UUIDS.workspace1,
    name: 'Paused Rule',
    description: 'This rule is paused and should not trigger',
    conditions: [
      { metric: 'spend', operator: 'gt', value: 1000 },
    ],
    actions: [
      { type: 'notify', params: { channel: 'email' } },
    ],
    platforms: ['meta' as const],
    status: 'paused' as const,
    applied_count: 0,
    created_at: '2024-01-04T00:00:00.000Z',
  },
} as const;

// ─── Meta API Responses ──────────────────────────────────────────

export const mockMetaCampaignResponse = {
  id: UUIDS.platformCampaign1,
  name: 'High Spend Campaign',
  status: 'ACTIVE',
  objective: 'CONVERSIONS',
  daily_budget: '50000',
  lifetime_budget: undefined,
  start_time: '2024-01-01T00:00:00+0000',
  stop_time: '2024-12-31T23:59:59+0000',
  account_id: 'act_1234567890',
};

export const mockMetaInsightsResponse = {
  data: [{
    spend: '450.00',
    impressions: '500000',
    clicks: '2500',
    ctr: '0.5',
    conversions: '120',
    cost_per_conversion: '3.75',
    action_values: [{ action_type: 'purchase', value: '1890.00' }],
    purchase_roas: [{ action_type: 'purchase', value: '4.2' }],
    frequency: '2.1',
    reach: '238095',
    cpm: '0.9',
    cpc: '0.18',
    video_p25_watched_actions: [{ value: '5000' }],
    video_p50_watched_actions: [{ value: '3000' }],
    video_p75_watched_actions: [{ value: '1500' }],
    video_p100_watched_actions: [{ value: '800' }],
  }],
};

export const mockMetaTokenResponse = {
  access_token: 'mock-refreshed-access-token',
  expires_in: 5184000,
  token_type: 'bearer',
};

export const mockMetaOAuthUrl = 'https://graph.facebook.com/v19.0/dialog/oauth?client_id=test-meta-app-id&redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fauth%2Fmeta%2Fcallback&scope=ads_read%2Cads_management%2Cbusiness_management&state=test-state&response_type=code';

// ─── Credit Balances ─────────────────────────────────────────────

export const mockCreditBalance = {
  workspace_id: UUIDS.workspace1,
  month: '2024-06',
  credits_used: 45,
  credits_limit: 100,
  top_up_credits: 0,
  created_at: '2024-06-01T00:00:00.000Z',
};

export const mockCreditUsageLog = [
  { id: 'cul-1', workspace_id: UUIDS.workspace1, feature: 'morning_brief', action: 'generate', credits_used: 8, month: '2024-06', created_at: '2024-06-01T08:00:00.000Z' },
  { id: 'cul-2', workspace_id: UUIDS.workspace1, feature: 'ai_chat_query', action: 'query', credits_used: 3, month: '2024-06', created_at: '2024-06-01T09:00:00.000Z' },
  { id: 'cul-3', workspace_id: UUIDS.workspace1, feature: 'campaign_analysis', action: 'analyze', credits_used: 10, month: '2024-06', created_at: '2024-06-01T10:00:00.000Z' },
  { id: 'cul-4', workspace_id: UUIDS.workspace1, feature: 'anomaly_detection', action: 'detect', credits_used: 12, month: '2024-06', created_at: '2024-06-01T11:00:00.000Z' },
  { id: 'cul-5', workspace_id: UUIDS.workspace1, feature: 'mcp_tool_call', action: 'call', credits_used: 2, platform: 'meta', month: '2024-06', created_at: '2024-06-01T12:00:00.000Z' },
  { id: 'cul-6', workspace_id: UUIDS.workspace1, feature: 'audience_insight', action: 'insight', credits_used: 5, month: '2024-06', created_at: '2024-06-01T13:00:00.000Z' },
  { id: 'cul-7', workspace_id: UUIDS.workspace1, feature: 'budget_optimization', action: 'optimize', credits_used: 5, month: '2024-06', created_at: '2024-06-01T14:00:00.000Z' },
] as const;

// ─── Webhook Configs ─────────────────────────────────────────────

export const mockWebhookConfig = {
  id: UUIDS.webhook1,
  workspace_id: UUIDS.workspace1,
  name: 'Zapier Integration',
  url: 'https://hooks.zapier.com/hooks/catch/test/123',
  events: ['draft.approved', 'draft.rejected', 'rule.triggered'],
  secret: 'whsec_test_secret',
  status: 'active' as const,
  created_at: '2024-01-01T00:00:00.000Z',
};

// ─── Audit Log Entries ───────────────────────────────────────────

export const mockAuditLogEntries = [
  {
    id: 'al-1',
    workspace_id: UUIDS.workspace1,
    actor_type: 'user',
    actor_id: UUIDS.owner,
    actor_name: 'Workspace Owner',
    action: 'Draft approved: Reduce budget',
    action_category: 'draft_approved',
    campaign_id: UUIDS.campaign1,
    details: { draft_id: UUIDS.draft3 },
    source: 'dashboard',
    ip_address: '192.168.1.1',
    created_at: '2024-06-01T12:00:00.000Z',
  },
  {
    id: 'al-2',
    workspace_id: UUIDS.workspace1,
    actor_type: 'ai',
    actor_id: UUIDS.owner,
    actor_name: 'AI Agent',
    action: 'Draft created: Pause campaign',
    action_category: 'draft_created',
    campaign_id: UUIDS.campaign2,
    details: { draft_type: 'status_change', rule_id: UUIDS.rule2 },
    source: 'ai_agent',
    created_at: '2024-06-01T11:00:00.000Z',
  },
] as const;

// ─── Password Reset ──────────────────────────────────────────────

export const mockPasswordReset = {
  id: 'pr-1',
  user_id: UUIDS.owner,
  token_hash: '$2a$10$testhashedresettoken',
  expires_at: new Date(Date.now() + 3600000).toISOString(),
  created_at: new Date().toISOString(),
};
