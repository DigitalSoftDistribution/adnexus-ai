/**
 * TikTok Business API Webhook Handler
 *
 * Handles webhooks from TikTok for Business:
 * - Campaign status changes (ENABLE → DISABLE, DELETE, etc.)
 * - Budget alerts (overspend, approaching limit)
 * - Creative policy violations (ad rejection, landing page issues)
 * - Account-level alerts (authorization revocation, billing)
 *
 * Signature verification uses TikTok's X-Webhook-Signature header
 * with HMAC-SHA256(webhookSecret, timestamp + "." + requestBody).
 */

import { createHmac, timingSafeEqual } from "crypto";
import type { Request, Response } from "express";
import { db } from "../db";
import { campaigns, ad_accounts, notifications, webhookEvents, ads } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../utils/logger";
import { createNotification } from "../services/notifications";

const TIKTOK_WEBHOOK_SECRET = process.env.TIKTOK_WEBHOOK_SECRET!;
const TIKTOK_APP_ID = process.env.TIKTOK_APP_ID!;

if (!TIKTOK_WEBHOOK_SECRET) {
  throw new Error("TIKTOK_WEBHOOK_SECRET environment variable is required");
}

/** ------------------------- Signature Verification ------------------------- */

/**
 * Verify TikTok webhook signature.
 *
 * TikTok signs webhooks using:
 *   signature = HMAC-SHA256(webhookSecret, timestamp + "." + requestBody)
 *
 * The X-Webhook-Signature header contains the hex digest.
 * The X-Webhook-Timestamp header contains the Unix timestamp (seconds).
 */
export function verifyTikTokSignature(
  payload: string | Buffer,
  signature: string,
  timestamp: string
): boolean {
  try {
    const message = `${timestamp}.${payload}`;
    const expected = createHmac("sha256", TIKTOK_WEBHOOK_SECRET)
      .update(message)
      .digest("hex");

    const sig = signature.toLowerCase();
    if (sig.length !== expected.length) return false;

    const sigBuf = Buffer.from(sig, "hex");
    const expBuf = Buffer.from(expected, "hex");
    return timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

/**
 * Validate timestamp is within acceptable window (5 minutes)
 * to prevent replay attacks.
 */
function isTimestampValid(timestamp: string): boolean {
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestamp, 10);
  return Math.abs(now - ts) <= 300;
}

/** ------------------------- Payload Types ------------------------- */

interface TikTokWebhookPayload {
  /** Event type identifier */
  event_type: string;
  /** Unix timestamp (seconds) */
  timestamp: number;
  /** Event payload — shape varies by event_type */
  data: Record<string, unknown>;
  /** Unique event ID for idempotency */
  event_id: string;
  /** Advertiser ID (account) */
  advertiser_id: string;
}

interface TikTokCampaignEvent {
  campaign_id: string;
  campaign_name: string;
  status: string;
  previous_status?: string;
  changed_fields?: string[];
  change_time: string;
  operator: string;         // "USER" | "SYSTEM"
  operator_id?: string;
}

interface TikTokBudgetAlert {
  campaign_id: string;
  campaign_name: string;
  alert_type: "DAILY_BUDGET_EXHAUSTED" | "LIFETIME_BUDGET_EXHAUSTED" | "BUDGET_80_PERCENT" | "BUDGET_90_PERCENT";
  budget: number;
  spend: number;
  currency: string;
  alert_time: string;
}

interface TikTokCreativeViolation {
  ad_id: string;
  ad_name: string;
  creative_id: string;
  violation_type: "POLICY" | "LANDING_PAGE" | "VIDEO" | "IMAGE" | "TEXT";
  policy_topic: string;
  policy_description: string;
  severity: "REJECT" | "WARN";
  appealable: boolean;
  /** Unix timestamp (seconds) */
  violation_time: number;
}

interface TikTokAccountAlert {
  alert_type: "AUTH_REVOKE" | "BILLING_ISSUE" | "ACCOUNT_REVIEW" | "PERMISSION_CHANGE";
  alert_time: string;
  details: Record<string, unknown>;
}

/** ------------------------- Event Handlers ------------------------- */

/**
 * Handle TikTok campaign status changes.
 */
async function handleCampaignChange(
  advertiserId: string,
  event: TikTokCampaignEvent
): Promise<void> {
  try {
    const localCampaign = await db
      .select({
        id: campaigns.id,
        workspaceId: campaigns.workspaceId,
        name: campaigns.name,
        status: campaigns.status,
      })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.platform, "tiktok"),
          eq(campaigns.platformCampaignId, event.campaign_id)
        )
      )
      .limit(1);

    if (localCampaign.length === 0) {
      logger.warn(
        { campaignId: event.campaign_id, advertiserId },
        "TikTok campaign not found in local DB"
      );
      return;
    }

    const campaign = localCampaign[0];
    const newStatus = mapTikTokStatus(event.status);

    // Update local state
    await db
      .update(campaigns)
      .set({
        status: newStatus,
        updated_at: new Date(),
      })
      .where(eq(campaigns.id, campaign.id));

    // Notify on significant changes
    if (newStatus !== campaign.status) {
      await createNotification({
        workspaceId: campaign.workspaceId ?? "default",
        type: "campaign_status_change",
        title: "TikTok Campaign Status Changed",
        message: `Campaign "${event.campaign_name}" is now ${event.status}${
          event.operator === "SYSTEM" ? " (auto-changed by TikTok)" : ""
        }`,
        priority: event.operator === "SYSTEM" ? "medium" : "low",
        metadata: {
          campaignId: campaign.id,
          tiktokCampaignId: event.campaign_id,
          previousStatus: event.previous_status,
          newStatus: event.status,
          operator: event.operator,
          operatorId: event.operator_id,
        },
      });
    }

    logger.info(
      { campaignId: event.campaign_id, status: event.status, operator: event.operator },
      "TikTok campaign status updated"
    );
  } catch (err) {
    logger.error({ err, campaignId: event.campaign_id }, "Failed to handle TikTok campaign change");
  }
}

/**
 * Handle TikTok budget alerts.
 */
async function handleBudgetAlert(
  advertiserId: string,
  alert: TikTokBudgetAlert
): Promise<void> {
  try {
    const localCampaign = await db
      .select({ id: campaigns.id, workspaceId: campaigns.workspaceId, name: campaigns.name })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.platform, "tiktok"),
          eq(campaigns.platformCampaignId, alert.campaign_id)
        )
      )
      .limit(1);

    const workspaceId = localCampaign[0]?.workspaceId ?? "default";
    const campaignName = localCampaign[0]?.name ?? alert.campaign_name;

    const priority = alert.alert_type.includes("EXHAUSTED")
      ? "high"
      : alert.alert_type.includes("90")
        ? "high"
        : "medium";

    await createNotification({
      workspaceId,
      type: "budget_alert",
      title: `TikTok Budget Alert — ${campaignName}`,
      message: `${campaignName} (${alert.currency}): ${alert.spend.toFixed(2)} / ${alert.budget.toFixed(2)} spent`,
      priority,
      metadata: {
        campaignId: alert.campaign_id,
        alertType: alert.alert_type,
        budget: alert.budget,
        spend: alert.spend,
        currency: alert.currency,
      },
    });

    // Update spend tracking
    if (localCampaign.length > 0) {
      await db
        .update(campaigns)
        .set({
          spend: String(alert.spend),
          budget: String(alert.budget),
          updated_at: new Date(),
        })
        .where(eq(campaigns.id, localCampaign[0].id));
    }

    logger.info(
      { campaignId: alert.campaign_id, alertType: alert.alert_type },
      "TikTok budget alert processed"
    );
  } catch (err) {
    logger.error({ err, alert }, "Failed to handle TikTok budget alert");
  }
}

/**
 * Handle TikTok creative policy violations (ad rejections).
 */
async function handleCreativeViolation(
  advertiserId: string,
  violation: TikTokCreativeViolation
): Promise<void> {
  try {
    const workspaceId = await resolveWorkspaceId("tiktok", advertiserId);

    // Update local ad status
    await db
      .update(ads)
      .set({
        status: violation.severity === "REJECT" ? "rejected" : "warning",
        policyViolations: violation.policy_description,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(ads.platform, "tiktok"),
          eq(ads.platformAdId, violation.ad_id)
        )
      );

    await createNotification({
      workspaceId,
      type: "policy_violation",
      title: `TikTok Ad ${violation.severity === "REJECT" ? "Rejected" : "Warning"}`,
      message: violation.policy_description,
      priority: violation.severity === "REJECT" ? "high" : "medium",
      metadata: {
        adId: violation.ad_id,
        adName: violation.ad_name,
        creativeId: violation.creative_id,
        violationType: violation.violation_type,
        policyTopic: violation.policy_topic,
        appealable: violation.appealable,
      },
    });

    logger.warn(
      { adId: violation.ad_id, severity: violation.severity },
      "TikTok creative violation processed"
    );
  } catch (err) {
    logger.error({ err, violation }, "Failed to handle TikTok creative violation");
  }
}

/**
 * Handle TikTok account-level alerts.
 */
async function handleAccountAlert(
  advertiserId: string,
  alert: TikTokAccountAlert
): Promise<void> {
  try {
    const workspaceId = await resolveWorkspaceId("tiktok", advertiserId);

    // Update account status for auth revokes
    if (alert.alert_type === "AUTH_REVOKE") {
      await db
      .update(ad_accounts)
      .set({
          status: "disconnected",
          updated_at: new Date(),
        })
        .where(
          and(
            eq(ad_accounts.platform, "tiktok"),
            eq(ad_accounts.platformAccountId, advertiserId)
          )
        );
    }

    const priority = alert.alert_type === "AUTH_REVOKE" ? "high" : "medium";

    const titleMap: Record<string, string> = {
      AUTH_REVOKE: "TikTok Authorization Revoked",
      BILLING_ISSUE: "TikTok Billing Issue",
      ACCOUNT_REVIEW: "TikTok Account Under Review",
      PERMISSION_CHANGE: "TikTok Permission Changed",
    };

    await createNotification({
      workspaceId,
      type: "account_alert",
      title: titleMap[alert.alert_type] ?? "TikTok Account Alert",
      message: JSON.stringify(alert.details),
      priority,
      metadata: {
        advertiserId,
        alertType: alert.alert_type,
        details: alert.details,
      },
    });

    logger.info(
      { advertiserId, alertType: alert.alert_type },
      "TikTok account alert processed"
    );
  } catch (err) {
    logger.error({ err, alert }, "Failed to handle TikTok account alert");
  }
}

/** ------------------------- Utility Functions ------------------------- */

/**
 * Map TikTok API status to internal status.
 */
function mapTikTokStatus(tiktokStatus: string): string {
  const statusMap: Record<string, string> = {
    ENABLE: "active",
    DISABLE: "paused",
    DELETE: "deleted",
    CAMPAIGN_STATUS_ENABLE: "active",
    CAMPAIGN_STATUS_DISABLE: "paused",
    CAMPAIGN_STATUS_DELETE: "deleted",
  };
  return statusMap[tiktokStatus] ?? tiktokStatus.toLowerCase();
}

async function resolveWorkspaceId(
  platform: string,
  platformAccountId: string
): Promise<string> {
  const account = await db
    .select({ workspaceId: ad_accounts.workspaceId })
    .from(ad_accounts)
    .where(
      and(
        eq(ad_accounts.platform, platform),
        eq(ad_accounts.platformAccountId, platformAccountId)
      )
    )
    .limit(1);

  return account[0]?.workspaceId ?? "default";
}

/** ------------------------- Main HTTP Handlers ------------------------- */

/**
 * GET /webhooks/tiktok
 *
 * TikTok webhook challenge verification.
 * TikTok sends a challenge code during webhook registration.
 */
export async function handleTikTokChallenge(req: Request, res: Response): Promise<void> {
  const challenge = req.query.challenge as string;
  const verifyToken = req.query.verify_token as string;
  const timestamp = req.query.timestamp as string;
  const signature = req.query.signature as string;

  // Validate challenge signature if provided
  if (signature && timestamp && challenge) {
    const message = `${timestamp}.${challenge}`;
    const expected = createHmac("sha256", TIKTOK_WEBHOOK_SECRET)
      .update(message)
      .digest("hex");

    if (!timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))) {
      logger.warn("TikTok challenge signature verification failed");
      res.status(403).send("Forbidden");
      return;
    }
  }

  if (verifyToken === TIKTOK_APP_ID) {
    logger.info("TikTok webhook challenge verified");
    res.status(200).json({ challenge });
    return;
  }

  logger.warn("TikTok webhook challenge failed");
  res.status(403).send("Forbidden");
}

/**
 * POST /webhooks/tiktok
 *
 * Main TikTok webhook handler.
 */
export async function handleTikTokWebhook(req: Request, res: Response): Promise<void> {
  // 1. Extract signature headers
  const signature = req.headers["x-webhook-signature"] as string;
  const timestamp = req.headers["x-webhook-timestamp"] as string;

  if (!signature || !timestamp) {
    logger.warn("TikTok webhook missing signature or timestamp");
    res.status(401).json({ error: "Missing signature headers" });
    return;
  }

  // 2. Verify timestamp (anti-replay)
  if (!isTimestampValid(timestamp)) {
    logger.warn("TikTok webhook timestamp outside valid window");
    res.status(401).json({ error: "Timestamp expired" });
    return;
  }

  // 3. Verify signature
  const rawBody = JSON.stringify(req.body);
  if (!verifyTikTokSignature(rawBody, signature, timestamp)) {
    logger.warn("TikTok webhook signature verification failed");
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  // 4. Acknowledge immediately
  res.status(200).json({ code: 0, message: "success" });

  // 5. Parse payload
  let payload: TikTokWebhookPayload;
  try {
    payload = req.body as TikTokWebhookPayload;
  } catch {
    logger.error("Failed to parse TikTok webhook payload");
    return;
  }

  logger.info(
    { eventType: payload.event_type, eventId: payload.event_id, advertiserId: payload.advertiser_id },
    "TikTok webhook received"
  );

  // 6. Idempotency check
  try {
    await db.insert(webhookEvents).values({
      id: crypto.randomUUID(),
      eventId: payload.event_id,
      platform: "tiktok",
      eventType: payload.event_type,
      payload: payload as unknown as Record<string, unknown>,
      receivedAt: new Date(payload.timestamp * 1000),
    });
  } catch {
    logger.info({ eventId: payload.event_id }, "Duplicate TikTok webhook event, skipping");
    return;
  }

  // 7. Route to handler
  const { event_type, data, advertiser_id } = payload;

  switch (event_type) {
    case "CAMPAIGN_STATUS_CHANGE":
      await handleCampaignChange(advertiser_id, data as unknown as TikTokCampaignEvent);
      break;

    case "BUDGET_ALERT":
      await handleBudgetAlert(advertiser_id, data as unknown as TikTokBudgetAlert);
      break;

    case "CREATIVE_VIOLATION":
    case "AD_REJECTION":
      await handleCreativeViolation(advertiser_id, data as unknown as TikTokCreativeViolation);
      break;

    case "ACCOUNT_ALERT":
      await handleAccountAlert(advertiser_id, data as unknown as TikTokAccountAlert);
      break;

    default:
      logger.debug({ eventType: event_type }, "Unhandled TikTok webhook event type");
  }
}
