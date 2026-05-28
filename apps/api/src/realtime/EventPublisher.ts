/**
 * EventPublisher — Backend → Client Push
 * =======================================
 * Publishes domain events that are forwarded to connected SSE and WS clients.
 *
 * Usage inside business logic (e.g., after a draft is approved):
 *   await eventPublisher.publishDraftApproved(workspaceId, draft);
 *
 * The RealtimeService wires this publisher to SSEManager + WebSocketManager
 * so every published event reaches the right audience automatically.
 */

import { EventEmitter } from 'events';
import type {
  Draft,
  Campaign,
  Metrics,
  Alert,
  Recommendation,
  ServerEvent,
} from './types';

export interface PublishTarget {
  /** SSE workspace broadcast */
  broadcastToWorkspaceSSE(workspaceId: string, event: ServerEvent): void;
  /** WS workspace broadcast */
  broadcastToWorkspaceWS(workspaceId: string, event: ServerEvent): void;
}

export class EventPublisher extends EventEmitter {
  private target: PublishTarget | null = null;

  /** Injected by RealtimeService during initialization. */
  setTarget(target: PublishTarget): void {
    this.target = target;
  }

  // ---- Draft events -------------------------------------------------------

  async publishDraftCreated(workspaceId: string, draft: Draft): Promise<void> {
    this.emitAndBroadcast({
      type: 'draft.created',
      workspaceId,
      data: draft,
      timestamp: new Date().toISOString(),
    });
  }

  async publishDraftApproved(workspaceId: string, draft: Draft): Promise<void> {
    this.emitAndBroadcast({
      type: 'draft.approved',
      workspaceId,
      data: draft,
      timestamp: new Date().toISOString(),
    });
  }

  async publishDraftRejected(workspaceId: string, draft: Draft): Promise<void> {
    this.emitAndBroadcast({
      type: 'draft.rejected',
      workspaceId,
      data: draft,
      timestamp: new Date().toISOString(),
    });
  }

  async publishDraftApplied(workspaceId: string, draft: Draft): Promise<void> {
    this.emitAndBroadcast({
      type: 'draft.applied',
      workspaceId,
      data: draft,
      timestamp: new Date().toISOString(),
    });
  }

  // ---- Campaign events ----------------------------------------------------

  async publishCampaignUpdated(
    workspaceId: string,
    campaign: Campaign,
  ): Promise<void> {
    this.emitAndBroadcast({
      type: 'campaign.updated',
      workspaceId,
      data: campaign,
      timestamp: new Date().toISOString(),
    });
  }

  async publishCampaignStatusChanged(
    workspaceId: string,
    campaign: Campaign,
    previousStatus: string,
  ): Promise<void> {
    this.emitAndBroadcast({
      type: 'campaign.status_changed',
      workspaceId,
      data: { campaign, previousStatus },
      timestamp: new Date().toISOString(),
    });
  }

  // ---- Metrics events -----------------------------------------------------

  async publishMetricsUpdated(
    workspaceId: string,
    metrics: Metrics,
  ): Promise<void> {
    this.emitAndBroadcast({
      type: 'metrics.updated',
      workspaceId,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  }

  // ---- Alert events -------------------------------------------------------

  async publishAlert(workspaceId: string, alert: Alert): Promise<void> {
    this.emitAndBroadcast({
      type: 'alert.triggered',
      workspaceId,
      data: alert,
      timestamp: new Date().toISOString(),
    });
  }

  // ---- AI Recommendation events -------------------------------------------

  async publishAIRecommendation(
    workspaceId: string,
    recommendation: Recommendation,
  ): Promise<void> {
    this.emitAndBroadcast({
      type: 'ai.recommendation',
      workspaceId,
      data: recommendation,
      timestamp: new Date().toISOString(),
    });
  }

  // ---- Generic notification -----------------------------------------------

  async publishNotification(
    workspaceId: string,
    notification: { title: string; message: string; level?: 'info' | 'warning' | 'success' | 'error' },
  ): Promise<void> {
    this.emitAndBroadcast({
      type: 'notification',
      workspaceId,
      data: notification,
      timestamp: new Date().toISOString(),
    });
  }

  // ---- Internal -----------------------------------------------------------

  private emitAndBroadcast(event: ServerEvent): void {
    // Let backend observers react (e.g., audit logs, webhooks)
    this.emit('event:published', event);

    // Push to connected clients
    if (this.target) {
      this.target.broadcastToWorkspaceSSE(event.workspaceId, event);
      this.target.broadcastToWorkspaceWS(event.workspaceId, event);
    }
  }
}
