/**
 * Snap Marketing API Webhook Handler
 *
 * Handles webhooks from Snapchat Marketing API:
 * - Campaign status changes (ACTIVE → PAUSED, ARCHIVED, etc.)
 * - Account alerts (spending limit, billing, policy)
 * - Creative reviews (ad approval/rejection)
 * - Organization-level events
 *
 * Snap sends webhooks via their Snap App configuration.
 * Signature verification uses HMAC-SHA256(appSecret, requestBody).
 */

import { createHmac, timingSafeEqual } from "crypto";
import type { Request, Response } from "express";
import { db } from "../db";
import { campaigns, ad_accounts, webhookEvents, ads } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../utils/logger";
import { createNotification } from "../services/notifications";

const SNAP_APP_SECRET = process.env.SNAP_APP_SECRET!;

if (!SNAP_APP_SECRET) {
  throw new Error("SNAP_APP_SECRET environment variable is required");
}

/** ------------------------- Signature Verification ------------------------- */

/**
 * Verify Snap webhook signature.
 *
 * Snap signs webhook payloads using:
 *   signature = HMAC-SHA256(appSecret, requestBody)
 *
 * The signature is sent in the X-Snap-Signature header as a hex digest.
 */
export function verifySnapSignature(
  payload: string | Buffer,
  signature: string
): boolean {
  try {
    const expected = createHmac("sha256", SNAP_APP_SECRET)
      .update(payload)
      .digest("hex");

    const sig = signature.toLowerCase().replace("sha256=", "");
    if (sig.length !== expected.length) return false;

    const sigBuf = Buffer.from(sig, "hex");
    const expBuf = Buffer.from(expected, "hex");
    return timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

/** ------------------------- Payload Types ------------------------- */

interface SnapWebhookEvent {
  /** Event identifier */
  event_id: string;
  /** Event type */
  event_type: SnapEventType;
  /** Organization ID */
  organization_id: string;
  /** Ad account ID */
  ad_account_id?: string;
  /** Unix timestamp (seconds) */
  created_at: number;
  /** Event-specific payload */
  data: Record<string, unknown>;
}

type SnapEventType =
  | "CAMPAIGN_STATUS_CHANGE"
  | "CAMPAIGN_SPEND_LIMIT_REACHED"
  | "AD_ACCOUNT_STATUS_CHANGE"
  | "AD_REVIEW_COMPLETED"
  | "AD_REJECTION"
  | "BILLING_ALERT"
  | "POLICY_VIOLATION"
  | "SPENDING_LIMIT_ALERT"
  | "MEDIA_REVIEW_COMPLETED"
  | "PIXEL_EVENT";

interface SnapCampaignEvent {
  campaign_id: string;
  campaign_name: string;
  status: string;
  previous_status?: string;
  updated_at: string;
  updated_by: string;       // "user:<id>" | "system"
  daily_budget_micro?: number;
  lifetime_budget_micro?: number;
  changed_fields?: string[];
}

interface SnapAdAccountEvent {
  status: string;
  previous_status?: string;
  disable_reason?: string;
  spending_limit_micro?: number;
  updated_at: string;
}

interface SnapCreativeReviewEvent {
  ad_id: string;
  ad_name: string;
  creative_id: string;
  review_status: "APPROVED" | "REJECTED" | "PENDING";
  rejection_reasons?: Array<{
    policy_topic: string;
    description: string;
    severity: "ERROR" | "WARN";
  }>;
  reviewed_at: string;
  reviewed_by: string;
}

interface SnapSpendingLimitAlert {
  limit_type: "ACCOUNT" | "CAMPAIGN" | "AD_SQUAD";
  limit_micro: number;
  spent_micro: number;
  currency: string;
  threshold?: "80" | "90" | "100";
}

interface SnapBillingAlert {
  alert_type: "PAYMENT_FAILED" | "BILLING_THRESHOLD_REACHED" | "INVOICE_READY";
  amount_micro?: number;
  currency?: string;
  details?: Record<string, unknown>;
}

/** ------------------------- Event Handlers ------------------------- */

/**
 * Handle Snap campaign status changes.
 */
async function handleCampaignChange(
  event: SnapWebhookEvent,
  campaignData: SnapCampaignEvent
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
          eq(campaigns.platform, "snap"),
          eq(campaigns.platformCampaignId, campaignData.campaign_id)
        )
      )
      .limit(1);

    if (localCampaign.length === 0) {
      logger.warn(
        { campaignId: campaignData.campaign_id, orgId: event.organization_id },
        "Snap campaign not found in local DB"
      );
      return;
    }

    const campaign = localCampaign[0];
    const newStatus = mapSnapStatus(campaignData.status);
    const changedBy = campaignData.updated_by.startsWith("system")
      ? "Snap system"
      : campaignData.updated_by;

    // Build update object
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date(),
    };

    if (campaignData.daily_budget_micro) {
      updateData.dailyBudget = String(
        campaignData.daily_budget_micro / 1_000_000
      );
    }
    if (campaignData.lifetime_budget_micro) {
      updateData.lifetimeBudget = String(
        campaignData.lifetime_budget_micro / 1_000_000
      );
    }

    await db
      .update(campaigns)
      .set(updateData)
      .where(eq(campaigns.id, campaign.id));

    // Notify if status changed externally
    if (newStatus !== campaign.status) {
      const isSystemChange = campaignData.updated_by.startsWith("system");
      await createNotification({
        workspaceId: campaign.workspaceId ?? '',
        type: "campaign_status_change",
        title: "Snap Campaign Status Changed",
        message: `Campaign "${campaignData.campaign_name}" is now ${campaignData.status}${
          isSystemChange ? " (auto-changed by Snap)" : ` by ${changedBy}`
        }`,
        priority: isSystemChange ? "medium" : "low",
        metadata: {
          campaignId: campaign.id,
          snapCampaignId: campaignData.campaign_id,
          previousStatus: campaignData.previous_status,
          newStatus: campaignData.status,
          changedBy: campaignData.updated_by,
          changedFields: campaignData.changed_fields,
        },
      });
    }

    logger.info(
      { campaignId: campaignData.campaign_id, status: campaignData.status },
      "Snap campaign status updated"
    );
  } catch (err) {
    logger.error(
      { err, campaignId: campaignData.campaign_id },
      "Failed to handle Snap campaign change"
    );
  }
}

/**
 * Handle Snap ad account status changes.
 */
async function handleAccountChange(
  event: SnapWebhookEvent,
  accountData: SnapAdAccountEvent
): Promise<void> {
  try {
    const adAccountId = event.ad_account_id;
    if (!adAccountId) {
      logger.warn({ orgId: event.organization_id }, "Snap account event missing ad_account_id");
      return;
    }

    await db
      .update(ad_accounts)
      .set({
        status: accountData.status,
        disabledReason: accountData.disable_reason ?? null,
        spendCap: accountData.spending_limit_micro
          ? String(accountData.spending_limit_micro / 1_000_000)
          : undefined,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(ad_accounts.platform, "snap"),
          eq(ad_accounts.platformAccountId, adAccountId)
        )
      );

    const workspaceId = await resolveWorkspaceId("snap", adAccountId);

    if (accountData.status === "DISABLED" || accountData.status === "ARCHIVED") {
      await createNotification({
        workspaceId,
        type: "account_status_change",
        title: "Snap Account Status Changed",
        message: `Account ${adAccountId} is now ${accountData.status}${
          accountData.disable_reason ? `: ${accountData.disable_reason}` : ""
        }`,
        priority: "high",
        metadata: {
          adAccountId,
          status: accountData.status,
          disableReason: accountData.disable_reason,
          organizationId: event.organization_id,
        },
      });
    }

    logger.info(
      { adAccountId, status: accountData.status },
      "Snap account status updated"
    );
  } catch (err) {
    logger.error({ err, event }, "Failed to handle Snap account change");
  }
}

/**
 * Handle Snap creative review events (ad approval / rejection).
 */
async function handleCreativeReview(
  event: SnapWebhookEvent,
  review: SnapCreativeReviewEvent
): Promise<void> {
  try {
    const isRejected = review.review_status === "REJECTED";

    // Update local ad status
    await db
      .update(ads)
      .set({
        status: isRejected ? "rejected" : "active",
        reviewStatus: review.review_status,
        policyViolations: isRejected
          ? review.rejection_reasons
              ?.map((r) => `${r.policy_topic}: ${r.description}`)
              .join("; ")
          : null,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(ads.platform, "snap"),
          eq(ads.platformAdId, review.ad_id)
        )
      );

    if (isRejected && review.rejection_reasons) {
      const workspaceId = await resolveWorkspaceId(
        "snap",
        event.ad_account_id ?? ""
      );

      await createNotification({
        workspaceId,
        type: "creative_rejected",
        title: `Snap Ad Rejected — ${review.ad_name}`,
        message: review.rejection_reasons
          .map((r) => r.description)
          .join("; "),
        priority: "high",
        metadata: {
          adId: review.ad_id,
          adName: review.ad_name,
          creativeId: review.creative_id,
          rejectionReasons: review.rejection_reasons,
          reviewedBy: review.reviewed_by,
        },
      });
    }

    logger.info(
      { adId: review.ad_id, status: review.review_status },
      "Snap creative review processed"
    );
  } catch (err) {
    logger.error({ err, review }, "Failed to handle Snap creative review");
  }
}

/**
 * Handle Snap spending limit alerts.
 */
async function handleSpendingLimitAlert(
  event: SnapWebhookEvent,
  alert: SnapSpendingLimitAlert
): Promise<void> {
  try {
    const workspaceId = event.ad_account_id
      ? await resolveWorkspaceId("snap", event.ad_account_id)
      : "default";

    const spent = alert.spent_micro / 1_000_000;
    const limit = alert.limit_micro / 1_000_000;
    const pct = Math.round((spent / limit) * 100);

    const priority = alert.threshold === "100" ? "high" : "medium";

    await createNotification({
      workspaceId,
      type: "budget_alert",
      title: `Snap Spending Alert — ${alert.limit_type}`,
      message: `${alert.limit_type}: ${spent.toFixed(2)} / ${limit.toFixed(2)} ${alert.currency} (${pct}%)`,
      priority,
      metadata: {
        limitType: alert.limit_type,
        limitMicro: alert.limit_micro,
        spentMicro: alert.spent_micro,
        currency: alert.currency,
        threshold: alert.threshold,
        adAccountId: event.ad_account_id,
      },
    });

    logger.info(
      { limitType: alert.limit_type, threshold: alert.threshold },
      "Snap spending limit alert processed"
    );
  } catch (err) {
    logger.error({ err, alert }, "Failed to handle Snap spending limit alert");
  }
}

/**
 * Handle Snap billing alerts.
 */
async function handleBillingAlert(
  event: SnapWebhookEvent,
  alert: SnapBillingAlert
): Promise<void> {
  try {
    const workspaceId = event.ad_account_id
      ? await resolveWorkspaceId("snap", event.ad_account_id)
      : "default";

    const titleMap: Record<string, string> = {
      PAYMENT_FAILED: "Snap Payment Failed",
      BILLING_THRESHOLD_REACHED: "Snap Billing Threshold Reached",
      INVOICE_READY: "Snap Invoice Ready",
    };

    const priority = alert.alert_type === "PAYMENT_FAILED" ? "high" : "medium";

    await createNotification({
      workspaceId,
      type: "billing_alert",
      title: titleMap[alert.alert_type] ?? "Snap Billing Alert",
      message: alert.details
        ? JSON.stringify(alert.details)
        : `Alert: ${alert.alert_type}`,
      priority,
      metadata: {
        alertType: alert.alert_type,
        amountMicro: alert.amount_micro,
        currency: alert.currency,
        details: alert.details,
        adAccountId: event.ad_account_id,
      },
    });

    logger.info(
      { alertType: alert.alert_type, adAccountId: event.ad_account_id },
      "Snap billing alert processed"
    );
  } catch (err) {
    logger.error({ err, alert }, "Failed to handle Snap billing alert");
  }
}

/** ------------------------- Utility Functions ------------------------- */

/**
 * Map Snap API status to internal status enum.
 */
function mapSnapStatus(snapStatus: string): string {
  const statusMap: Record<string, string> = {
    ACTIVE: "active",
    PAUSED: "paused",
    ARCHIVED: "archived",
    DELETED: "deleted",
    DRAFT: "draft",
    PENDING_REVIEW: "pending_review",
    REJECTED: "rejected",
  };
  return statusMap[snapStatus] ?? snapStatus.toLowerCase();
}

async function resolveWorkspaceId(
  platform: string,
  platformAccountId: string
): Promise<string> {
  if (!platformAccountId) return "default";

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
 * GET /webhooks/snap
 *
 * Snap webhook challenge verification.
 */
export async function handleSnapChallenge(req: Request, res: Response): Promise<void> {
  const challenge = req.query.challenge as string;
  const verifyToken = req.query.verify_token as string;

  if (verifyToken === SNAP_APP_SECRET) {
    logger.info("Snap webhook challenge verified");
    res.status(200).send(challenge ?? "ok");
    return;
  }

  logger.warn("Snap webhook challenge failed");
  res.status(403).send("Forbidden");
}

/**
 * POST /webhooks/snap
 *
 * Main Snap webhook handler.
 */
export async function handleSnapWebhook(req: Request, res: Response): Promise<void> {
  // 1. Verify signature
  const signature = req.headers["x-snap-signature"] as string;
  if (!signature) {
    logger.warn("Snap webhook missing signature");
    res.status(401).json({ error: "Missing signature" });
    return;
  }

  const rawBody = req.body as Buffer;
  if (!verifySnapSignature(rawBody, signature)) {
    logger.warn("Snap webhook signature verification failed");
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  // 2. Acknowledge immediately
  res.status(200).json({ received: true });

  // 3. Parse payload
  let payload: SnapWebhookEvent;
  try {
    payload = JSON.parse(rawBody.toString()) as SnapWebhookEvent;
  } catch {
    logger.error("Failed to parse Snap webhook payload");
    return;
  }

  logger.info(
    { eventType: payload.event_type, eventId: payload.event_id, orgId: payload.organization_id },
    "Snap webhook received"
  );

  // 4. Idempotency check
  try {
    await db.insert(webhookEvents).values({ id: crypto.randomUUID() as string,
      eventId: payload.event_id,
      platform: "snap",
      eventType: payload.event_type,
      payload: payload as unknown as Record<string, unknown>,
      receivedAt: new Date(payload.created_at * 1000),
    });
  } catch {
    logger.info({ eventId: payload.event_id }, "Duplicate Snap webhook event, skipping");
    return;
  }

  // 5. Route to handler
  const { event_type, data } = payload;

  switch (event_type) {
    case "CAMPAIGN_STATUS_CHANGE":
    case "CAMPAIGN_SPEND_LIMIT_REACHED":
      await handleCampaignChange(
        payload,
        data as unknown as SnapCampaignEvent
      );
      break;

    case "AD_ACCOUNT_STATUS_CHANGE":
      await handleAccountChange(payload, data as unknown as SnapAdAccountEvent);
      break;

    case "AD_REVIEW_COMPLETED":
    case "AD_REJECTION":
      await handleCreativeReview(
        payload,
        data as unknown as SnapCreativeReviewEvent
      );
      break;

    case "SPENDING_LIMIT_ALERT":
      await handleSpendingLimitAlert(
        payload,
        data as unknown as SnapSpendingLimitAlert
      );
      break;

    case "BILLING_ALERT":
      await handleBillingAlert(payload, data as unknown as SnapBillingAlert);
      break;

    default:
      logger.debug({ eventType: event_type }, "Unhandled Snap webhook event type");
  }
}
