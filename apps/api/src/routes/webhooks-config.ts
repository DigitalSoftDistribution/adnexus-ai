// ═══════════════════════════════════════════════════════════════
// Webhooks Configuration Routes
// ═══════════════════════════════════════════════════════════════
// Manages user-configured webhook endpoints for event notifications.
//
// Endpoints:
//   GET    /webhooks              — list all webhooks for workspace
//   POST   /webhooks              — create a new webhook
//   PUT    /webhooks/:id          — update a webhook
//   DELETE /webhooks/:id          — delete a webhook
//   POST   /webhooks/:id/test     — send a test event payload
//   GET    /webhooks/:id/deliveries — get delivery history
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { supabase } from '../lib/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import {
  NotFoundError,
  ValidationError,
} from '../lib/errors';
import { isSafePublicHttpUrl } from '../lib/url-safety';
import { getRequestLogger } from '../lib/logger';

const router = Router();
const logger = (req: import('express').Request) =>
  getRequestLogger((req.headers['x-request-id'] as string) ?? 'webhooks-config');

// ─── Valid event types ───────────────────────────────────────

const VALID_EVENT_TYPES = [
  'draft.created',
  'draft.approved',
  'draft.rejected',
  'draft.executed',
  'campaign.created',
  'campaign.updated',
  'campaign.paused',
  'campaign.resumed',
  'campaign.ended',
  'ad.created',
  'ad.updated',
  'ad.rejected',
  'budget.alert',
  'goal.reached',
  'goal.alert',
  'report.generated',
  'member.invited',
  'integration.connected',
  'integration.disconnected',
  'export.completed',
];

// ─── Zod Schemas ─────────────────────────────────────────────

const createWebhookSchema = z.object({
  url: z
    .string()
    .url('Must be a valid URL')
    .min(1, 'URL is required')
    .refine(isSafePublicHttpUrl, {
      message: 'URL must be a public http(s) endpoint (private, loopback, and link-local hosts are not allowed)',
    }),
  events: z
    .array(z.string())
    .min(1, 'At least one event type is required')
    .refine(
      (events) => events.every((e) => VALID_EVENT_TYPES.includes(e)),
      { message: 'One or more event types are invalid' },
    ),
  secret: z.string().optional(),
});

const updateWebhookSchema = z.object({
  url: z
    .string()
    .url()
    .refine(isSafePublicHttpUrl, {
      message: 'URL must be a public http(s) endpoint (private, loopback, and link-local hosts are not allowed)',
    })
    .optional(),
  events: z
    .array(z.string())
    .refine(
      (events) => events.every((e) => VALID_EVENT_TYPES.includes(e)),
      { message: 'One or more event types are invalid' },
    )
    .optional(),
  secret: z.string().optional(),
  active: z.boolean().optional(),
});

const webhookIdParamSchema = z.object({
  id: z.string().uuid('Invalid webhook ID'),
});

// ─── Types ───────────────────────────────────────────────────

interface WebhookPayload {
  event: string;
  timestamp: string;
  deliveryId: string;
  environment: string;
  webhook: { id: string; url: string };
  [key: string]: unknown;
}

interface DeliveryResult {
  status: string;
  statusCode: number;
  duration: number;
  responseBody: string;
  headers: Record<string, string>;
}

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Generate a secure random secret key for webhook signing.
 */
function generateSecret() {
  return `whsec_${crypto.randomBytes(32).toString('base64url')}`;
}

/**
 * Sign a webhook payload with the secret using HMAC-SHA256.
 */
function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Send a test webhook payload to the given URL.
 */
async function deliverWebhook(url: string, eventType: string, payload: WebhookPayload, secret: string): Promise<DeliveryResult> {
  const body = JSON.stringify(payload);
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'AdNexus-Webhook/1.0',
    'X-AdNexus-Event': eventType,
    'X-AdNexus-Delivery': crypto.randomUUID(),
    'X-AdNexus-Timestamp': new Date().toISOString(),
    ...(secret ? { 'X-AdNexus-Signature': `sha256=${signPayload(body, secret)}` } : {}),
  };

  const startTime = Date.now();
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(10000),
    });
    const duration = Date.now() - startTime;
    const responseBody = await response.text().catch(() => '');

    return {
      status: response.ok ? 'success' : 'failed',
      statusCode: response.status,
      duration,
      responseBody: responseBody.slice(0, 2000),
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (err) {
    return {
      status: 'failed',
      statusCode: 0,
      duration: Date.now() - startTime,
      responseBody: err instanceof Error ? err.message : 'Network error',
      headers: {},
    };
  }
}

/**
 * Build a test payload for the given event type.
 */
function buildTestPayload(eventType: string): WebhookPayload {
  const base = {
    event: eventType,
    timestamp: new Date().toISOString(),
    deliveryId: crypto.randomUUID(),
    environment: 'test',
    webhook: {
      id: 'wh_test',
      url: 'https://example.com/webhook',
    },
  };

  const eventPayloads: Record<string, Record<string, unknown>> = {
    'draft.created': {
      draft: { id: 'draft_123', title: 'Increase budget by 20%', status: 'pending_review', author: 'alex@example.com' },
    },
    'draft.approved': {
      draft: { id: 'draft_123', title: 'Increase budget by 20%', status: 'approved', approvedBy: 'jordan@example.com' },
    },
    'draft.rejected': {
      draft: { id: 'draft_123', title: 'Increase budget by 20%', status: 'rejected', rejectedBy: 'casey@example.com', reason: 'Budget too high' },
    },
    'draft.executed': {
      draft: { id: 'draft_123', title: 'Increase budget by 20%', status: 'executed', executedAt: new Date().toISOString() },
    },
    'campaign.created': {
      campaign: { id: 'camp_456', name: 'Summer Sale 2026', platform: 'meta', status: 'active', budget: 5000 },
    },
    'campaign.updated': {
      campaign: { id: 'camp_456', name: 'Summer Sale 2026', changes: { budget: { old: 5000, new: 7500 } } },
    },
    'campaign.paused': {
      campaign: { id: 'camp_456', name: 'Summer Sale 2026', status: 'paused', pausedAt: new Date().toISOString() },
    },
    'campaign.resumed': {
      campaign: { id: 'camp_456', name: 'Summer Sale 2026', status: 'active', resumedAt: new Date().toISOString() },
    },
    'campaign.ended': {
      campaign: { id: 'camp_456', name: 'Summer Sale 2026', status: 'ended', endedAt: new Date().toISOString() },
    },
    'ad.created': {
      ad: { id: 'ad_789', name: 'Creative A - Video', campaignId: 'camp_456', status: 'active' },
    },
    'ad.updated': {
      ad: { id: 'ad_789', name: 'Creative A - Video', changes: { status: { old: 'active', new: 'paused' } } },
    },
    'ad.rejected': {
      ad: { id: 'ad_789', name: 'Creative A - Video', status: 'rejected', rejectionReason: 'Policy violation' },
    },
    'budget.alert': {
      alert: { campaignId: 'camp_456', campaignName: 'Summer Sale 2026', spendPercent: 85, threshold: 80 },
    },
    'goal.reached': {
      goal: { id: 'goal_001', name: 'ROAS > 3.0', currentValue: 3.5, targetValue: 3.0 },
    },
    'goal.alert': {
      goal: { id: 'goal_001', name: 'ROAS > 3.0', currentValue: 2.1, targetValue: 3.0 },
    },
    'report.generated': {
      report: { id: 'rep_321', name: 'Weekly Performance', url: 'https://app.adnexus.ai/reports/rep_321' },
    },
    'member.invited': {
      member: { id: 'mem_999', email: 'newuser@example.com', role: 'analyst', invitedBy: 'admin@example.com' },
    },
    'integration.connected': {
      integration: { platform: 'slack', workspaceName: 'My Team', connectedAt: new Date().toISOString() },
    },
    'integration.disconnected': {
      integration: { platform: 'slack', workspaceName: 'My Team', disconnectedAt: new Date().toISOString() },
    },
    'export.completed': {
      export: { id: 'exp_555', format: 'csv', type: 'campaigns', downloadUrl: 'https://app.adnexus.ai/exports/exp_555.csv' },
    },
  };

  return { ...base, ...(eventPayloads[eventType] || {}) };
}

// ─── GET /webhooks — List webhooks ───────────────────────────

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;

    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new ValidationError(`Failed to fetch webhooks: ${error.message}`);
    }

    // Get last delivery for each webhook
    const webhookIds = (webhooks || []).map((wh) => wh.id);
    let lastDeliveries: Array<Record<string, unknown>> = [];

    if (webhookIds.length > 0) {
      const { data: deliveries } = await supabase
        .from('webhook_deliveries')
        .select('id, webhook_id, event_type, status, status_code, created_at')
        .in('webhook_id', webhookIds)
        .order('created_at', { ascending: false })
        .limit(webhookIds.length * 1);

      // Keep only the most recent delivery per webhook
      const seen = new Set();
      lastDeliveries = (deliveries || []).filter((d) => {
        if (seen.has(d.webhook_id)) return false;
        seen.add(d.webhook_id);
        return true;
      });
    }

    const deliveryMap = new Map(lastDeliveries.map((d) => [d.webhook_id, d]));

    const mapped = (webhooks || []).map((wh) => {
      const lastDelivery = deliveryMap.get(wh.id);
      return {
        id: wh.id,
        url: wh.url,
        events: wh.events,
        secret: wh.secret,
        active: wh.active,
        createdAt: wh.created_at,
        updatedAt: wh.updated_at,
        lastDelivery: lastDelivery
          ? {
              status: lastDelivery.status,
              event: lastDelivery.event_type,
              timestamp: lastDelivery.created_at,
              statusCode: lastDelivery.status_code,
            }
          : null,
        deliveryCount: wh.delivery_count ?? 0,
        successRate: wh.success_rate ?? 100,
      };
    });

    logger(req).info(
      { count: mapped.length, workspaceId },
      'Webhooks listed',
    );

    res.json({
      success: true,
      data: mapped,
    });
  }),
);

// ─── POST /webhooks — Create webhook ─────────────────────────

router.post(
  '/',
  requireAdmin,
  validateRequest(createWebhookSchema, 'body'),
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const body = req.body;

    // Generate secret if not provided
    const secret = body.secret?.trim() || generateSecret();

    const { data: webhook, error } = await supabase
      .from('webhooks')
      .insert({
        workspace_id: workspaceId,
        url: body.url.trim(),
        events: body.events,
        secret,
        active: true,
        delivery_count: 0,
        success_rate: 100,
        created_by: req.user?.sub,
      })
      .select()
      .single();

    if (error || !webhook) {
      throw new ValidationError(`Failed to create webhook: ${error?.message ?? 'Unknown error'}`);
    }

    logger(req).info(
      { webhookId: webhook.id, url: webhook.url, eventCount: body.events.length },
      'Webhook created',
    );

    res.status(201).json({
      success: true,
      data: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        secret: webhook.secret,
        active: webhook.active,
        createdAt: webhook.created_at,
        updatedAt: webhook.updated_at,
      },
      message: 'Webhook created successfully',
    });
  }),
);

// ─── PUT /webhooks/:id — Update webhook ──────────────────────

router.put(
  '/:id',
  requireAdmin,
  validateRequest(webhookIdParamSchema, 'params'),
  validateRequest(updateWebhookSchema, 'body'),
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const webhookId = req.params.id;
    const body = req.body;

    // Verify ownership
    const { data: existing, error: findError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', webhookId)
      .eq('workspace_id', workspaceId)
      .single();

    if (findError || !existing) {
      throw new NotFoundError('Webhook');
    }

    const updateData: Record<string, unknown> = {};
    if (body.url !== undefined) updateData.url = body.url.trim();
    if (body.events !== undefined) updateData.events = body.events;
    if (body.secret !== undefined) updateData.secret = body.secret.trim();
    if (body.active !== undefined) updateData.active = body.active;

    const { data: webhook, error } = await supabase
      .from('webhooks')
      .update(updateData)
      .eq('id', webhookId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error || !webhook) {
      throw new ValidationError(`Failed to update webhook: ${error?.message ?? 'Unknown error'}`);
    }

    logger(req).info(
      { webhookId, updatedFields: Object.keys(updateData) },
      'Webhook updated',
    );

    res.json({
      success: true,
      data: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        active: webhook.active,
        updatedAt: webhook.updated_at,
      },
      message: 'Webhook updated successfully',
    });
  }),
);

// ─── DELETE /webhooks/:id — Delete webhook ───────────────────

router.delete(
  '/:id',
  requireAdmin,
  validateRequest(webhookIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const webhookId = req.params.id;

    // Verify ownership
    const { data: existing, error: findError } = await supabase
      .from('webhooks')
      .select('id, url')
      .eq('id', webhookId)
      .eq('workspace_id', workspaceId)
      .single();

    if (findError || !existing) {
      throw new NotFoundError('Webhook');
    }

    // Delete associated delivery logs first
    await supabase
      .from('webhook_deliveries')
      .delete()
      .eq('webhook_id', webhookId);

    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', webhookId)
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new ValidationError(`Failed to delete webhook: ${error.message}`);
    }

    logger(req).info(
      { webhookId, url: existing.url },
      'Webhook deleted',
    );

    res.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  }),
);

// ─── POST /webhooks/:id/test — Send test event ───────────────

router.post(
  '/:id/test',
  requireAdmin,
  validateRequest(webhookIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const webhookId = req.params.id;

    // Fetch webhook
    const { data: webhook, error: findError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', webhookId)
      .eq('workspace_id', workspaceId)
      .single();

    if (findError || !webhook) {
      throw new NotFoundError('Webhook');
    }

    if (!webhook.active) {
      throw new ValidationError('Cannot test an inactive webhook. Activate it first.');
    }

    // Pick first subscribed event or default
    const eventType =
      webhook.events?.[0] ?? 'campaign.updated';

    const payload = buildTestPayload(eventType);

    // Deliver test payload
    const result = await deliverWebhook(
      webhook.url,
      eventType,
      payload,
      webhook.secret,
    );

    // Record the delivery attempt
    const { data: delivery } = await supabase
      .from('webhook_deliveries')
      .insert({
        webhook_id: webhookId,
        event_type: eventType,
        payload: payload,
        status: result.status,
        status_code: result.statusCode,
        duration_ms: result.duration,
        response_body: result.responseBody,
        is_test: true,
      })
      .select()
      .single();

    // Update delivery stats on the webhook
    const newCount = (webhook.delivery_count ?? 0) + 1;
    const currentSuccesses = Math.round(((webhook.success_rate ?? 100) / 100) * (webhook.delivery_count ?? 0));
    const newSuccesses = result.status === 'success' ? currentSuccesses + 1 : currentSuccesses;
    const newRate = newCount > 0 ? Math.round((newSuccesses / newCount) * 100 * 10) / 10 : 100;

    await supabase
      .from('webhooks')
      .update({
        delivery_count: newCount,
        success_rate: newRate,
        last_delivered_at: new Date().toISOString(),
      })
      .eq('id', webhookId);

    logger(req).info(
      {
        webhookId,
        eventType,
        status: result.status,
        statusCode: result.statusCode,
        duration: result.duration,
      },
      'Webhook test delivered',
    );

    res.json({
      success: true,
      data: {
        deliveryId: delivery?.id,
        event: eventType,
        status: result.status,
        statusCode: result.statusCode,
        duration: result.duration,
        message:
          result.status === 'success'
            ? 'Test payload delivered successfully'
            : `Test delivery failed: ${result.responseBody || 'Unknown error'}`,
      },
    });
  }),
);

// ─── GET /webhooks/:id/deliveries — Delivery history ─────────

router.get(
  '/:id/deliveries',
  validateRequest(webhookIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const webhookId = req.params.id;

    // Verify ownership
    const { data: webhook, error: findError } = await supabase
      .from('webhooks')
      .select('id')
      .eq('id', webhookId)
      .eq('workspace_id', workspaceId)
      .single();

    if (findError || !webhook) {
      throw new NotFoundError('Webhook');
    }

    const { data: deliveries, error } = await supabase
      .from('webhook_deliveries')
      .select('id, webhook_id, event_type, status, status_code, duration_ms, response_body, is_test, created_at')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw new ValidationError(`Failed to fetch deliveries: ${error.message}`);
    }

    const mapped = (deliveries || []).map((d) => ({
      id: d.id,
      webhookId: d.webhook_id,
      event: d.event_type,
      status: d.status,
      statusCode: d.status_code,
      timestamp: d.created_at,
      duration: d.duration_ms ?? 0,
      responseBody: d.response_body,
      isTest: d.is_test,
    }));

    res.json({
      success: true,
      data: mapped,
    });
  }),
);

export default router;
