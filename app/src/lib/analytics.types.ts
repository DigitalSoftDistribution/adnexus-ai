// ============================================================================
// Analytics Types & Event Constants
// ============================================================================

/** Supported analytics providers */
export type AnalyticsProvider = 'segment' | 'mixpanel' | 'plausible' | 'self-hosted' | 'none';

/** Analytics configuration from environment */
export interface AnalyticsConfig {
  provider: AnalyticsProvider;
  apiKey: string;
  endpoint: string;
  debug: boolean;
  appVersion: string;
  environment: string;
}

/** User traits passed to identify() */
export interface AnalyticsUserTraits {
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  organizationId?: string;
  organizationName?: string;
  plan?: string;
  role?: string;
  createdAt?: string;
  [key: string]: any;
}

/** Generic event properties */
export interface EventProperties {
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// Named events — use these constants instead of raw strings for consistency
// ---------------------------------------------------------------------------

/** Page view events */
export const PAGE_EVENTS = {
  DASHBOARD: 'page_dashboard',
  CAMPAIGNS: 'page_campaigns',
  CAMPAIGN_DETAIL: 'page_campaign_detail',
  DRAFTS: 'page_drafts',
  DRAFT_DETAIL: 'page_draft_detail',
  AI_RULES: 'page_ai_rules',
  REPORTS: 'page_reports',
  SETTINGS: 'page_settings',
  BILLING: 'page_billing',
  TEAM: 'page_team',
} as const;

/** Authentication events */
export const AUTH_EVENTS = {
  SIGN_UP: 'sign_up',
  SIGN_IN: 'sign_in',
  SIGN_OUT: 'sign_out',
  PASSWORD_RESET: 'password_reset',
  MFA_ENABLED: 'mfa_enabled',
} as const;

/** Campaign lifecycle events */
export const CAMPAIGN_EVENTS = {
  CREATE: 'campaign_create',
  UPDATE: 'campaign_update',
  DELETE: 'campaign_delete',
  ARCHIVE: 'campaign_archive',
  DUPLICATE: 'campaign_duplicate',
  PUBLISH: 'campaign_publish',
  SCHEDULE: 'campaign_schedule',
} as const;

/** Draft / approval workflow events */
export const DRAFT_EVENTS = {
  CREATE: 'draft_create',
  SUBMIT: 'draft_submit',
  APPROVE: 'draft_approve',
  REJECT: 'draft_reject',
  EDIT: 'draft_edit',
  DELETE: 'draft_delete',
  COMMENT: 'draft_comment',
} as const;

/** AI automation events */
export const AI_EVENTS = {
  RULE_CREATE: 'ai_rule_create',
  RULE_UPDATE: 'ai_rule_update',
  RULE_DELETE: 'ai_rule_delete',
  RULE_TOGGLE: 'ai_rule_toggle',
  RULE_EXECUTE: 'ai_rule_execute',
  SUGGESTION_ACCEPT: 'ai_suggestion_accept',
  SUGGESTION_REJECT: 'ai_suggestion_reject',
  CHAT_MESSAGE: 'ai_chat_message',
} as const;

/** Reporting & export events */
export const REPORT_EVENTS = {
  GENERATE: 'report_generate',
  SCHEDULE: 'report_schedule',
  EXPORT_PDF: 'export_pdf',
  EXPORT_CSV: 'export_csv',
  EXPORT_EXCEL: 'export_excel',
  SHARE: 'report_share',
} as const;

/** Feature usage events */
export const FEATURE_EVENTS = {
  COMMAND_PALETTE: 'feature_command_palette',
  KEYBOARD_SHORTCUT: 'feature_keyboard_shortcut',
  SEARCH: 'feature_search',
  FILTER: 'feature_filter',
  SORT: 'feature_sort',
  BULK_ACTION: 'feature_bulk_action',
  CUSTOM_VIEW: 'feature_custom_view',
  IMPORT: 'feature_import',
  INTEGRATION_CONNECT: 'integration_connect',
  WEBHOOK_CONFIGURE: 'webhook_configure',
} as const;

/** Billing events */
export const BILLING_EVENTS = {
  SUBSCRIBE: 'billing_subscribe',
  UPGRADE: 'billing_upgrade',
  DOWNGRADE: 'billing_downgrade',
  CANCEL: 'billing_cancel',
  PAYMENT_METHOD_ADD: 'billing_payment_method_add',
  INVOICE_VIEW: 'billing_invoice_view',
} as const;

/** Collaboration events */
export const COLLAB_EVENTS = {
  MEMBER_INVITE: 'member_invite',
  MEMBER_REMOVE: 'member_remove',
  ROLE_CHANGE: 'role_change',
} as const;

/** Union of all known analytics event names */
export type AnalyticsEvent =
  | (typeof PAGE_EVENTS)[keyof typeof PAGE_EVENTS]
  | (typeof AUTH_EVENTS)[keyof typeof AUTH_EVENTS]
  | (typeof CAMPAIGN_EVENTS)[keyof typeof CAMPAIGN_EVENTS]
  | (typeof DRAFT_EVENTS)[keyof typeof DRAFT_EVENTS]
  | (typeof AI_EVENTS)[keyof typeof AI_EVENTS]
  | (typeof REPORT_EVENTS)[keyof typeof REPORT_EVENTS]
  | (typeof FEATURE_EVENTS)[keyof typeof FEATURE_EVENTS]
  | (typeof BILLING_EVENTS)[keyof typeof BILLING_EVENTS]
  | (typeof COLLAB_EVENTS)[keyof typeof COLLAB_EVENTS]
  | 'error'
  | 'pageview'
  | string;

// ---------------------------------------------------------------------------
// Event property shapes (for type safety when tracking)
// ---------------------------------------------------------------------------

export interface CampaignCreateProps {
  campaignId: string;
  name: string;
  type: string;
  channel: string;
  hasAiRules: boolean;
}

export interface DraftDecisionProps {
  draftId: string;
  campaignId: string;
  decision: 'approved' | 'rejected';
  reviewerId: string;
  turnaroundMinutes?: number;
}

export interface AiRuleToggleProps {
  ruleId: string;
  ruleName: string;
  enabled: boolean;
  campaignIds: string[];
}

export interface ReportGenerateProps {
  reportId: string;
  type: string;
  dateRange: string;
  format: 'pdf' | 'csv' | 'excel';
}

export interface FeatureUseProps {
  feature: string;
  shortcut?: string;
  context?: string;
}

export interface ErrorProps {
  message: string;
  name: string;
  stack?: string;
  component?: string;
  route?: string;
}
