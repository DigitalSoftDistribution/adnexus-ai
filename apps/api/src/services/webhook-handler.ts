import { createHmac, timingSafeEqual } from 'crypto';
import { config } from '../config';
import { supabase } from '../lib/supabase';
import { ValidationError } from '../lib/errors';
import { broadcastToWorkspace } from './notification-service';
import axios from 'axios';
import { getModuleLogger } from '../lib/logger';

const logger = getModuleLogger('webhook-handler');

// ─── Types ───────────────────────────────────────────────────

export interface MetaWebhookPayload {
  object: 'ads_management' | 'page' | 'user' | 'instagram';
  entry: Array<{
    id: string;
    time: number;
    changes: Array<{
      field: string;
      value: {
        campaign_id?: string;
        adset_id?: string;
        ad_id?: string;
        account_id?: string;
        leadgen_id?: string;
        form_id?: string;
        created_time?: number;
        field?: string;
        old_value?: unknown;
        new_value?: unknown;
        [key: string]: unknown;
      };
    }>;
  }>;
}

export interface GoogleWebhookPayload {
  eventType: string;
  timestamp: string;
  customerId: string;
  campaignId?: string;
  adGroupId?: string;
  changes?: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
  conversion?: {
    gclid: string;
    conversionDateTime: string;
    conversionAction: string;
    conversionValue?: number;
    currencyCode?: string;
    orderId?: string;
  };
  [key: string]: unknown;
}

export interface TikTokWebhookPayload {
  event: string;
  timestamp: number;
  advertiser_id: string;
  data: {
    campaign_id?: string;
    adgroup_id?: string;
    ad_id?: string;
    creative_id?: string;
    status?: string;
    old_status?: string;
    new_status?: string;
    review_status?: string;
    reject_reason?: string;
    budget?: number;
    budget_mode?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface SnapWebhookPayload {
  event_type: string;
  timestamp: string;
  organization_id: string;
  ad_account_id: string;
  data: {
    campaign_id?: string;
    ad_squad_id?: string;
    creative_id?: string;
    status?: string;
    old_status?: string;
    new_status?: string;
    review_status?: string;
    reject_reason?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface CampaignUpdateEvent {
  workspaceId: string;
  platform: 'meta' | 'google' | 'tiktok' | 'snap';
  campaignId?: string;
  adsetId?: string;
  adId?: string;
  changes: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
  triggeredBy: 'platform' | 'user' | 'system';
  timestamp: string;
  rawEvent: Record<string, unknown>;
}

export interface LeadEvent {
  workspaceId: string;
  platform: 'meta';
  leadgenId: string;
  formId: string;
  accountId: string;
  campaignId?: string;
  adsetId?: string;
  adId?: string;
  leadData: Record<string, unknown>;
  createdTime: number;
}

interface ProcessedEventRecord {
  id: string;
  event_source: string;
  event_id: string;
  event_type: string;
  processed_at: string;
  payload_hash: string;
}

// ─── Signature Verification ──────────────────────────────────

/**
 * Verify Meta webhook signature using HMAC-SHA256.
 * Meta sends the signature as: sha256=<hex_hmac>
 */
export function verifyMetaSignature(payload: string, signature: string, appSecret: string): boolean {
  if (!signature || !signature.startsWith('sha256=')) {
    return false;
  }
  const expectedSig = signature.slice(7); // Remove 'sha256=' prefix
  const hmac = createHmac('sha256', appSecret).update(payload, 'utf8').digest('hex');

  try {
    const expectedBuf = Buffer.from(hmac, 'hex');
    const actualBuf = Buffer.from(expectedSig, 'hex');
    if (expectedBuf.length !== actualBuf.length) return false;
    return timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}

/**
 * Verify TikTok webhook signature using HMAC-SHA256.
 * TikTok sends the signature as a hex HMAC in the X-Signature header.
 */
export function verifyTikTokSignature(payload: string, signature: string, appSecret: string): boolean {
  if (!signature) return false;
  const hmac = createHmac('sha256', appSecret).update(payload, 'utf8').digest('hex');

  try {
    const expectedBuf = Buffer.from(hmac, 'hex');
    const actualBuf = Buffer.from(signature, 'hex');
    if (expectedBuf.length !== actualBuf.length) return false;
    return timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}

// ─── Idempotency ─────────────────────────────────────────────

/** Generate a deterministic hash for a webhook event */
function hashEvent(source: string, eventId: string, payload: unknown): string {
  const hmac = createHmac('sha256', config.jwt.secret);
  hmac.update(`${source}:${eventId}:${JSON.stringify(payload)}`);
  return hmac.digest('hex');
}

/** Check if an event was already processed. If not, record it. */
async function checkAndRecordIdempotency(
  source: string,
  eventId: string,
  eventType: string,
  payload: unknown,
): Promise<boolean> {
  const payloadHash = hashEvent(source, eventId, payload);

  // First try to insert — if conflict, event was already processed
  const { error } = await supabase
    .from('processed_webhook_events')
    .insert({
      event_source: source,
      event_id: eventId,
      event_type: eventType,
      payload_hash: payloadHash,
      processed_at: new Date().toISOString(),
    });

  if (error) {
    // Duplicate key violation (PGRST116 or 23505) means already processed
    if (error.code === '23505' || error.code === 'PGRST116') {
      return true; // Already processed
    }
    // Other DB error — log but don't block processing
    logger.error({ err: error.message }, `Idempotency check error for ${source}/${eventId}`);
  }

  return false; // Not yet processed
}

// ─── Raw Payload Storage ─────────────────────────────────────

/** Store raw webhook payload for debugging and audit trail */
async function storeRawPayload(
  source: string,
  payload: unknown,
  headers: Record<string, string>,
): Promise<string> {
  const { data, error } = await supabase
    .from('webhook_payloads')
    .insert({
      source,
      payload: payload as Record<string, unknown>,
      headers,
      received_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    logger.error({ err: error.message }, `Failed to store raw payload from ${source}`);
    return 'unknown';
  }

  return data.id as string;
}

// ─── Workspace Resolution ────────────────────────────────────

/** Resolve workspace_id from platform account ID */
async function resolveWorkspaceFromAccount(
  platform: 'meta' | 'google' | 'tiktok' | 'snap',
  accountId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('ad_accounts')
    .select('workspace_id')
    .eq('platform', platform)
    .eq('account_id', accountId)
    .limit(1);

  if (error || !data || data.length === 0) {
    logger.error(`Could not resolve workspace for ${platform} account ${accountId}`);
    return null;
  }

  return data[0].workspace_id as string;
}

/** Resolve workspace_id from platform campaign ID */
async function resolveWorkspaceFromCampaign(
  platform: 'meta' | 'google' | 'tiktok' | 'snap',
  platformCampaignId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('ad_accounts!inner(workspace_id)')
    .eq('platform_campaign_id', platformCampaignId)
    .limit(1);

  if (error || !data || data.length === 0) {
    logger.error(`Could not resolve workspace for ${platform} campaign ${platformCampaignId}`);
    return null;
  }

  // The join returns ad_accounts as an object or array with workspace_id
  const row = data[0] as Record<string, unknown>;
  const adAccount = row.ad_accounts as Record<string, unknown> | Record<string, unknown>[] | undefined;
  if (Array.isArray(adAccount)) {
    return (adAccount[0]?.workspace_id as string) ?? null;
  }
  return (adAccount?.workspace_id as string) ?? null;
}

// ─── Audit Logging ───────────────────────────────────────────

/** Log a webhook-driven change to the audit_log table */
async function logWebhookAudit(
  workspaceId: string,
  platform: 'meta' | 'google' | 'tiktok' | 'snap',
  action: string,
  campaignId: string | undefined,
  details: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from('audit_log').insert({
    workspace_id: workspaceId,
    actor_type: 'system',
    action,
    action_category: 'webhook',
    platform,
    campaign_id: campaignId,
    details,
    source: 'webhook',
    created_at: new Date().toISOString(),
  });

  if (error) {
    logger.error({ err: error.message }, `Audit log error for ${platform}`);
  }
}

// ─── Event Processors ────────────────────────────────────────

/**
 * Process a campaign status/budget/name update from any platform.
 * Updates the campaigns table, creates notifications for significant changes,
 * and logs to audit_log.
 */
export async function processCampaignUpdate(event: CampaignUpdateEvent): Promise<void> {
  if (!event.campaignId) {
    logger.error('CampaignUpdateEvent missing campaignId');
    return;
  }

  // Fetch current campaign state
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', event.campaignId)
    .single();

  if (!campaign) {
    logger.error(`Campaign ${event.campaignId} not found for update`);
    return;
  }

  // Build update object from changes
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  let significantChange = false;
  const changeDescriptions: string[] = [];

  for (const change of event.changes) {
    const field = change.field.toLowerCase();

    if (field === 'status' || field === 'campaign_status' || field === 'effective_status') {
      const newStatus = normalizeStatus(String(change.newValue));
      if (newStatus !== campaign.status) {
        updates.status = newStatus;
        changeDescriptions.push(`Status: ${campaign.status} → ${newStatus}`);
        // Significant if paused by platform
        if (newStatus === 'paused' && campaign.status === 'active') {
          significantChange = true;
        }
        if (newStatus === 'ended' || newStatus === 'error') {
          significantChange = true;
        }
      }
    }

    if (field === 'budget' || field === 'daily_budget' || field === 'lifetime_budget') {
      const newBudget = typeof change.newValue === 'string' ? parseInt(change.newValue, 10) : Number(change.newValue);
      if (!Number.isNaN(newBudget) && newBudget !== campaign.daily_budget) {
        updates.daily_budget = newBudget;
        changeDescriptions.push(`Budget: ${campaign.daily_budget} → ${newBudget}`);
        // Significant if budget exhausted (dropped to 0)
        if (newBudget === 0 && (campaign.daily_budget ?? 0) > 0) {
          significantChange = true;
        }
      }
    }

    if (field === 'name' || field === 'campaign_name') {
      const newName = String(change.newValue);
      if (newName !== campaign.name) {
        updates.name = newName;
        changeDescriptions.push(`Name: "${campaign.name}" → "${newName}"`);
      }
    }

    if (field === 'spend') {
      const newSpend = typeof change.newValue === 'string' ? parseFloat(change.newValue) : Number(change.newValue);
      if (!Number.isNaN(newSpend)) {
        updates.spend = newSpend;
      }
    }

    if (field === 'impressions') {
      const newImp = typeof change.newValue === 'string' ? parseInt(change.newValue, 10) : Number(change.newValue);
      if (!Number.isNaN(newImp)) {
        updates.impressions = newImp;
      }
    }

    if (field === 'clicks') {
      const newClicks = typeof change.newValue === 'string' ? parseInt(change.newValue, 10) : Number(change.newValue);
      if (!Number.isNaN(newClicks)) {
        updates.clicks = newClicks;
      }
    }
  }

  // Apply updates if any
  if (Object.keys(updates).length > 1) { // >1 because updated_at is always set
    const { error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', event.campaignId);

    if (error) {
      logger.error({ err: error.message }, `Failed to update campaign ${event.campaignId}`);
      return;
    }
  }

  // Log to audit_log
  await logWebhookAudit(
    event.workspaceId,
    event.platform,
    'campaign_update',
    event.campaignId,
    {
      changes: event.changes,
      triggered_by: event.triggeredBy,
      campaign_name: campaign.name,
    },
  );

  // Create notification for significant changes
  if (significantChange) {
    try {
      const notifTitle = event.changes.some((c) => c.field === 'status')
        ? `Campaign ${campaign.name} was paused by ${event.platform}`
        : `Campaign ${campaign.name} budget exhausted on ${event.platform}`;

      const notifMessage = changeDescriptions.join('; ') || `Significant change detected on ${event.platform}`;

      await broadcastToWorkspace(event.workspaceId, {
        workspaceId: event.workspaceId,
        type: 'budget_alert',
        title: notifTitle,
        message: notifMessage,
        data: {
          campaign_id: event.campaignId,
          platform_campaign_id: campaign.platform_campaign_id,
          platform: event.platform,
          changes: event.changes,
        },
      });
    } catch (notifErr) {
      logger.error({ err: notifErr }, 'Failed to create notification for campaign update');
    }
  }
}

/**
 * Process a new lead event from Meta leadgen.
 * Stores lead data, creates a notification, and optionally forwards to CRM.
 */
export async function processLeadEvent(event: LeadEvent): Promise<void> {
  // Store the lead
  const { error: leadError } = await supabase.from('leads').insert({
    workspace_id: event.workspaceId,
    platform: event.platform,
    leadgen_id: event.leadgenId,
    form_id: event.formId,
    account_id: event.accountId,
    campaign_id: event.campaignId,
    adset_id: event.adsetId,
    ad_id: event.adId,
    lead_data: event.leadData,
    created_at: new Date(event.createdTime * 1000).toISOString(),
  });

  if (leadError) {
    // Duplicate lead — check if this was already recorded
    if (leadError.code === '23505') {
      logger.info(`Lead ${event.leadgenId} already recorded, skipping`);
      return;
    }
    logger.error({ err: leadError.message }, `Failed to store lead ${event.leadgenId}`);
    return;
  }

  // Create notification
  try {
    await broadcastToWorkspace(event.workspaceId, {
      workspaceId: event.workspaceId,
      type: 'rule_triggered',
      title: `New lead from ${event.platform}`,
      message: `Lead ID ${event.leadgenId} received via form ${event.formId}`,
      data: {
        leadgen_id: event.leadgenId,
        form_id: event.formId,
        campaign_id: event.campaignId,
        account_id: event.accountId,
        created_time: event.createdTime,
      },
    });
  } catch (notifErr) {
    logger.error({ err: notifErr }, 'Failed to create lead notification');
  }

  // Optionally forward to CRM webhook if configured
  await forwardToCrm(event.workspaceId, {
    event: 'lead.created',
    platform: event.platform,
    lead: {
      leadgen_id: event.leadgenId,
      form_id: event.formId,
      lead_data: event.leadData,
      created_at: new Date(event.createdTime * 1000).toISOString(),
    },
    campaign_id: event.campaignId,
    adset_id: event.adsetId,
    ad_id: event.adId,
  });
}

// ─── CRM Forwarding ──────────────────────────────────────────

/** Forward a webhook event to the workspace's configured CRM webhook URL */
async function forwardToCrm(
  workspaceId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const { data: ws } = await supabase
    .from('workspaces')
    .select('settings')
    .eq('id', workspaceId)
    .single();

  if (!ws) return;

  const settings = ws.settings as Record<string, unknown> | undefined;
  const crmWebhookUrl = settings?.crm_webhook_url as string | undefined;

  if (!crmWebhookUrl) return;

  try {
    const crmSecret = settings?.crm_webhook_secret as string | undefined;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (crmSecret) {
      headers['X-Webhook-Secret'] = crmSecret;
    }

    await axios.post(crmWebhookUrl, payload, {
      headers,
      timeout: 10000,
      validateStatus: () => true, // Don't throw on non-2xx
    });
  } catch (err) {
    logger.error({ err: (err as Error).message }, `CRM forward failed for workspace ${workspaceId}`);
  }
}

// ─── Status Normalization ────────────────────────────────────

/** Normalize platform-specific status values to our unified status */
function normalizeStatus(status: string): 'active' | 'paused' | 'ended' | 'error' | 'draft' {
  const s = status.toUpperCase();
  if (s === 'ACTIVE' || s === 'ENABLED' || s === 'RUNNING') return 'active';
  if (s === 'PAUSED' || s === 'PAUSED_BY_PLATFORM') return 'paused';
  if (s === 'ARCHIVED' || s === 'REMOVED' || s === 'COMPLETED' || s === 'ENDED') return 'ended';
  if (s === 'ERROR' || s === 'DISAPPROVED' || s === 'REJECTED') return 'error';
  if (s === 'DRAFT' || s === 'PENDING_REVIEW') return 'draft';
  return 'paused'; // Default fallback
}

// ─── Meta Webhook Handler ────────────────────────────────────

/**
 * Handle incoming Meta webhook.
 * Supports: campaign_updates, adset_updates, ad_updates, leadgen.
 */
export async function handleMetaWebhook(
  payload: MetaWebhookPayload,
  signature: string,
): Promise<void> {
  // Verify signature
  const rawPayload = JSON.stringify(payload);
  if (!verifyMetaSignature(rawPayload, signature, config.meta.appSecret)) {
    throw new ValidationError('Invalid Meta webhook signature');
  }

  // Store raw payload for debugging
  await storeRawPayload('meta', payload, { 'X-Hub-Signature-256': signature });

  // Process each entry and each change
  for (const entry of payload.entry) {
    const eventId = `${entry.id}_${entry.time}`;

    for (const change of entry.changes) {
      const field = change.field;
      const value = change.value;

      // Idempotency check
      const eventType = `meta_${field}`;
      const alreadyProcessed = await checkAndRecordIdempotency('meta', `${eventId}_${field}`, eventType, value);
      if (alreadyProcessed) {
        logger.info(`Meta event ${eventId}/${field} already processed, skipping`);
        continue;
      }

      // Resolve workspace from account or campaign
      let workspaceId: string | null = null;
      if (value.account_id) {
        workspaceId = await resolveWorkspaceFromAccount('meta', value.account_id);
      } else if (value.campaign_id) {
        workspaceId = await resolveWorkspaceFromCampaign('meta', value.campaign_id);
      }

      if (!workspaceId) {
        logger.info(`Meta event ${eventId}: no workspace resolved, skipping`);
        continue;
      }

      // ── Leadgen event ──
      if (field === 'leadgen' || field === 'leads') {
        if (value.leadgen_id && value.form_id) {
          await processLeadEvent({
            workspaceId,
            platform: 'meta',
            leadgenId: value.leadgen_id,
            formId: value.form_id,
            accountId: value.account_id ?? '',
            campaignId: value.campaign_id,
            adsetId: value.adset_id as string | undefined,
            adId: value.ad_id as string | undefined,
            leadData: value,
            createdTime: value.created_time ?? Math.floor(Date.now() / 1000),
          });
        }
        continue;
      }

      // ── Campaign updates ──
      if (field === 'campaigns' || field === 'campaign_status' || field === 'campaign_budget') {
        const campaignId = value.campaign_id
          ? await resolveCampaignId('meta', value.campaign_id)
          : undefined;

        if (campaignId) {
          await processCampaignUpdate({
            workspaceId,
            platform: 'meta',
            campaignId,
            changes: buildChanges(field, value),
            triggeredBy: 'platform',
            timestamp: new Date(entry.time * 1000).toISOString(),
            rawEvent: { entry_id: entry.id, field, value },
          });
        }
        continue;
      }

      // ── Adset updates ──
      if (field === 'adsets' || field === 'adset_status' || field === 'adset_budget') {
        const adsetId = value.adset_id
          ? await resolveAdsetId('meta', value.adset_id)
          : undefined;

        if (adsetId) {
          // Find parent campaign
          const { data: adsetRow } = await supabase
            .from('adsets')
            .select('campaign_id')
            .eq('id', adsetId)
            .single();

          await processCampaignUpdate({
            workspaceId,
            platform: 'meta',
            campaignId: adsetRow?.campaign_id as string | undefined,
            adsetId,
            changes: buildChanges(field, value),
            triggeredBy: 'platform',
            timestamp: new Date(entry.time * 1000).toISOString(),
            rawEvent: { entry_id: entry.id, field, value },
          });
        }

        // Audit log for adset update
        await logWebhookAudit(workspaceId, 'meta', 'adset_update', undefined, {
          adset_id: value.adset_id,
          field,
          value,
        });
        continue;
      }

      // ── Ad updates ──
      if (field === 'ads' || field === 'ad_status' || field === 'ad_creative') {
        // Log but we don't have a dedicated ads update processor yet
        await logWebhookAudit(workspaceId, 'meta', 'ad_update', undefined, {
          ad_id: value.ad_id,
          field,
          value,
        });

        // Check if this is a creative review change
        if (value.field === 'status' && (value.old_value === 'PENDING_REVIEW' || value.new_value === 'DISAPPROVED')) {
          try {
            await broadcastToWorkspace(workspaceId, {
              workspaceId,
              type: 'rule_triggered',
              title: 'Ad creative review status changed',
              message: `Ad ${value.ad_id} review status: ${value.old_value} → ${value.new_value}`,
              data: { ad_id: value.ad_id, platform: 'meta', ...value },
            });
          } catch (notifErr) {
            logger.error({ err: notifErr }, 'Failed to create creative review notification');
          }
        }
        continue;
      }

      // ── Unhandled field — just audit log ──
      await logWebhookAudit(workspaceId, 'meta', `meta_${field}`, undefined, { value });
    }
  }
}

// ─── Google Webhook Handler ──────────────────────────────────

/**
 * Handle incoming Google Ads webhook.
 * Google does not sign webhooks — verification is done via a shared secret in the URL query.
 */
export async function handleGoogleWebhook(payload: GoogleWebhookPayload): Promise<void> {
  // Store raw payload
  await storeRawPayload('google', payload, {});

  const eventId = `google_${payload.customerId}_${payload.timestamp}_${JSON.stringify(payload.campaignId ?? '')}`;
  const eventType = payload.eventType ?? 'google_unknown';

  // Idempotency check
  const alreadyProcessed = await checkAndRecordIdempotency('google', eventId, eventType, payload);
  if (alreadyProcessed) {
    logger.info(`Google event ${eventId} already processed, skipping`);
    return;
  }

  // Resolve workspace
  let workspaceId: string | null = null;
  if (payload.customerId) {
    workspaceId = await resolveWorkspaceFromAccount('google', payload.customerId);
  }
  if (!workspaceId && payload.campaignId) {
    workspaceId = await resolveWorkspaceFromCampaign('google', payload.campaignId);
  }

  if (!workspaceId) {
    logger.info(`Google event ${eventId}: no workspace resolved, skipping`);
    return;
  }

  // ── Campaign status changes ──
  if (payload.eventType === 'campaign_status_change' || payload.eventType === 'campaign_change') {
    const campaignId = payload.campaignId
      ? await resolveCampaignId('google', payload.campaignId)
      : undefined;

    if (campaignId) {
      await processCampaignUpdate({
        workspaceId,
        platform: 'google',
        campaignId,
        changes: payload.changes ?? [],
        triggeredBy: 'platform',
        timestamp: payload.timestamp ?? new Date().toISOString(),
        rawEvent: payload as unknown as Record<string, unknown>,
      });
    }
    return;
  }

  // ── Conversion uploads ──
  if (payload.eventType === 'conversion_upload') {
    if (payload.conversion) {
      const { error } = await supabase.from('conversion_events').insert({
        workspace_id: workspaceId,
        platform: 'google',
        gclid: payload.conversion.gclid,
        conversion_date_time: payload.conversion.conversionDateTime,
        conversion_action: payload.conversion.conversionAction,
        conversion_value: payload.conversion.conversionValue ?? 0,
        currency_code: payload.conversion.currencyCode ?? 'USD',
        order_id: payload.conversion.orderId,
        campaign_id: payload.campaignId,
        raw_event: payload.conversion as unknown as Record<string, unknown>,
        created_at: new Date().toISOString(),
      });

      if (error) {
        logger.error({ err: error.message }, `Failed to store conversion event`);
      }

      await logWebhookAudit(workspaceId, 'google', 'conversion_upload', payload.campaignId, {
        conversion: payload.conversion,
      });
    }
    return;
  }

  // ── Unhandled Google event ──
  await logWebhookAudit(workspaceId, 'google', payload.eventType, payload.campaignId, {
    raw_payload: payload,
  });
}

// ─── TikTok Webhook Handler ──────────────────────────────────

/**
 * Handle incoming TikTok webhook.
 * Events: campaign_updates, creative_review_status.
 */
export async function handleTikTokWebhook(
  payload: TikTokWebhookPayload,
  signature: string,
): Promise<void> {
  // Verify signature
  const rawPayload = JSON.stringify(payload);
  if (!verifyTikTokSignature(rawPayload, signature, config.tiktok.appSecret)) {
    throw new ValidationError('Invalid TikTok webhook signature');
  }

  // Store raw payload
  await storeRawPayload('tiktok', payload, { 'X-Signature': signature });

  const eventId = `tiktok_${payload.advertiser_id}_${payload.timestamp}_${payload.event}`;
  const eventType = payload.event ?? 'tiktok_unknown';

  // Idempotency check
  const alreadyProcessed = await checkAndRecordIdempotency('tiktok', eventId, eventType, payload);
  if (alreadyProcessed) {
    logger.info(`TikTok event ${eventId} already processed, skipping`);
    return;
  }

  // Resolve workspace
  let workspaceId: string | null = null;
  if (payload.advertiser_id) {
    workspaceId = await resolveWorkspaceFromAccount('tiktok', payload.advertiser_id);
  }
  if (!workspaceId && payload.data?.campaign_id) {
    workspaceId = await resolveWorkspaceFromCampaign('tiktok', payload.data.campaign_id);
  }

  if (!workspaceId) {
    logger.info(`TikTok event ${eventId}: no workspace resolved, skipping`);
    return;
  }

  // ── Campaign updates ──
  if (payload.event === 'campaign_update' || payload.event === 'campaign_status_change') {
    const campaignId = payload.data.campaign_id
      ? await resolveCampaignId('tiktok', payload.data.campaign_id)
      : undefined;

    const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];
    if (payload.data.status || payload.data.old_status || payload.data.new_status) {
      changes.push({
        field: 'status',
        oldValue: payload.data.old_status ?? payload.data.status ?? '',
        newValue: payload.data.new_status ?? payload.data.status ?? '',
      });
    }
    if (payload.data.budget !== undefined) {
      changes.push({
        field: 'budget',
        oldValue: '',
        newValue: payload.data.budget,
      });
    }

    if (campaignId) {
      await processCampaignUpdate({
        workspaceId,
        platform: 'tiktok',
        campaignId,
        changes,
        triggeredBy: 'platform',
        timestamp: new Date(payload.timestamp * 1000).toISOString(),
        rawEvent: payload as unknown as Record<string, unknown>,
      });
    }

    await logWebhookAudit(workspaceId, 'tiktok', 'campaign_update', campaignId, {
      tiktok_data: payload.data,
    });
    return;
  }

  // ── Creative review status ──
  if (payload.event === 'creative_review_status') {
    const creativeId = payload.data.creative_id;
    const reviewStatus = payload.data.review_status;

    if (reviewStatus === 'REJECTED') {
      try {
        await broadcastToWorkspace(workspaceId, {
          workspaceId,
          type: 'rule_triggered',
          title: 'TikTok creative rejected',
          message: `Creative ${creativeId} was rejected${payload.data.reject_reason ? `: ${payload.data.reject_reason}` : ''}`,
          data: {
            creative_id: creativeId,
            ad_id: payload.data.ad_id,
            platform: 'tiktok',
            reject_reason: payload.data.reject_reason,
            review_status: reviewStatus,
          },
        });
      } catch (notifErr) {
        logger.error({ err: notifErr }, 'Failed to create TikTok creative review notification');
      }
    }

    await logWebhookAudit(workspaceId, 'tiktok', 'creative_review', undefined, {
      creative_id: creativeId,
      review_status: reviewStatus,
      tiktok_data: payload.data,
    });
    return;
  }

  // ── Unhandled TikTok event ──
  await logWebhookAudit(workspaceId, 'tiktok', payload.event, payload.data.campaign_id, {
    raw_payload: payload,
  });
}

// ─── Snap Webhook Handler ────────────────────────────────────

/**
 * Handle incoming Snap webhook.
 * Events: campaign_status_changes, creative_review.
 * Note: Snap does not provide webhook signatures — treat as best-effort.
 */
export async function handleSnapWebhook(payload: SnapWebhookPayload): Promise<void> {
  // Store raw payload
  await storeRawPayload('snap', payload, {});

  const eventId = `snap_${payload.organization_id}_${payload.ad_account_id}_${payload.timestamp}_${payload.event_type}`;
  const eventType = payload.event_type ?? 'snap_unknown';

  // Idempotency check
  const alreadyProcessed = await checkAndRecordIdempotency('snap', eventId, eventType, payload);
  if (alreadyProcessed) {
    logger.info(`Snap event ${eventId} already processed, skipping`);
    return;
  }

  // Resolve workspace
  let workspaceId: string | null = null;
  if (payload.ad_account_id) {
    workspaceId = await resolveWorkspaceFromAccount('snap', payload.ad_account_id);
  }
  if (!workspaceId && payload.data?.campaign_id) {
    workspaceId = await resolveWorkspaceFromCampaign('snap', payload.data.campaign_id);
  }

  if (!workspaceId) {
    logger.info(`Snap event ${eventId}: no workspace resolved, skipping`);
    return;
  }

  // ── Campaign status changes ──
  if (payload.event_type === 'campaign_status_change' || payload.event_type === 'campaign_update') {
    const campaignId = payload.data.campaign_id
      ? await resolveCampaignId('snap', payload.data.campaign_id)
      : undefined;

    const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];
    if (payload.data.status || payload.data.old_status || payload.data.new_status) {
      changes.push({
        field: 'status',
        oldValue: payload.data.old_status ?? payload.data.status ?? '',
        newValue: payload.data.new_status ?? payload.data.status ?? '',
      });
    }

    if (campaignId) {
      await processCampaignUpdate({
        workspaceId,
        platform: 'snap',
        campaignId,
        changes,
        triggeredBy: 'platform',
        timestamp: payload.timestamp ?? new Date().toISOString(),
        rawEvent: payload as unknown as Record<string, unknown>,
      });
    }

    await logWebhookAudit(workspaceId, 'snap', 'campaign_update', campaignId, {
      snap_data: payload.data,
    });
    return;
  }

  // ── Creative review ──
  if (payload.event_type === 'creative_review') {
    const creativeId = payload.data.creative_id;
    const reviewStatus = payload.data.review_status;

    if (reviewStatus === 'REJECTED') {
      try {
        await broadcastToWorkspace(workspaceId, {
          workspaceId,
          type: 'rule_triggered',
          title: 'Snap creative rejected',
          message: `Creative ${creativeId} was rejected${payload.data.reject_reason ? `: ${payload.data.reject_reason}` : ''}`,
          data: {
            creative_id: creativeId,
            ad_squad_id: payload.data.ad_squad_id,
            platform: 'snap',
            reject_reason: payload.data.reject_reason,
            review_status: reviewStatus,
          },
        });
      } catch (notifErr) {
        logger.error({ err: notifErr }, 'Failed to create Snap creative review notification');
      }
    }

    await logWebhookAudit(workspaceId, 'snap', 'creative_review', undefined, {
      creative_id: creativeId,
      review_status: reviewStatus,
      snap_data: payload.data,
    });
    return;
  }

  // ── Unhandled Snap event ──
  await logWebhookAudit(workspaceId, 'snap', payload.event_type, payload.data?.campaign_id, {
    raw_payload: payload,
  });
}

// ─── Generic Webhook Registration ────────────────────────────

/**
 * Register a webhook URL with an advertising platform.
 * Currently a placeholder that stores the config in our DB.
 * Platform-specific registration would require API calls.
 */
export async function registerWebhook(
  workspaceId: string,
  platform: string,
  webhookUrl: string,
  events: string[],
): Promise<void> {
  if (!webhookUrl || !events || events.length === 0) {
    throw new ValidationError('Webhook URL and at least one event are required');
  }

  if (!['meta', 'google', 'tiktok', 'snap', 'custom'].includes(platform)) {
    throw new ValidationError(`Unsupported platform: ${platform}`);
  }

  const { error } = await supabase.from('webhook_configs').insert({
    workspace_id: workspaceId,
    name: `${platform}_webhook_${Date.now()}`,
    url: webhookUrl,
    events,
    status: 'active',
    created_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to register webhook: ${error.message}`);
  }
}

// ─── Helper: Resolve IDs ─────────────────────────────────────

/** Resolve an internal campaign UUID from a platform campaign ID */
async function resolveCampaignId(
  platform: 'meta' | 'google' | 'tiktok' | 'snap',
  platformCampaignId: string,
): Promise<string | undefined> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('id')
    .eq('platform_campaign_id', platformCampaignId)
    .limit(1);

  if (error || !data || data.length === 0) {
    logger.error(`Could not resolve campaign ${platformCampaignId} for ${platform}`);
    return undefined;
  }

  return data[0].id as string;
}

/** Resolve an internal adset UUID from a platform adset ID */
async function resolveAdsetId(
  platform: 'meta' | 'google' | 'tiktok' | 'snap',
  platformAdsetId: string,
): Promise<string | undefined> {
  const { data, error } = await supabase
    .from('adsets')
    .select('id')
    .eq('platform_adset_id', platformAdsetId)
    .limit(1);

  if (error || !data || data.length === 0) {
    logger.error(`Could not resolve adset ${platformAdsetId} for ${platform}`);
    return undefined;
  }

  return data[0].id as string;
}

/** Build a normalized changes array from Meta webhook value */
function buildChanges(
  field: string,
  value: Record<string, unknown>,
): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
  const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];

  if (value.field && (value.old_value !== undefined || value.new_value !== undefined)) {
    changes.push({
      field: String(value.field),
      oldValue: value.old_value,
      newValue: value.new_value,
    });
  } else if (value.status || value.new_status) {
    changes.push({
      field: field.includes('status') ? 'status' : field,
      oldValue: value.old_status ?? '',
      newValue: value.new_status ?? value.status ?? '',
    });
  } else {
    // Generic: include all scalar value fields as changes
    for (const [k, v] of Object.entries(value)) {
      if (['campaign_id', 'adset_id', 'ad_id', 'account_id', 'created_time'].includes(k)) continue;
      if (v !== undefined && v !== null) {
        changes.push({ field: k, oldValue: '', newValue: v });
      }
    }
  }

  return changes;
}
