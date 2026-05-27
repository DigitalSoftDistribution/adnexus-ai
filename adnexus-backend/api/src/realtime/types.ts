/**
 * AdNexus AI Real-Time System — Type Definitions
 * ==============================================
 * Core types shared by SSEManager, WebSocketManager, EventPublisher and RoomManager.
 */

import type { Response } from 'express';
import type WebSocket from 'ws';

// ---------------------------------------------------------------------------
// Server-Sent Events (SSE)
// ---------------------------------------------------------------------------

/** All event types that can flow through the real-time pipeline. */
export type ServerEventType =
  | 'draft.created'
  | 'draft.approved'
  | 'draft.rejected'
  | 'draft.applied'
  | 'campaign.updated'
  | 'campaign.status_changed'
  | 'metrics.updated'
  | 'alert.triggered'
  | 'ai.recommendation'
  | 'notification';

/** Every event pushed to clients carries this envelope. */
export interface ServerEvent {
  type: ServerEventType;
  workspaceId: string;
  data: unknown;
  timestamp: string; // ISO-8601
}

/** A connected SSE client. */
export interface SSEClient {
  id: string;
  workspaceId: string;
  response: Response;
  heartbeatAt: number; // epoch ms of last successful heartbeat
}

// ---------------------------------------------------------------------------
// WebSocket
// ---------------------------------------------------------------------------

/** Client → Server message shapes. */
export type ClientMessageType =
  | 'subscribe'
  | 'unsubscribe'
  | 'ping'
  | 'chat.message'
  | 'draft.action';

export interface ClientMessage {
  type: ClientMessageType;
  workspaceId?: string;
  payload?: unknown;
  correlationId?: string;
}

/** Server → Client message shapes. */
export type ServerMessageType =
  | 'pong'
  | 'subscribed'
  | 'unsubscribed'
  | 'event'
  | 'chat.response'
  | 'draft.action_result'
  | 'error';

export interface ServerMessage {
  type: ServerMessageType;
  payload?: unknown;
  correlationId?: string;
  timestamp: string;
}

/** A connected WS client with bookkeeping metadata. */
export interface WSClient {
  id: string;
  ws: WebSocket;
  workspaceIds: Set<string>;
  userId?: string;
  isAlive: boolean;
  connectedAt: number;
}

// ---------------------------------------------------------------------------
// Domain entities (minimal stubs for publishing)
// ---------------------------------------------------------------------------

export interface Draft {
  id: string;
  workspaceId: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  content?: unknown;
  createdBy: 'ai' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  workspaceId: string;
  name: string;
  status: 'active' | 'paused' | 'archived';
  budget?: number;
  spend?: number;
  updatedAt: string;
}

export interface Metrics {
  workspaceId: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  cpa: number;
  ctr: number;
  roas: number;
  timestamp: string;
}

export interface Alert {
  id: string;
  workspaceId: string;
  severity: 'info' | 'warning' | 'critical';
  metric: string;
  message: string;
  threshold: number;
  currentValue: number;
  triggeredAt: string;
}

export interface Recommendation {
  id: string;
  workspaceId: string;
  category: 'budget' | 'bidding' | 'targeting' | 'creative' | 'general';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number; // 0-1
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// JWT / Auth helpers
// ---------------------------------------------------------------------------

export interface AuthenticatedUser {
  id: string;
  workspaceId: string;
  email: string;
  role: string;
}

// ---------------------------------------------------------------------------
// Manager configuration
// ---------------------------------------------------------------------------

export interface SSEConfig {
  /** Interval in ms between SSE heartbeat comments (default 30_000). */
  heartbeatIntervalMs: number;
  /** Max age of a client connection before forced cleanup (default 5 min). */
  maxConnectionAgeMs: number;
}

export interface WSConfig {
  /** Interval in ms between WS ping frames (default 30_000). */
  pingIntervalMs: number;
  /** Grace period after ping before connection is deemed dead (default 10_000). */
  pongGracePeriodMs: number;
  /** Maximum payload size in bytes (default 1 MB). */
  maxPayloadBytes: number;
}

export interface RealtimeConfig {
  sse: SSEConfig;
  ws: WSConfig;
}
