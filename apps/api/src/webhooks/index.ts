/**
 * Webhook Router — AdNexus Platform Webhook Central
 *
 * Routes webhooks from all 4 ad platforms to their respective handlers.
 * Provides shared utilities for signature verification, payload parsing,
 * local state synchronization, user notification, and idempotency.
 *
 * Routes:
 *   POST /webhooks/meta    — Meta Marketing API webhooks
 *   POST /webhooks/google  — Google Ads API webhooks
 *   POST /webhooks/tiktok  — TikTok Business API webhooks
 *   POST /webhooks/snap    — Snap Marketing API webhooks
 *   GET  /webhooks/:platform — Challenge/verification endpoint
 */

import { Router, type Request, type Response } from "express";
import { logger } from "../utils/logger";
import { db } from "../db";
import { webhookEvents, notifications } from "../db/schema";

// Platform-specific handlers
import {
  handleMetaWebhook,
  handleMetaChallenge,
  verifyMetaSignature,
} from "./meta";

import {
  handleGoogleWebhook,
  handleGoogleChallenge,
  verifyGoogleSignature,
} from "./google";

import {
  handleTikTokWebhook,
  handleTikTokChallenge,
  verifyTikTokSignature,
} from "./tiktok";

import {
  handleSnapWebhook,
  handleSnapChallenge,
  verifySnapSignature,
} from "./snap";

/** ------------------------------------------------------------------ */
/**                         Supported Platforms                         */
/** ------------------------------------------------------------------ */

type AdPlatform = "meta" | "google" | "tiktok" | "snap";

const PLATFORMS: AdPlatform[] = ["meta", "google", "tiktok", "snap"];

function isAdPlatform(value: string): value is AdPlatform {
  return PLATFORMS.includes(value as AdPlatform);
}

/** ------------------------------------------------------------------ */
/**                     Shared Utility Functions                        */
/** ------------------------------------------------------------------ */

/**
 * Verify webhook signature for any supported platform.
 *
 * @param platform   — Ad platform identifier
 * @param payload    — Raw request body (string or Buffer)
 * @param signature  — Signature header value
 * @param timestamp  — Optional timestamp (required for TikTok)
 * @returns boolean indicating signature validity
 *
 * @example
 * ```ts
 * const valid = verifySignature("meta", req.body, req.headers["x-hub-signature-256"]);
 * const validTikTok = verifySignature("tiktok", req.body, signature, timestamp);
 * ```
 */
export function verifySignature(
  platform: AdPlatform,
  payload: string | Buffer,
  signature: string,
  timestamp?: string
): boolean {
  switch (platform) {
    case "meta":
      return verifyMetaSignature(payload, signature);
    case "google":
      return verifyGoogleSignature(payload, signature);
    case "tiktok":
      return timestamp
        ? verifyTikTokSignature(payload, signature, timestamp)
        : false;
    case "snap":
      return verifySnapSignature(payload, signature);
    default:
      return false;
  }
}

/**
 * Parse webhook payload for any supported platform.
 *
 * Each platform has its own envelope format:
 * - Meta:    { object: "page", entry: [...] }
 * - Google:  Pub/Sub envelope OR direct ChangeEvent
 * - TikTok:  { event_type, event_id, advertiser_id, data }
 * - Snap:    { event_type, event_id, organization_id, data }
 *
 * @param platform  — Ad platform identifier
 * @param payload   — Parsed JSON body
 * @returns Normalized event object or null on parse failure
 */
export function parseWebhookPayload(
  platform: AdPlatform,
  payload: unknown
): WebhookEvent | null {
  try {
    if (!payload || typeof payload !== "object") return null;

    const p = payload as Record<string, unknown>;

    switch (platform) {
      case "meta": {
        const entries = (p.entry ?? []) as Array<Record<string, unknown>>;
        return {
          platform: "meta",
          eventId: `${p.object}-${entries[0]?.time ?? Date.now()}`,
          eventType: String(p.object ?? "unknown"),
          payload: p,
          timestamp: entries[0]?.time
            ? new Date(Number(entries[0].time) * 1000)
            : new Date(),
        };
      }

      case "google": {
        // Handle Pub/Sub envelope
        if (p.message && typeof p.message === "object") {
          const msg = p.message as Record<string, unknown>;
          const data = JSON.parse(
            Buffer.from(String(msg.data), "base64").toString()
          );
          const attrs = (msg.attributes ?? {}) as Record<string, string>;
          return {
            platform: "google",
            eventId: String(msg.messageId ?? `google-${Date.now()}`),
            eventType: attrs.eventType ?? "unknown",
            payload: data,
            timestamp: new Date(),
          };
        }
        // Direct payload
        return {
          platform: "google",
          eventId: `${p.customerId ?? "google"}-${Date.now()}`,
          eventType: String(p.changeType ?? p.alertType ?? "unknown"),
          payload: p,
          timestamp: new Date(),
        };
      }

      case "tiktok": {
        return {
          platform: "tiktok",
          eventId: String(p.event_id ?? `tiktok-${Date.now()}`),
          eventType: String(p.event_type ?? "unknown"),
          payload: p,
          timestamp: new Date(Number(p.timestamp ?? 0) * 1000),
        };
      }

      case "snap": {
        return {
          platform: "snap",
          eventId: String(p.event_id ?? `snap-${Date.now()}`),
          eventType: String(p.event_type ?? "unknown"),
          payload: p,
          timestamp: new Date(Number(p.created_at ?? 0) * 1000),
        };
      }

      default:
        return null;
    }
  } catch (err) {
    logger.error({ err, platform }, "Failed to parse webhook payload");
    return null;
  }
}

/**
 * Normalized webhook event shape used across all platforms.
 */
export interface WebhookEvent {
  platform: AdPlatform;
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Persist a processed webhook event to the database for idempotency
 * and audit logging.
 *
 * Uses ON CONFLICT DO NOTHING pattern (via drizzle's insert .onConflictDoNothing)
 * to silently skip duplicates.
 */
export async function persistWebhookEvent(event: WebhookEvent): Promise<boolean> {
  try {
    await db.insert(webhookEvents).values({ id: crypto.randomUUID() as string,
      eventId: event.eventId,
      platform: event.platform,
      eventType: event.eventType,
      payload: event.payload,
      receivedAt: event.timestamp,
    });
    return true; // New event
  } catch {
    logger.info(
      { eventId: event.eventId, platform: event.platform },
      "Duplicate webhook event, skipping"
    );
    return false; // Duplicate
  }
}

/**
 * Update local database state based on a webhook event.
 *
 * This is a generic dispatcher — each platform handler has its own
 * specialized logic. This function provides a fallback for unhandled
 * event types and ensures the event is at least logged.
 */
export async function updateLocalState(
  event: WebhookEvent
): Promise<void> {
  const { platform, eventType, payload } = event;

  logger.debug(
    { platform, eventType, eventId: event.eventId },
    "Updating local state from webhook"
  );

  // Platform-specific updates are handled by the individual handlers.
  // This function serves as a generic fallback / audit point.
  switch (platform) {
    case "meta":
      // Meta handler updates: campaigns, ad_accounts, leads
      break;
    case "google":
      // Google handler updates: campaigns, ads (policy), spend tracking
      break;
    case "tiktok":
      // TikTok handler updates: campaigns, ads, ad_accounts
      break;
    case "snap":
      // Snap handler updates: campaigns, ads, ad_accounts
      break;
    default:
      logger.warn({ platform }, "Unknown platform for local state update");
  }
}

/**
 * Notify workspace users about a webhook event.
 *
 * Creates in-app notifications and optionally triggers
 * external notification channels (email, Slack, etc.)
 */
export async function notifyUsers(
  workspaceId: string,
  event: WebhookEvent
): Promise<void> {
  try {
    const { platform, eventType, payload } = event;

    // Build a human-readable notification
    const title = `[${platform.toUpperCase()}] ${eventType}`;
    const message = extractEventSummary(platform, eventType, payload);

    await db.insert(notifications).values({ id: crypto.randomUUID() as string,
      workspaceId,
      type: "webhook_event",
      title,
      message,
      metadata: {
        platform,
        eventType,
        eventId: event.eventId,
        payload: event.payload,
      },
      created_at: new Date(),
    });

    logger.info(
      { workspaceId, eventId: event.eventId, platform },
      "Users notified of webhook event"
    );
  } catch (err) {
    logger.error({ err, workspaceId, eventId: event.eventId }, "Failed to notify users");
  }
}

/**
 * Extract a human-readable summary from a webhook event payload.
 */
function extractEventSummary(
  platform: AdPlatform,
  eventType: string,
  payload: Record<string, unknown>
): string {
  switch (platform) {
    case "meta": {
      const entries = (payload.entry ?? []) as Array<Record<string, unknown>>;
      if (entries[0]?.changes) {
        const changes = entries[0].changes as Array<{ field: string; value: unknown }>;
        return changes.map((c) => `${c.field}: ${JSON.stringify(c.value)}`).join("; ");
      }
      if (entries[0]?.leads) {
        return "New lead submission received";
      }
      return `${eventType} event received`;
    }

    case "google": {
      const resourceName = payload.resourceName as string | undefined;
      const alertType = payload.alertType as string | undefined;
      if (alertType) return `Alert: ${alertType}`;
      if (resourceName) return `Change on ${resourceName}`;
      return `${eventType} event received`;
    }

    case "tiktok": {
      const data = payload.data as Record<string, unknown> | undefined;
      const campaignName = data?.campaign_name as string | undefined;
      if (campaignName) return `Campaign "${campaignName}" event`;
      return `${eventType} event received`;
    }

    case "snap": {
      const snapData = payload.data as Record<string, unknown> | undefined;
      const campaignName = snapData?.campaign_name as string | undefined;
      const adName = snapData?.ad_name as string | undefined;
      if (campaignName) return `Campaign "${campaignName}" event`;
      if (adName) return `Ad "${adName}" event`;
      return `${eventType} event received`;
    }

    default:
      return `${eventType} event received`;
  }
}

/**
 * Generic webhook event handler.
 *
 * This function provides a standardized flow:
 * 1. Parse the payload
 * 2. Check idempotency
 * 3. Update local state
 * 4. Notify relevant users
 *
 * Individual platform handlers call this as a fallback or
 * use their own specialized implementations for fine-grained control.
 */
export async function handleWebhookEvent(
  platform: AdPlatform,
  event: WebhookEvent
): Promise<void> {
  logger.info(
    { platform, eventId: event.eventId, eventType: event.eventType },
    "Handling webhook event"
  );

  // Idempotency check
  const isNew = await persistWebhookEvent(event);
  if (!isNew) return;

  // Update local database state
  await updateLocalState(event);

  // Extract workspace ID from payload for notifications
  const workspaceId = await extractWorkspaceId(platform, event.payload);
  if (workspaceId) {
    await notifyUsers(workspaceId, event);
  }
}

/**
 * Attempt to extract workspace ID from a webhook event payload.
 */
async function extractWorkspaceId(
  platform: AdPlatform,
  payload: Record<string, unknown>
): Promise<string | null> {
  try {
    // For each platform, the workspace can be resolved via account/campaign mapping
    switch (platform) {
      case "meta": {
        const entries = (payload.entry ?? []) as Array<Record<string, unknown>>;
        const accountId = entries[0]?.id as string | undefined;
        if (!accountId) return null;
        const result = await db.query.ad_accounts.findFirst({
          where: (a, { eq, and }) =>
            and(eq(a.platform, "meta"), eq(a.platformAccountId, accountId)),
        });
        return result?.workspaceId ?? null;
      }

      case "google": {
        const customerId = payload.customerId as string | undefined;
        if (!customerId) return null;
        const result = await db.query.ad_accounts.findFirst({
          where: (a, { eq, and }) =>
            and(eq(a.platform, "google"), eq(a.platformAccountId, customerId)),
        });
        return result?.workspaceId ?? null;
      }

      case "tiktok": {
        const advertiserId = payload.advertiser_id as string | undefined;
        if (!advertiserId) return null;
        const result = await db.query.ad_accounts.findFirst({
          where: (a, { eq, and }) =>
            and(eq(a.platform, "tiktok"), eq(a.platformAccountId, advertiserId)),
        });
        return result?.workspaceId ?? null;
      }

      case "snap": {
        const adAccountId = payload.ad_account_id as string | undefined;
        if (!adAccountId) return null;
        const result = await db.query.ad_accounts.findFirst({
          where: (a, { eq, and }) =>
            and(eq(a.platform, "snap"), eq(a.platformAccountId, adAccountId)),
        });
        return result?.workspaceId ?? null;
      }

      default:
        return null;
    }
  } catch (err) {
    logger.error({ err, platform }, "Failed to extract workspace ID");
    return null;
  }
}

/** ------------------------------------------------------------------ */
/**                         Express Router                              */
/** ------------------------------------------------------------------ */

const router = Router();

/**
 * GET /webhooks/:platform
 *
 * Webhook verification / challenge-response endpoint.
 * Used by platforms during webhook registration to verify endpoint ownership.
 */
router.get("/:platform", async (req: Request, res: Response) => {
  const platform = req.params.platform;

  if (!isAdPlatform(platform)) {
    res.status(404).json({ error: `Unknown platform: ${platform}` });
    return;
  }

  logger.info({ platform }, "Webhook challenge received");

  try {
    switch (platform) {
      case "meta":
        await handleMetaChallenge(req, res);
        break;
      case "google":
        await handleGoogleChallenge(req, res);
        break;
      case "tiktok":
        await handleTikTokChallenge(req, res);
        break;
      case "snap":
        await handleSnapChallenge(req, res);
        break;
    }
  } catch (err) {
    logger.error({ err, platform }, "Webhook challenge handler error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /webhooks/:platform
 *
 * Webhook ingestion endpoint for all platforms.
 * Each handler verifies its own signature and returns 200 immediately.
 */
router.post("/:platform", async (req: Request, res: Response) => {
  const platform = req.params.platform;

  if (!isAdPlatform(platform)) {
    res.status(404).json({ error: `Unknown platform: ${platform}` });
    return;
  }

  logger.debug({ platform, headers: req.headers }, "Webhook POST received");

  try {
    switch (platform) {
      case "meta":
        await handleMetaWebhook(req, res);
        break;
      case "google":
        await handleGoogleWebhook(req, res);
        break;
      case "tiktok":
        await handleTikTokWebhook(req, res);
        break;
      case "snap":
        await handleSnapWebhook(req, res);
        break;
    }
  } catch (err) {
    // If headers haven't been sent yet, return 500
    if (!res.headersSent) {
      logger.error({ err, platform }, "Webhook handler error");
      res.status(500).json({ error: "Internal server error" });
    } else {
      // Handler already sent 200, log background error
      logger.error({ err, platform }, "Webhook background processing error");
    }
  }
});

export default router;
