/**
 * RealtimeService — Central Orchestrator
 * =======================================
 * Combines SSEManager, WebSocketManager, EventPublisher and RoomManager into
 * a single cohesive real-time layer.
 *
 * Responsibilities:
 *   • Wire managers together so published events reach all transports.
 *   • Mirror SSE / WS subscriptions into RoomManager for unified room tracking.
 *   • Provide a single `.stop()` for graceful shutdown.
 *   • Expose health/metrics for monitoring.
 *
 * Initialization:
 *   const rt = new RealtimeService();
 *   rt.start();
 *
 * Express integration:
 *   app.get('/api/v1/events', authenticate, (req, res) => {
 *     rt.sse.subscribe(req.user.id, req.user.workspaceId, res);
 *   });
 *
 * WS integration:
 *   const wss = new WebSocket.Server({ server });
 *   wss.on('connection', (ws, req) => {
 *     rt.ws.handleConnection(ws, req.user?.id);
 *   });
 */

import type { ServerEvent } from './types';
import type { SSEConfig, WSConfig } from './types';
import type { PublishTarget } from './EventPublisher';
import { SSEManager } from './SSEManager';
import { WebSocketManager } from './WebSocketManager';
import { EventPublisher } from './EventPublisher';
import { RoomManager } from './RoomManager';

export interface RealtimeServiceConfig {
  sse?: Partial<SSEConfig>;
  ws?: Partial<WSConfig>;
}

export class RealtimeService {
  readonly sse: SSEManager;
  readonly ws: WebSocketManager;
  readonly publisher: EventPublisher;
  readonly rooms: RoomManager;

  private isRunning = false;

  constructor(config?: RealtimeServiceConfig) {
    this.sse = new SSEManager(config?.sse);
    this.ws = new WebSocketManager(config?.ws);
    this.publisher = new EventPublisher();
    this.rooms = new RoomManager();

    this.wirePublisher();
    this.wireRoomMirroring();
  }

  // ---- Lifecycle ----------------------------------------------------------

  /** Start heartbeat loops and janitors in all managers. */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.sse.start();
    this.ws.start();
  }

  /** Gracefully terminate all connections and stop background loops. */
  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    this.sse.stop();
    this.ws.stop();
  }

  // ---- Wire-up ------------------------------------------------------------

  /**
   * Connect the EventPublisher to both SSE and WS broadcast paths.
   * Implements the PublishTarget interface expected by EventPublisher.
   */
  private wirePublisher(): void {
    const target: PublishTarget = {
      broadcastToWorkspaceSSE: (workspaceId: string, event: ServerEvent) => {
        this.sse.broadcastToWorkspace(workspaceId, event);
      },
      broadcastToWorkspaceWS: (workspaceId: string, event: ServerEvent) => {
        this.ws.broadcastEventToWorkspace(workspaceId, event);
      },
    };

    this.publisher.setTarget(target);
  }

  /**
   * Mirror SSE subscribe/unsubscribe and WS subscribe/unsubscribe/close
   * events into the RoomManager so `rooms.getRoomMembers(workspaceId)`
   * reflects **both** transports in a single unified view.
   */
  private wireRoomMirroring(): void {
    // SSE joins/leaves
    this.sse.on('client:subscribed', ({ clientId, workspaceId }) => {
      this.rooms.joinRoom(clientId, workspaceId);
    });
    this.sse.on('client:unsubscribed', ({ clientId }) => {
      this.rooms.leaveAllRooms(clientId);
    });

    // WS joins/leaves
    this.ws.on('client:subscribed', ({ clientId, workspaceId }) => {
      this.rooms.joinRoom(clientId, workspaceId);
    });
    this.ws.on('client:unsubscribed', ({ clientId, workspaceId }) => {
      this.rooms.leaveRoom(clientId, workspaceId);
    });
    this.ws.on('client:disconnected', ({ clientId }) => {
      this.rooms.leaveAllRooms(clientId);
    });
  }

  // ---- Unified broadcast (convenience) ------------------------------------

  /**
   * Broadcast a ServerEvent to **all** connected clients (SSE + WS) in a
   * workspace. Prefer `publisher.*` methods for domain events; this is a
   * low-level escape hatch.
   */
  broadcastToWorkspace(workspaceId: string, event: ServerEvent): void {
    this.sse.broadcastToWorkspace(workspaceId, event);
    this.ws.broadcastEventToWorkspace(workspaceId, event);
  }

  // ---- Health & metrics ---------------------------------------------------

  get running(): boolean {
    return this.isRunning;
  }

  /** Snapshot of current connection counts and room occupancy. */
  getMetrics() {
    return {
      running: this.isRunning,
      sseConnections: this.sse.connectionCount,
      wsConnections: this.ws.connectionCount,
      totalConnections: this.sse.connectionCount + this.ws.connectionCount,
      activeRooms: this.rooms.roomCount,
      uniqueClients: this.rooms.clientCount,
      roomStats: this.rooms.getRoomStats(),
    };
  }

  /** Express middleware-compatible health check endpoint. */
  healthHandler = (_req: unknown, res: { json: (body: unknown) => void }): void => {
    res.json({
      status: this.isRunning ? 'healthy' : 'stopped',
      ...this.getMetrics(),
    });
  };
}
