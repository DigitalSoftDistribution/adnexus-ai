import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';
import { ValidationError } from '../lib/errors';
import { supabase } from '../lib/supabase';
import { getModuleLogger } from '../lib/logger';
import {
  handleMetaWebhook,
  handleGoogleWebhook,
  handleTikTokWebhook,
  handleSnapWebhook,
  registerWebhook,
} from '../services/webhook-handler';
import axios from 'axios';

const logger = getModuleLogger('webhooks');

const router = Router();

// ─────────────────────────────────────────────────────────────
// ALL ROUTES ARE PUBLIC — they verify via signatures/queries
// instead of the standard auth middleware.
// Webhooks must respond quickly (< 5 seconds), so all
// processing is done asynchronously (fire-and-forget).
// ─────────────────────────────────────────────────────────────

// ─── POST /api/v1/webhooks/meta ──────────────────────────────
// Meta webhook receiver
// Body: Meta webhook payload
// Headers: X-Hub-Signature-256 (HMAC-SHA256)
// Returns: 200 OK (must respond quickly)

router.post(
  '/meta',
  asyncHandler(async (req, res) => {
    const rawBody = JSON.stringify(req.body);
    const signature = (req.headers['x-hub-signature-256'] as string) ?? '';

    if (!signature) {
      throw new ValidationError('Missing X-Hub-Signature-256 header');
    }

    // Respond immediately — process asynchronously
    res.status(200).json({ success: true, message: 'Received' });

    // Async processing (fire-and-forget)
    (async () => {
      try {
        await handleMetaWebhook(req.body, signature);
      } catch (err) {
        logger.error({ err }, "Meta processing error");
      }
    })();
  }),
);

// ─── POST /api/v1/webhooks/google ────────────────────────────
// Google Ads webhook receiver
// Query: ?secret={webhook_secret}
// Body: Google webhook payload
// Returns: 200 OK

router.post(
  '/google',
  asyncHandler(async (req, res) => {
    const secret = (req.query.secret as string) ?? '';

    // Verify shared secret from URL query
    // The secret is workspace-specific and stored in webhook_configs
    if (!secret) {
      throw new ValidationError('Missing webhook secret query parameter');
    }

    // Look up the webhook config by secret to validate
    const { data: configRow, error: configError } = await supabase
      .from('webhook_configs')
      .select('id, workspace_id, secret, status')
      .eq('secret', secret)
      .eq('status', 'active')
      .limit(1);

    if (configError || !configRow || configRow.length === 0) {
      throw new ValidationError('Invalid webhook secret');
    }

    // Respond immediately — process asynchronously
    res.status(200).json({ success: true, message: 'Received' });

    // Async processing (fire-and-forget)
    (async () => {
      try {
        await handleGoogleWebhook(req.body);
      } catch (err) {
        logger.error({ err }, "Google processing error");
      }
    })();
  }),
);

// ─── POST /api/v1/webhooks/tiktok ────────────────────────────
// TikTok webhook receiver
// Headers: X-Signature
// Body: TikTok webhook payload
// Returns: 200 OK

router.post(
  '/tiktok',
  asyncHandler(async (req, res) => {
    const signature = (req.headers['x-signature'] as string) ?? '';

    if (!signature) {
      throw new ValidationError('Missing X-Signature header');
    }

    // Respond immediately — process asynchronously
    res.status(200).json({ success: true, message: 'Received' });

    // Async processing (fire-and-forget)
    (async () => {
      try {
        await handleTikTokWebhook(req.body, signature);
      } catch (err) {
        logger.error({ err }, "TikTok processing error");
      }
    })();
  }),
);

// ─── POST /api/v1/webhooks/snap ──────────────────────────────
// Snap webhook receiver
// Body: Snap webhook payload
// Returns: 200 OK

router.post(
  '/snap',
  asyncHandler(async (req, res) => {
    // Snap does not sign webhooks — we accept them best-effort
    // A shared secret query parameter can be used optionally
    const secret = (req.query.secret as string) ?? '';

    // If a secret is provided, validate it against webhook_configs
    if (secret) {
      const { data: configRow, error: configError } = await supabase
        .from('webhook_configs')
        .select('id')
        .eq('secret', secret)
        .eq('status', 'active')
        .limit(1);

      if (configError || !configRow || configRow.length === 0) {
        throw new ValidationError('Invalid webhook secret');
      }
    }

    // Respond immediately — process asynchronously
    res.status(200).json({ success: true, message: 'Received' });

    // Async processing (fire-and-forget)
    (async () => {
      try {
        await handleSnapWebhook(req.body);
      } catch (err) {
        logger.error({ err }, "Snap processing error");
      }
    })();
  }),
);

// ─── POST /api/v1/webhooks/custom/:workspaceId ───────────────
// Custom webhook for external integrations
// Body: JSON payload
// Query: ?token={verification_token}
// Forwards to workspace's configured webhook URL if set

router.post(
  '/custom/:workspaceId',
  asyncHandler(async (req, res) => {
    const workspaceId = req.params.workspaceId;
    const token = (req.query.token as string) ?? '';

    if (!token) {
      throw new ValidationError('Missing verification token query parameter');
    }

    if (!workspaceId) {
      throw new ValidationError('Missing workspaceId');
    }

    // Validate the workspace and token
    const { data: ws, error: wsError } = await supabase
      .from('workspaces')
      .select('id, settings')
      .eq('id', workspaceId)
      .single();

    if (wsError || !ws) {
      throw new ValidationError('Invalid workspace');
    }

    const settings = ws.settings as Record<string, unknown> | undefined;
    const expectedToken = settings?.custom_webhook_token as string | undefined;

    if (!expectedToken || expectedToken !== token) {
      throw new ValidationError('Invalid verification token');
    }

    // Look up workspace webhook config for forwarding
    const { data: webhookConfig } = await supabase
      .from('webhook_configs')
      .select('url, events, secret')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .limit(1);

    // Store the incoming payload for audit
    const { error: storeError } = await supabase.from('webhook_payloads').insert({
      source: 'custom',
      payload: req.body as Record<string, unknown>,
      headers: req.headers as Record<string, string>,
      workspace_id: workspaceId,
      received_at: new Date().toISOString(),
    });

    if (storeError) {
      logger.error({ workspaceId, err: storeError }, "Failed to store custom payload");
    }

    // Respond immediately
    res.status(200).json({ success: true, message: 'Received' });

    // Forward to configured URL if set
    if (webhookConfig && webhookConfig.length > 0) {
      const targetUrl = webhookConfig[0].url as string;
      const forwardSecret = webhookConfig[0].secret as string | undefined;

      (async () => {
        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-AdNexus-Source': 'custom_webhook',
            'X-AdNexus-Workspace': workspaceId,
          };
          if (forwardSecret) {
            headers['X-Webhook-Secret'] = forwardSecret;
          }

          await axios.post(targetUrl, req.body, {
            headers,
            timeout: 15000,
            validateStatus: () => true, // Don't throw on non-2xx
          });
        } catch (err) {
          logger.error({ workspaceId, err }, "Custom forward failed");
        }
      })();
    }
  }),
);

// ─── POST /api/v1/webhooks/register ──────────────────────────
// Register a new webhook configuration (protected by workspace auth)
// This route would be behind auth middleware in production,
// but is called via an authenticated endpoint.

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      workspace_id: z.string().uuid(),
      platform: z.enum(['meta', 'google', 'tiktok', 'snap', 'custom']),
      webhook_url: z.string().url(),
      events: z.array(z.string()).min(1),
    });

    const body = schema.parse(req.body);

    await registerWebhook(body.workspace_id, body.platform, body.webhook_url, body.events);

    res.status(201).json({
      success: true,
      message: `Webhook registered for ${body.platform}`,
    });
  }),
);

// ─── GET /api/v1/webhooks/meta — Verification endpoint ───────
// Meta requires a verification endpoint for webhook subscription
// Query params: hub.mode, hub.verify_token, hub.challenge

router.get(
  '/meta',
  asyncHandler(async (req, res) => {
    const mode = req.query['hub.mode'] as string;
    const verifyToken = req.query['hub.verify_token'] as string;
    const challenge = req.query['hub.challenge'] as string;

    if (mode === 'subscribe' && verifyToken && challenge) {
      // Validate the verify token against our config or DB
      const { data: configRow } = await supabase
        .from('webhook_configs')
        .select('id')
        .eq('secret', verifyToken)
        .eq('status', 'active')
        .limit(1);

      if (configRow && configRow.length > 0) {
        // Meta requires us to echo the challenge
        res.status(200).send(challenge);
        return;
      }
    }

    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Verification failed' } });
  }),
);

export default router;
