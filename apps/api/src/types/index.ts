// ============================================
// AdNexus AI — Shared TypeScript Types
// ============================================

export type Platform = 'meta' | 'google' | 'tiktok' | 'snap';
export type CampaignStatus = 'active' | 'paused' | 'draft' | 'error' | 'ended';
export type DraftStatus = 'pending' | 'approved' | 'rejected' | 'auto_applied' | 'scheduled' | 'error';
export type DraftType = 'budget_change' | 'status_change' | 'bid_adjustment' | 'targeting_edit' | 'creative_upload' | 'campaign_create' | 'campaign_duplicate' | 'campaign_delete' | 'ab_test_create' | 'budget_reallocation' | 'rule_based' | 'audience_edit' | 'schedule_change' | 'name_change';
export type GoalType = 'roas' | 'cpa' | 'ctr' | 'spend' | 'conversions' | 'custom';
export type GoalStatus = 'active' | 'completed' | 'paused' | 'at_risk' | 'off_track';
export type WorkspaceRole = 'owner' | 'admin' | 'analyst' | 'viewer';
export type Plan = 'free' | 'pro' | 'premium' | 'agency';

// ============================================
// User & Auth
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  exp?: number;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  owner_id: string;
  branding: Record<string, unknown>;
  settings: Record<string, unknown>;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  user?: User;
  role: WorkspaceRole;
  created_at: string;
}

export interface JWTPayload {
  sub: string;       // user_id
  email: string;
  workspace_id: string;
  role: WorkspaceRole;
  iat: number;
  exp: number;
  /** If authenticated via API key, the key's database ID */
  apiKeyId?: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
  name: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  token: string;
  refresh_token: string;
  user: User;
  workspace: Workspace;
}

// ============================================
// Ad Accounts
// ============================================

export interface AdAccount {
  id: string;
  workspace_id: string;
  platform: Platform;
  account_id: string;
  name: string;
  status: 'active' | 'disconnected' | 'error' | 'refresh_needed';
  token_expires_at?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ============================================
// Campaigns (Unified)
// ============================================

export interface UnifiedCampaign {
  id: string;
  ad_account_id: string;
  platform: Platform;
  platform_campaign_id: string;
  name: string;
  status: CampaignStatus;
  objective?: string;
  daily_budget?: number;
  lifetime_budget?: number;
  budget_type?: 'daily' | 'lifetime';
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpa: number;
  roas: number;
  frequency: number;
  reach: number;
  cpm: number;
  cpc: number;
  start_date?: string;
  end_date?: string;
  platform_data: Record<string, unknown>;
  created_at: string;
}

export interface UnifiedAdSet {
  id: string;
  campaign_id: string;
  platform_adset_id: string;
  name: string;
  status: CampaignStatus;
  daily_budget?: number;
  bid_strategy?: string;
  bid_amount?: number;
  targeting: Record<string, unknown>;
  created_at: string;
}

export interface UnifiedAd {
  id: string;
  adset_id: string;
  platform_ad_id: string;
  name: string;
  status: CampaignStatus;
  creative_type?: string;
  creative_url?: string;
  creative_text?: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpa: number;
  roas: number;
  frequency: number;
  fatigue_score: number;
  fatigue_status: 'healthy' | 'warning' | 'critical' | 'exhausted';
  created_at: string;
}

// ============================================
// Drafts (THE CORE)
// ============================================

export interface Draft {
  id: string;
  workspace_id: string;
  platform: Platform | 'all';
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  ad_id?: string;
  draft_type: DraftType;
  change_summary: string;
  change_detail: {
    field?: string;
    old_value?: unknown;
    new_value?: unknown;
    [key: string]: unknown;
  };
  ai_reasoning?: string;
  impact_estimate?: string;
  status: DraftStatus;
  scheduled_at?: string;
  executed_at?: string;
  error_message?: string;
  actor_type: 'ai' | 'user' | 'system';
  actor_id?: string;
  actor_name?: string;
  rule_id?: string;
  approver_id?: string;
  approval_note?: string;
  created_at: string;
  resolved_at?: string;
}

export interface DraftStats {
  pending: number;
  approved_today: number;
  rejected_today: number;
  auto_applied_today: number;
}

// ============================================
// Automation Rules
// ============================================

export interface AutomationRule {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  platforms: Platform[];
  status: 'active' | 'paused';
  applied_count: number;
  last_applied_at?: string;
  created_at: string;
}

export interface RuleCondition {
  metric: string;       // 'cpa', 'roas', 'ctr', 'frequency', 'spend_pct', 'days_since_refresh'
  operator: string;     // 'gt', 'lt', 'eq', 'gte', 'lte', 'pct_change_gt'
  value: number;
  timeWindow?: string;  // '7d', '14d', '30d'
}

export interface RuleAction {
  type: string;         // 'pause', 'increase_budget', 'decrease_budget', 'adjust_bid', 'create_draft', 'notify'
  params: Record<string, unknown>;
}

// ============================================
// Audit Log
// ============================================

export interface AuditLogEntry {
  id: string;
  workspace_id: string;
  actor_type: string;
  actor_id?: string;
  actor_name?: string;
  action: string;
  action_category: string;
  platform?: Platform;
  campaign_id?: string;
  details: Record<string, unknown>;
  source: string;
  ip_address?: string;
  created_at: string;
}

// ============================================
// API Keys & Webhooks
// ============================================

export interface ApiKey {
  id: string;
  workspace_id: string;
  name: string;
  key_preview?: string;
  permissions: { read: boolean; write: string };
  status: 'active' | 'revoked';
  expires_at?: string;
  last_used_at?: string;
  created_at: string;
}

export interface WebhookConfig {
  id: string;
  workspace_id: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  status: 'active' | 'paused';
  created_at: string;
}

// ============================================
// Billing & Credits
// ============================================

export interface CreditBalance {
  month: string;
  credits_used: number;
  credits_limit: number;
  top_up_credits: number;
  remaining: number;
}

export interface CreditUsageEntry {
  id: string;
  feature: string;
  action: string;
  platform?: Platform;
  credits_used: number;
  cost_estimate: number;
  created_at: string;
}

// ============================================
// Goals
// ============================================

export interface PerformanceGoal {
  id: string;
  workspace_id: string;
  name: string;
  goal_type: GoalType;
  platform?: Platform;
  target_value: number;
  current_value: number;
  baseline_value?: number;
  unit?: string;
  start_date: string;
  end_date: string;
  status: GoalStatus;
  campaign_ids: string[];
  progress_pct: number;
  created_at: string;
}

// ============================================
// Morning Brief
// ============================================

export interface MorningBrief {
  date: string;
  workspace_id: string;
  executive_summary: string;
  performance: PlatformPerformance[];
  actions_drafted: BriefAction[];
  alerts: BriefAlert[];
  creative_insights: CreativeInsight[];
  recommendations: Recommendation[];
  forecast: DayForecast;
}

export interface PlatformPerformance {
  platform: Platform;
  revenue: number;
  spend: number;
  roas: number;
  change_pct: number;
}

export interface BriefAction {
  draft_id: string;
  type: DraftType;
  campaign_name: string;
  summary: string;
  reasoning: string;
}

export interface BriefAlert {
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  campaign_name?: string;
  recommended_action?: string;
}

export interface CreativeInsight {
  ad_name: string;
  platform: Platform;
  insight: string;
  metric_value: string;
}

export interface Recommendation {
  title: string;
  description: string;
  estimated_impact: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface DayForecast {
  projected_spend: number;
  projected_revenue: number;
  projected_roas: number;
  confidence: number;
}

// ============================================
// API Response Wrappers
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ============================================
// Credit Cost Map
// ============================================

export const CREDIT_COSTS: Record<string, number> = {
  morning_brief: 8,
  ai_chat_query: 3,
  creative_generation: 15,
  campaign_analysis: 10,
  anomaly_detection: 12,
  report_generation: 10,
  budget_optimization: 8,
  audience_insight: 5,
  ab_test_analysis: 10,
  mcp_tool_call: 2,
  audit_run: 15,
};
