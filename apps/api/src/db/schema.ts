/**
 * Drizzle schema compatibility — re-exports table names as typed objects.
 *
 * Each export is a Drizzle-compatible table object with column accessors.
 * Under the hood they map to Supabase/Postgres table names.
 */

import { pgTable, text, varchar, timestamp, jsonb, integer, boolean, bigint, numeric } from 'drizzle-orm/pg-core';

export const workspaces = pgTable('workspaces', {
  id: varchar('id').primaryKey(),
  name: text('name'),
  slug: text('slug'),
  plan: text('plan'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  subscriptionStatus: text('subscription_status'),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end'),
  owner_id: varchar('owner_id'),
  branding: jsonb('branding'),
  settings: jsonb('settings'),
  created_at: timestamp('created_at'),
  updated_at: timestamp('updated_at'),
});

export const workspaceCredits = pgTable('ai_credits', {
  id: varchar('id'),
  workspaceId: varchar('workspace_id'),
  creativesUsed: integer('creatives_used'),
  creativesTotal: integer('creatives_total'),
  impressionsUsed: integer('impressions_used'),
  impressionsTotal: integer('impressions_total'),
  aiCreditsUsed: integer('ai_credits_used'),
  aiCreditsTotal: integer('ai_credits_total'),
  created_at: timestamp('created_at'),
  updated_at: timestamp('updated_at'),
});

export const auditLogs = pgTable('audit_log', {
  id: varchar('id'),
  workspaceId: varchar('workspace_id'),
  userId: varchar('user_id'),
  actor_type: text('actor_type'),
  actor_id: varchar('actor_id'),
  actor_name: text('actor_name'),
  action: text('action'),
  action_category: text('action_category'),
  platform: text('platform'),
  campaign_id: varchar('campaign_id'),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  metadata: jsonb('metadata'),
  details: jsonb('details'),
  source: text('source'),
  ip_address: text('ip_address'),
  created_at: timestamp('created_at'),
});

export const users = pgTable('users', {
  id: varchar('id').primaryKey(),
  email: text('email'),
  name: text('name'),
  avatar_url: text('avatar_url'),
  created_at: timestamp('created_at'),
  updated_at: timestamp('updated_at'),
});

export const campaigns = pgTable('campaigns', {
  id: varchar('id').primaryKey(),
  workspaceId: varchar('workspace_id'),
  ad_account_id: varchar('ad_account_id'),
  platform: text('platform'),
  platformCampaignId: text('platform_campaign_id'),
  name: text('name'),
  status: text('status'),
  objective: text('objective'),
  budget: text('budget'),
  budgetType: text('budget_type'),
  daily_budget: numeric('daily_budget'),
  lifetime_budget: numeric('lifetime_budget'),
  spend: numeric('spend'),
  impressions: bigint('impressions', { mode: 'number' }),
  clicks: bigint('clicks', { mode: 'number' }),
  ctr: numeric('ctr'),
  conversions: integer('conversions'),
  cpa: numeric('cpa'),
  roas: numeric('roas'),
  frequency: numeric('frequency'),
  cpm: numeric('cpm'),
  cpc: numeric('cpc'),
  start_date: text('start_date'),
  end_date: text('end_date'),
  platform_data: jsonb('platform_data'),
  leadFormId: text('lead_form_id'),
  created_at: timestamp('created_at'),
  updated_at: timestamp('updated_at'),
});

export const adsets = pgTable('adsets', {
  id: varchar('id').primaryKey(),
  workspaceId: varchar('workspace_id'),
  campaign_id: varchar('campaign_id'),
  platform: text('platform'),
  platformAdsetId: text('platform_adset_id'),
  name: text('name'),
  status: text('status'),
  created_at: timestamp('created_at'),
  updated_at: timestamp('updated_at'),
});

export const ads = pgTable('ads', {
  id: varchar('id').primaryKey(),
  workspaceId: varchar('workspace_id'),
  campaign_id: varchar('campaign_id'),
  adset_id: varchar('adset_id'),
  platform: text('platform'),
  platformAdId: text('platform_ad_id'),
  name: text('name'),
  status: text('status'),
  creative_type: text('creative_type'),
  creative_url: text('creative_url'),
  creative_text: text('creative_text'),
  spend: numeric('spend'),
  impressions: bigint('impressions', { mode: 'number' }),
  clicks: bigint('clicks', { mode: 'number' }),
  ctr: numeric('ctr'),
  conversions: integer('conversions'),
  cpa: numeric('cpa'),
  roas: numeric('roas'),
  frequency: numeric('frequency'),
  fatigue_score: numeric('fatigue_score'),
  fatigue_status: text('fatigue_status'),
  reviewStatus: text('review_status'),
  policyViolations: text('policy_violations'),
  created_at: timestamp('created_at'),
  updated_at: timestamp('updated_at'),
});

export const drafts = pgTable('drafts', {
  id: varchar('id').primaryKey(),
  workspace_id: varchar('workspace_id'),
  platform: text('platform'),
  campaign_id: varchar('campaign_id'),
  campaign_name: text('campaign_name'),
  adset_id: varchar('adset_id'),
  ad_id: varchar('ad_id'),
  draft_type: text('draft_type'),
  change_summary: text('change_summary'),
  change_detail: jsonb('change_detail'),
  ai_reasoning: text('ai_reasoning'),
  impact_estimate: text('impact_estimate'),
  status: text('status'),
  scheduled_at: timestamp('scheduled_at'),
  executed_at: timestamp('executed_at'),
  error_message: text('error_message'),
  actor_type: text('actor_type'),
  actor_id: varchar('actor_id'),
  actor_name: text('actor_name'),
  rule_id: varchar('rule_id'),
  approver_id: varchar('approver_id'),
  approval_note: text('approval_note'),
  created_at: timestamp('created_at'),
  resolved_at: timestamp('resolved_at'),
});

export const ad_accounts = pgTable('ad_accounts', {
  id: varchar('id').primaryKey(),
  workspaceId: varchar('workspace_id'),
  platform: text('platform'),
  platformAccountId: text('platform_account_id'),
  name: text('name'),
  status: text('status'),
  token_expires_at: timestamp('token_expires_at'),
  spendCap: text('spend_cap'),
  disabledReason: text('disabled_reason'),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at'),
  updated_at: timestamp('updated_at'),
});

export const automation_rules = pgTable('automation_rules', {
  id: varchar('id').primaryKey(),
  workspace_id: varchar('workspace_id'),
  created_at: timestamp('created_at'),
});

export const goals = pgTable('goals', {
  id: varchar('id').primaryKey(),
  workspace_id: varchar('workspace_id'),
  created_at: timestamp('created_at'),
});

export const scheduled_reports = pgTable('scheduled_reports', {
  id: varchar('id').primaryKey(),
  workspace_id: varchar('workspace_id'),
  created_at: timestamp('created_at'),
});

export const credit_usage_log = pgTable('credit_usage_log', {
  id: varchar('id').primaryKey(),
  workspace_id: varchar('workspace_id'),
  created_at: timestamp('created_at'),
});

export const leads = pgTable('leads', {
  id: varchar('id').primaryKey(),
  platform: text('platform'),
  platformLeadId: text('platform_lead_id'),
  campaignId: varchar('campaign_id'),
  workspaceId: varchar('workspace_id'),
  formId: varchar('form_id'),
  pageId: varchar('page_id'),
  fullName: text('full_name'),
  email: text('email'),
  phone: text('phone'),
  city: text('city'),
  country: text('country'),
  zipCode: text('zip_code'),
  streetAddress: text('street_address'),
  customAnswers: jsonb('custom_answers'),
  rawPayload: jsonb('raw_payload'),
  status: text('status'),
  created_at: timestamp('created_at'),
  updated_at: timestamp('updated_at'),
});

export const webhookEvents = pgTable('webhook_events', {
  id: varchar('id').primaryKey(),
  eventId: text('event_id'),
  platform: text('platform'),
  eventType: text('event_type'),
  payload: jsonb('payload'),
  receivedAt: timestamp('received_at'),
});

export const notifications = pgTable('notifications', {
  id: varchar('id').primaryKey(),
  workspaceId: varchar('workspace_id'),
  userId: varchar('user_id'),
  type: text('type'),
  title: text('title'),
  message: text('message'),
  priority: text('priority'),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at'),
});
