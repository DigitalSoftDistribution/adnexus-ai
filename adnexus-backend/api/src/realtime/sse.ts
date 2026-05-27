// ============================================
// AdNexus AI — Server-Sent Events Real-Time System
// ============================================
// Provides workspace-scoped live dashboard updates over
// persistent HTTP connections with automatic heartbeat pings,
// connection management, and typed event broadcasting.
//
// Usage:
//   import { sseRouter, broadcastToWorkspace, notifyDraftUpdate } from './realtime/sse';
//   app.use('/api/v1/realtime', sseRouter);
//   notifyDraftUpdate(workspaceId, draft);

import { Request, Response, Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { ForbiddenError, ValidationError } from '../lib/errors';
import type { Draft, AutomationRule, UnifiedCampaign, PerformanceGoal } from '../types';
import type { Notification } from '../services/notification-service';

// ─── Type Aliases ───────────────────────────────────────────

type Campaign = UnifiedCampaign;
type Goal = PerformanceGoal;

/** Result payload from a metrics synchronisation job */
export interface SyncResult {
  campaignsUpdated: number;
  adsetsUpdated: number;
  adsUpdated: number;
  errors?: string[];
  startedAt: string;
  completedAt: string;
}

/** SSE event envelope — every event carries this shape */
export interface SSEEvent {
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// ─── Client Management ──────────────────────────────────────

/** A single connected SSE client */
interface SSEClient {
  id: string;
  userId: string;
  workspaceId: string;
  response: Response;
  connectedAt: Date;
  lastPing: Date;
}

/** Active client connections keyed by client ID */
const clients: Map<string, SSEClient> = new Map();

/** Server uptime anchor */
const serverStartedAt = Date.now();

/** Heartbeat interval handle */
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

// ─── Constants ──────────────────────────────────────────────

const HEARTBEAT_INTERVAL_MS = 30_000;   // 30 s
const CLIENT_TIMEOUT_MS = 120_000;      // 2 min
const SSE_RETRY_MS = 5000;              // advise client to retry after 5 s

// ─── Helpers ────────────────────────────────────────────────

/** Generate a cryptographically-random client ID */
function generateClientId(): string {
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Send a single SSE event to a response stream */
function sendSSE(res: Response, event: SSEEvent, eventId?: string): void {
  try {
    if (eventId) res.write(`id: ${eventId}\n`);
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  } catch {
    // Stream already closed — ignore
  }
}

/** Send an SSE comment (ping) to keep the connection alive */
function sendPing(res: Response): void {
  try {
    res.write(':ping\n\n');
  } catch {
    // Stream already closed — ignore
  }
}

/** Verify the authenticated user is a member of the requested workspace */
async function validateWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  return !error && !!data;
}

// ─── Router ─────────────────────────────────────────────────

export const sseRouter = Router();

// ─── SSE Subscription Endpoint ──────────────────────────────

/**
 * GET /api/v1/realtime/events
 * Subscribe to real-time events for a workspace.
 *
 * Headers : Authorization: Bearer {jwt}
 * Query   : workspace_id (required)
 *
 * Returns : text/event-stream
 */
sseRouter.get('/events', authenticateToken, async (req: Request, res: Response) => {
  // 1. Validate workspace_id
  const workspaceId = req.query.workspace_id as string;
  if (!workspaceId || typeof workspaceId !== 'string') {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'workspace_id query parameter is required' },
    });
    return;
  }

  // 2. Verify user has access to the workspace
  const userId = req.user!.sub;
  const hasAccess = await validateWorkspaceAccess(userId, workspaceId);
  if (!hasAccess) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Not a member of this workspace' },
    });
    return;
  }

  // 3. Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');          // disable nginx buffering
  res.writeHead(200);

  // 4. Generate client ID and store connection
  const clientId = generateClientId();
  const now = new Date();

  const client: SSEClient = {
    id: clientId,
    userId,
    workspaceId,
    response: res,
    connectedAt: now,
    lastPing: now,
  };

  clients.set(clientId, client);

  // 5. Send retry hint
  res.write(`retry: ${SSE_RETRY_MS}\n\n`);

  // 6. Send initial connection event
  sendSSE(
    res,
    {
      type: 'connected',
      timestamp: now.toISOString(),
      data: { clientId, workspaceId, connectedAt: now.toISOString() },
    },
    Date.now().toString(),
  );

  // 7. Handle client disconnect
  const onClose = () => {
    clients.delete(clientId);
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[SSE] Client ${clientId} disconnected. Total clients: ${clients.size}`);
    }
  };

  req.on('close', onClose);
  req.on('end', onClose);
  req.on('error', onClose);

  // 8. Start heartbeat on first client if not already running
  if (!heartbeatTimer) {
    startHeartbeat();
  }

  // eslint-disable-next-line no-console
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[SSE] Client ${clientId} connected (workspace: ${workspaceId}). Total clients: ${clients.size}`);
  }
});

// ─── Event Broadcasting ─────────────────────────────────────

/** Send an event to every connected client in a workspace */
export function broadcastToWorkspace(workspaceId: string, event: SSEEvent): void {
  const payload: SSEEvent = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  };
  const eventId = Date.now().toString();

  for (const client of clients.values()) {
    if (client.workspaceId === workspaceId) {
      sendSSE(client.response, payload, eventId);
    }
  }
}

/** Send an event to every connection owned by a specific user */
export function broadcastToUser(userId: string, event: SSEEvent): void {
  const payload: SSEEvent = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  };
  const eventId = Date.now().toString();

  for (const client of clients.values()) {
    if (client.userId === userId) {
      sendSSE(client.response, payload, eventId);
    }
  }
}

/** Send an event to every connected client (across all workspaces) */
export function broadcastGlobal(event: SSEEvent): void {
  const payload: SSEEvent = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  };
  const eventId = Date.now().toString();

  for (const client of clients.values()) {
    sendSSE(client.response, payload, eventId);
  }
}

// ─── Typed Event Senders ────────────────────────────────────

/** Notify workspace that a draft has been updated */
export function notifyDraftUpdate(workspaceId: string, draft: Draft): void {
  broadcastToWorkspace(workspaceId, {
    type: 'draft_updated',
    timestamp: new Date().toISOString(),
    data: {
      draft: {
        id: draft.id,
        status: draft.status,
        change_summary: draft.change_summary,
        campaign_id: draft.campaign_id,
        campaign_name: draft.campaign_name,
        draft_type: draft.draft_type,
        actor_type: draft.actor_type,
        actor_name: draft.actor_name,
        scheduled_at: draft.scheduled_at,
        created_at: draft.created_at,
      },
    },
  });
}

/** Notify workspace that campaign metrics have changed */
export function notifyCampaignUpdate(workspaceId: string, campaign: Partial<Campaign>): void {
  broadcastToWorkspace(workspaceId, {
    type: 'campaign_updated',
    timestamp: new Date().toISOString(),
    data: {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        spend: campaign.spend,
        roas: campaign.roas,
        cpa: campaign.cpa,
        ctr: campaign.ctr,
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        conversions: campaign.conversions,
        daily_budget: campaign.daily_budget,
        lifetime_budget: campaign.lifetime_budget,
        budget_type: campaign.budget_type,
        platform: campaign.platform,
      },
    },
  });
}

/** Notify a user that they have a new notification */
export function notifyNewNotification(
  workspaceId: string,
  userId: string,
  notification: Notification,
): void {
  broadcastToWorkspace(workspaceId, {
    type: 'new_notification',
    timestamp: new Date().toISOString(),
    data: {
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        status: notification.status,
        created_at: notification.created_at,
      },
      userId,
      unreadCount: 0, // consumers should call GET /notifications/unread-count
    },
  });
}

/** Notify workspace that an automation rule fired */
export function notifyRuleTriggered(
  workspaceId: string,
  rule: AutomationRule,
  draft: Draft,
): void {
  broadcastToWorkspace(workspaceId, {
    type: 'rule_triggered',
    timestamp: new Date().toISOString(),
    data: {
      rule: {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        status: rule.status,
        platforms: rule.platforms,
      },
      draft: {
        id: draft.id,
        change_summary: draft.change_summary,
        draft_type: draft.draft_type,
        campaign_id: draft.campaign_id,
        campaign_name: draft.campaign_name,
      },
    },
  });
}

/** Notify workspace that a performance goal is at risk or off-track */
export function notifyGoalAlert(workspaceId: string, goal: Goal): void {
  broadcastToWorkspace(workspaceId, {
    type: 'goal_alert',
    timestamp: new Date().toISOString(),
    data: {
      goal: {
        id: goal.id,
        name: goal.name,
        status: goal.status,
        goal_type: goal.goal_type,
        current_value: goal.current_value,
        target_value: goal.target_value,
        progress_pct: goal.progress_pct,
        start_date: goal.start_date,
        end_date: goal.end_date,
      },
    },
  });
}

/** Notify workspace that a campaign is nearing or exceeding its budget */
export function notifyBudgetAlert(
  workspaceId: string,
  campaign: Campaign,
  percentUsed: number,
): void {
  const totalBudget =
    campaign.budget_type === 'lifetime'
      ? (campaign.lifetime_budget ?? 0)
      : (campaign.daily_budget ?? 0);

  const remainingBudget = totalBudget > 0 ? totalBudget * (1 - percentUsed / 100) : 0;

  broadcastToWorkspace(workspaceId, {
    type: 'budget_alert',
    timestamp: new Date().toISOString(),
    data: {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        platform: campaign.platform,
        budget_type: campaign.budget_type,
        daily_budget: campaign.daily_budget,
        lifetime_budget: campaign.lifetime_budget,
      },
      percentUsed,
      remainingBudget: Math.round(remainingBudget * 100) / 100,
    },
  });
}

/** Notify workspace that a metrics sync has finished */
export function notifyMetricsSyncComplete(workspaceId: string, syncResult: SyncResult): void {
  broadcastToWorkspace(workspaceId, {
    type: 'metrics_synced',
    timestamp: new Date().toISOString(),
    data: {
      result: {
        campaignsUpdated: syncResult.campaignsUpdated,
        adsetsUpdated: syncResult.adsetsUpdated,
        adsUpdated: syncResult.adsUpdated,
        startedAt: syncResult.startedAt,
        completedAt: syncResult.completedAt,
      },
    },
  });
}

// ─── Heartbeat ──────────────────────────────────────────────

/**
 * Start the global heartbeat loop.
 * Sends ':ping' every 30 s and prunes stale clients > 120 s.
 */
export function startHeartbeat(): void {
  if (heartbeatTimer) return; // already running

  heartbeatTimer = setInterval(() => {
    const now = Date.now();

    for (const [clientId, client] of clients.entries()) {
      // Prune stale clients
      if (now - client.lastPing.getTime() > CLIENT_TIMEOUT_MS) {
        try {
          client.response.end();
        } catch {
          // already closed
        }
        clients.delete(clientId);
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[SSE] Pruned stale client ${clientId}`);
        }
        continue;
      }

      // Send ping
      sendPing(client.response);
      client.lastPing = new Date();
    }

    // Clean up timer if no clients remain
    if (clients.size === 0 && heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }, HEARTBEAT_INTERVAL_MS);
}

/** Stop the global heartbeat loop */
export function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

// ─── Connection Stats ───────────────────────────────────────

/** Return a snapshot of current SSE connection metrics */
export function getConnectionStats(): {
  totalClients: number;
  clientsByWorkspace: Record<string, number>;
  uptime: number;
} {
  const clientsByWorkspace: Record<string, number> = {};

  for (const client of clients.values()) {
    clientsByWorkspace[client.workspaceId] =
      (clientsByWorkspace[client.workspaceId] ?? 0) + 1;
  }

  return {
    totalClients: clients.size,
    clientsByWorkspace,
    uptime: Date.now() - serverStartedAt,
  };
}

// ─── Graceful Shutdown ──────────────────────────────────────

/** Close every SSE connection and stop the heartbeat — call before process exit */
export function closeAllConnections(): void {
  // Stop heartbeats first so we don't try to ping while closing
  stopHeartbeat();

  for (const [clientId, client] of clients.entries()) {
    try {
      // Send a graceful close event when possible
      sendSSE(
        client.response,
        {
          type: 'server_shutdown',
          timestamp: new Date().toISOString(),
          data: { message: 'Server is shutting down' },
        },
        Date.now().toString(),
      );

      // Give the event a moment to flush, then end
      setTimeout(() => {
        try {
          client.response.end();
        } catch {
          // ignore
        }
      }, 100).unref();
    } catch {
      // ignore
    }

    clients.delete(clientId);
  }

  // eslint-disable-next-line no-console
  console.log(`[SSE] All ${clients.size} connections closed for shutdown`);
}
