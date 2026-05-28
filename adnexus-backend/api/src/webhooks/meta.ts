/**
 * Meta Marketing API Webhook Handler
 *
 * Handles webhooks from Meta (Facebook/Instagram) Marketing API:
 * - Leadgen (new lead submissions)
 * - Ad account updates (spend cap changes, account status)
 * - Campaign updates (status changes initiated from Meta platform)
 * - Adset and ad-level changes
 *
 * All webhooks verify X-Hub-Signature-256 before processing.
 */

import { createHmac, timingSafeEqual } from "crypto";
import type { Request, Response } from "express";
import { db } from "../db";
import { campaigns, leads, ad_accounts, notifications, webhookEvents } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../utils/logger";
import { createNotification } from "../services/notifications";

const APP_SECRET = process.env.META_APP_SECRET!;

if (!APP_SECRET) {
  throw new Error("META_APP_SECRET environment variable is required");
}

/** ------------------------- Signature Verification ------------------------- */

/**
 * Verify Meta webhook X-Hub-Signature-256 header.
 *
 * Meta signs payloads using HMAC-SHA256(AppSecret, payloadBody).
 * The signature header format: "sha256=<hex_digest>"
 */
export function verifyMetaSignature(
  payload: string | Buffer,
  signature: string
): boolean {
  try {
    const expected = createHmac("sha256", APP_SECRET).update(payload).digest("hex");
    const sig = signature.replace("sha256=", "");

    if (sig.length !== expected.length) return false;

    const sigBuf = Buffer.from(sig, "hex");
    const expBuf = Buffer.from(expected, "hex");
    return timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

/** ------------------------- Webhook Event Handlers ------------------------- */

interface MetaWebhookEntry {
  id: string;               // Page ID / Ad Account ID
  time: number;
  changes?: MetaChange[];
  messaging?: unknown[];     // Messenger events (not handled here)
  leads?: LeadgenData[];
}

interface MetaChange {
  field: string;
  value: Record<string, unknown>;
}

interface LeadgenData {
  leadgen_id: string;
  page_id: string;
  form_id: string;
  created_time: number;
  field_data: Array<{ name: string; values: string[] }>;
}

interface LeadgenEvent {
  object: "page" | "user" | "permissions" | "instagram";
  entry: MetaWebhookEntry[];
}

/**
 * Process a single leadgen entry from Meta.
 * Stores the lead in the leads table and creates a notification.
 */
async function handleLeadgen(entry: MetaWebhookEntry): Promise<void> {
  const leadsData = entry.leads ?? [];

  for (const lead of leadsData) {
    try {
      // Check for duplicate lead
      const existing = await db
        .select({ id: leads.id })
        .from(leads)
        .where(eq(leads.platformLeadId, lead.leadgen_id))
        .limit(1);

      if (existing.length > 0) {
        logger.info({ leadgenId: lead.leadgen_id }, "Duplicate leadgen event, skipping");
        continue;
      }

      // Extract lead fields
      const fieldData = lead.field_data;
      const getField = (name: string): string | undefined =>
        fieldData.find((f) => f.name === name)?.values[0];

      // Resolve campaign from form_id -> ad -> campaign mapping
      const formCampaign = await db
        .select({ campaignId: campaigns.id, workspaceId: campaigns.workspaceId })
        .from(campaigns)
        .where(
          and(
            eq(campaigns.platform, "meta"),
            eq(campaigns.leadFormId, lead.form_id)
          )
        )
        .limit(1);

      const campaignId = formCampaign[0]?.campaignId ?? null;
      const workspaceId = formCampaign[0]?.workspaceId ?? "default";

      // Insert lead record
      await db.insert(leads).values({ id: crypto.randomUUID() as string,
        platform: "meta",
        platformLeadId: lead.leadgen_id,
        campaignId,
        workspaceId,
        formId: lead.form_id,
        pageId: lead.page_id,
        fullName: getField("full_name") ?? getField("name"),
        email: getField("email"),
        phone: getField("phone_number"),
        city: getField("city"),
        country: getField("country"),
        zipCode: getField("zip_code"),
        streetAddress: getField("street_address"),
        customAnswers: fieldData.reduce<Record<string, string>>((acc, f) => {
          if (!["full_name", "name", "email", "phone_number", "city", "country", "zip_code", "street_address"].includes(f.name)) {
            acc[f.name] = f.values[0];
          }
          return acc;
        }, {}),
        rawPayload: lead as unknown as Record<string, unknown>,
        status: "new",
        created_at: new Date(lead.created_time * 1000),
        updated_at: new Date(),
      });

      // Notify workspace members
      await createNotification({
        workspaceId,
        type: "lead_new",
        title: "New Meta Lead",
        message: `Lead received from form ${lead.form_id}`,
        metadata: { leadgenId: lead.leadgen_id, formId: lead.form_id, campaignId },
      });

      logger.info({ leadgenId: lead.leadgen_id }, "Meta leadgen processed");
    } catch (err) {
      logger.error({ err, leadgenId: lead.leadgen_id }, "Failed to process leadgen");
    }
  }
}

/**
 * Handle ad account-level changes from Meta.
 * Updates: spend cap, account status, disable reason, etc.
 */
async function handleAccountChange(
  accountId: string,
  change: MetaChange
): Promise<void> {
  const { field, value } = change;

  try {
    switch (field) {
      case "account_spending_limit": {
        await db
          .update(ad_accounts)
          .set({
            spendCap: value.new_spend_limit as string,
            updated_at: new Date(),
          })
          .where(
            and(
              eq(ad_accounts.platform, "meta"),
              eq(ad_accounts.platformAccountId, accountId)
            )
          );

        logger.info({ accountId, newLimit: value.new_spend_limit }, "Meta account spend cap updated");
        break;
      }

      case "account_status": {
        await db
          .update(ad_accounts)
          .set({
            status: value.status as string,
            updated_at: new Date(),
          })
          .where(
            and(
              eq(ad_accounts.platform, "meta"),
              eq(ad_accounts.platformAccountId, accountId)
            )
          );

        await createNotification({
          workspaceId: "default", // resolved below
          type: "account_status_change",
          title: "Meta Account Status Changed",
          message: `Account ${accountId} is now ${value.status}`,
          metadata: { accountId, status: value.status, reason: value.disable_reason },
        });

        logger.info({ accountId, status: value.status }, "Meta account status updated");
        break;
      }

      case "disable_reason": {
        await db
          .update(ad_accounts)
          .set({
            status: "disabled",
            disabledReason: value.reason as string,
            updated_at: new Date(),
          })
          .where(
            and(
              eq(ad_accounts.platform, "meta"),
              eq(ad_accounts.platformAccountId, accountId)
            )
          );

        await createNotification({
          workspaceId: "default",
          type: "account_disabled",
          title: "Meta Account Disabled",
          message: `Account ${accountId} disabled: ${value.reason}`,
          priority: "high",
          metadata: { accountId, reason: value.reason },
        });

        logger.warn({ accountId, reason: value.reason }, "Meta account disabled");
        break;
      }

      default:
        logger.debug({ accountId, field, value }, "Unhandled Meta account change field");
    }
  } catch (err) {
    logger.error({ err, accountId, field }, "Failed to handle Meta account change");
  }
}

/**
 * Handle campaign-level changes from Meta.
 * Updates campaign status, budget, name changes initiated on Meta platform.
 */
async function handleCampaignChange(
  accountId: string,
  change: MetaChange
): Promise<void> {
  const { field, value } = change;

  try {
    const campaignId = value.campaign_id as string | undefined;
    if (!campaignId) {
      logger.warn({ field, value }, "Meta campaign change missing campaign_id");
      return;
    }

    // Resolve workspace from account mapping
    const accountRecord = await db
      .select({ workspaceId: ad_accounts.workspaceId })
      .from(ad_accounts)
      .where(
        and(
          eq(ad_accounts.platform, "meta"),
          eq(ad_accounts.platformAccountId, accountId)
        )
      )
      .limit(1);

    const workspaceId = accountRecord[0]?.workspaceId ?? "default";

    switch (field) {
      case "campaign_status": {
        const newStatus = value.status as string;

        await db
          .update(campaigns)
          .set({
            status: newStatus,
            updated_at: new Date(),
          })
          .where(
            and(
              eq(campaigns.platform, "meta"),
              eq(campaigns.platformCampaignId, campaignId)
            )
          );

        await createNotification({
          workspaceId,
          type: "campaign_status_change",
          title: "Meta Campaign Status Changed",
          message: `Campaign ${campaignId} is now ${newStatus}`,
          metadata: { campaignId, status: newStatus, accountId },
        });

        logger.info({ campaignId, status: newStatus }, "Meta campaign status updated");
        break;
      }

      case "campaign_budget": {
        const budget = value.new_budget as string;

        await db
          .update(campaigns)
          .set({
            budget: budget,
            budgetType: value.budget_type as string,
            updated_at: new Date(),
          })
          .where(
            and(
              eq(campaigns.platform, "meta"),
              eq(campaigns.platformCampaignId, campaignId)
            )
          );

        logger.info({ campaignId, budget }, "Meta campaign budget updated");
        break;
      }

      case "campaign_name": {
        await db
          .update(campaigns)
          .set({
            name: value.new_name as string,
            updated_at: new Date(),
          })
          .where(
            and(
              eq(campaigns.platform, "meta"),
              eq(campaigns.platformCampaignId, campaignId)
            )
          );

        logger.info({ campaignId, name: value.new_name }, "Meta campaign name updated");
        break;
      }

      default:
        logger.debug({ campaignId, field, value }, "Unhandled Meta campaign change field");
    }
  } catch (err) {
    logger.error({ err, accountId, field, value }, "Failed to handle Meta campaign change");
  }
}

/** ------------------------- Main HTTP Handlers ------------------------- */

/**
 * GET /webhooks/meta
 *
 * Meta webhook subscription verification (challenge-response).
 * Called when setting up the webhook subscription in Meta App Dashboard.
 */
export async function handleMetaChallenge(req: Request, res: Response): Promise<void> {
  const mode = req.query["hub.mode"] as string;
  const token = req.query["hub.verify_token"] as string;
  const challenge = req.query["hub.challenge"] as string;

  const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN!;

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    logger.info("Meta webhook challenge verified");
    res.status(200).send(challenge);
    return;
  }

  logger.warn({ mode, token }, "Meta webhook challenge failed");
  res.status(403).send("Forbidden");
}

/**
 * POST /webhooks/meta
 *
 * Main Meta webhook handler. Processes all inbound webhook events.
 * Returns 200 immediately to avoid blocking Meta's delivery.
 */
export async function handleMetaWebhook(req: Request, res: Response): Promise<void> {
  // 1. Verify signature
  const signature = req.headers["x-hub-signature-256"] as string;
  if (!signature) {
    logger.warn("Meta webhook missing signature");
    res.status(401).json({ error: "Missing signature" });
    return;
  }

  const rawBody = req.body as Buffer;
  if (!verifyMetaSignature(rawBody, signature)) {
    logger.warn("Meta webhook signature verification failed");
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  // 2. Acknowledge quickly — don't block delivery
  res.status(200).json({ received: true });

  // 3. Parse payload
  let payload: LeadgenEvent;
  try {
    payload = JSON.parse(rawBody.toString()) as LeadgenEvent;
  } catch {
    logger.error("Failed to parse Meta webhook payload");
    return;
  }

  logger.info({ object: payload.object, entries: payload.entry?.length }, "Meta webhook received");

  // 4. Process entries asynchronously
  for (const entry of payload.entry ?? []) {
    // Log webhook event for idempotency
    const eventId = `${entry.id}-${entry.time}`;
    try {
      await db.insert(webhookEvents).values({ id: crypto.randomUUID() as string,
        eventId,
        platform: "meta",
        payload: entry as unknown as Record<string, unknown>,
        receivedAt: new Date(),
      });
    } catch {
      // Duplicate event — skip processing
      logger.info({ eventId }, "Duplicate Meta webhook event, skipping");
      continue;
    }

    // Leadgen events (object === "page")
    if (payload.object === "page" && entry.leads) {
      await handleLeadgen(entry);
      continue;
    }

    // Ad account / campaign changes (object === "user" for permissions, custom subscriptions)
    if (entry.changes) {
      for (const change of entry.changes) {
        const isAccountField = [
          "account_spending_limit",
          "account_status",
          "disable_reason",
        ].includes(change.field);

        const isCampaignField = [
          "campaign_status",
          "campaign_budget",
          "campaign_name",
        ].includes(change.field);

        if (isAccountField) {
          await handleAccountChange(entry.id, change);
        } else if (isCampaignField) {
          await handleCampaignChange(entry.id, change);
        } else {
          logger.debug({ field: change.field }, "Unhandled Meta change field");
        }
      }
    }
  }
}
