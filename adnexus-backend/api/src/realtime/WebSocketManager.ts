/**
 * WebSocketManager — Bidirectional Real-Time
 * ===========================================
 * Handles WebSocket connections for interactive features:
 * • AI chat (chat.message → chat.response)
 * • Draft actions (approve / reject)
 * • Workspace subscription / unsubscription
 * • Keepalive ping/pong frames
 *
 * Each connection can join multiple workspace rooms.
 */

import { EventEmitter } from 'events';
import type { WebSocket, RawData } from 'ws';
import type {
  WSClient,
  ClientMessage,
  ServerMessage,
  ServerEvent,
  WSConfig,
} from './types';

const DEFAULT_CONFIG: WSConfig = {
  pingIntervalMs: 30_000,
  pongGracePeriodMs: 10_000,
  maxPayloadBytes: 1_048_576, // 1 MB
};

export class WebSocketManager extends EventEmitter {
  private clients = new Map<string, WSClient>();
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private config: WSConfig;

  constructor(config?: Partial<WSConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ---- Lifecycle ----------------------------------------------------------

  /** Start the periodic ping sweep. Call once at server boot. */
  start(): void {
    this.startPingLoop(this.config.pingIntervalMs);
  }

  /** Terminate all connections and stop timers. */
  stop(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    for (const [clientId, client] of this.clients) {
      this.terminateClient(clientId, client, 1001, 'Server shutting down');
    }
    this.clients.clear();
  }

  // ---- Connection handling ------------------------------------------------

  /**
   * Called by the `wss.on('connection')` handler.
   * `userId` should be extracted from the JWT verified during the WS upgrade.
   */
  handleConnection(ws: WebSocket, userId?: string): void {
    const clientId = this.generateClientId();
    const client: WSClient = {
      id: clientId,
      ws,
      workspaceIds: new Set(),
      userId,
      isAlive: true,
      connectedAt: Date.now(),
    };

    this.clients.set(clientId, client);
    this.emit('client:connected', { clientId, userId });

    // Wire handlers
    ws.on('message', (raw: RawData) => this.onMessage(clientId, raw));
    ws.on('pong', () => this.onPong(clientId));
    ws.on('close', (code: number, reason: Buffer) =>
      this.onClose(clientId, code, reason),
    );
    ws.on('error', (err: Error) => {
      this.emit('client:error', { clientId, error: err.message });
      this.disconnect(clientId);
    });

    // Send welcome
    this.sendToClient(clientId, {
      type: 'subscribed',
      payload: { clientId, message: 'WebSocket connected' },
      timestamp: new Date().toISOString(),
    });
  }

  /** Gracefully close a single connection. */
  disconnect(clientId: string, code = 1000, reason = 'Client disconnect'): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    this.terminateClient(clientId, client, code, reason);
  }

  // ---- Message routing ----------------------------------------------------

  private onMessage(clientId: string, raw: RawData): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Size guard
    if (raw.length > this.config.maxPayloadBytes) {
      this.sendToClient(clientId, {
        type: 'error',
        payload: { message: 'Payload too large' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      this.sendToClient(clientId, {
        type: 'error',
        payload: { message: 'Invalid JSON' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    this.handleMessage(clientId, msg);
  }

  /** Route validated client messages to the appropriate handler. */
  handleMessage(clientId: string, msg: ClientMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (msg.type) {
      case 'subscribe': {
        if (!msg.workspaceId) {
          this.sendError(clientId, 'workspaceId required for subscribe', msg.correlationId);
          return;
        }
        client.workspaceIds.add(msg.workspaceId);
        this.emit('client:subscribed', { clientId, workspaceId: msg.workspaceId });
        this.sendToClient(clientId, {
          type: 'subscribed',
          payload: { workspaceId: msg.workspaceId },
          correlationId: msg.correlationId,
          timestamp: new Date().toISOString(),
        });
        break;
      }

      case 'unsubscribe': {
        if (!msg.workspaceId) {
          this.sendError(clientId, 'workspaceId required for unsubscribe', msg.correlationId);
          return;
        }
        client.workspaceIds.delete(msg.workspaceId);
        this.emit('client:unsubscribed', { clientId, workspaceId: msg.workspaceId });
        this.sendToClient(clientId, {
          type: 'unsubscribed',
          payload: { workspaceId: msg.workspaceId },
          correlationId: msg.correlationId,
          timestamp: new Date().toISOString(),
        });
        break;
      }

      case 'ping': {
        this.sendToClient(clientId, {
          type: 'pong',
          payload: { clientId },
          correlationId: msg.correlationId,
          timestamp: new Date().toISOString(),
        });
        break;
      }

      case 'chat.message': {
        // Hand off to the AI service via event
        this.emit('chat:message', {
          clientId,
          userId: client.userId,
          workspaceId: msg.workspaceId,
          payload: msg.payload,
          correlationId: msg.correlationId,
        });
        break;
      }

      case 'draft.action': {
        // Hand off to draft service via event
        this.emit('draft:action', {
          clientId,
          userId: client.userId,
          workspaceId: msg.workspaceId,
          payload: msg.payload,
          correlationId: msg.correlationId,
        });
        break;
      }

      default: {
        this.sendError(clientId, `Unknown message type`, msg.correlationId);
        break;
      }
    }
  }

  // ---- Broadcasting -------------------------------------------------------

  /** Send a message to every WS client in a workspace room. */
  broadcastToWorkspace(workspaceId: string, message: ServerMessage): void {
    const payload = JSON.stringify(message);
    let sent = 0;
    for (const [clientId, client] of this.clients) {
      if (client.workspaceIds.has(workspaceId)) {
        if (this.rawSend(client, payload)) {
          sent++;
        }
      }
    }
    if (sent > 0) {
      this.emit('broadcast:workspace', { workspaceId, messageType: message.type, recipients: sent });
    }
  }

  /** Send a ServerEvent to all WS clients in a workspace (convenience wrapper). */
  broadcastEventToWorkspace(workspaceId: string, event: ServerEvent): void {
    this.broadcastToWorkspace(workspaceId, {
      type: 'event',
      payload: event,
      timestamp: new Date().toISOString(),
    });
  }

  /** Send a typed message to a single WS client. */
  sendToClient(clientId: string, message: ServerMessage): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;
    return this.rawSend(client, JSON.stringify(message));
  }

  /** Send a chat response back to the originating client. */
  sendChatResponse(
    clientId: string,
    responsePayload: unknown,
    correlationId?: string,
  ): boolean {
    return this.sendToClient(clientId, {
      type: 'chat.response',
      payload: responsePayload,
      correlationId,
      timestamp: new Date().toISOString(),
    });
  }

  /** Send the result of a draft action back to the client. */
  sendDraftActionResult(
    clientId: string,
    resultPayload: unknown,
    correlationId?: string,
  ): boolean {
    return this.sendToClient(clientId, {
      type: 'draft.action_result',
      payload: resultPayload,
      correlationId,
      timestamp: new Date().toISOString(),
    });
  }

  // ---- Keepalive (ping/pong) ----------------------------------------------

  private startPingLoop(intervalMs: number): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => {
      for (const [clientId, client] of this.clients) {
        if (!client.isAlive) {
          this.terminateClient(clientId, client, 1001, 'Ping timeout');
          continue;
        }
        client.isAlive = false;
        try {
          client.ws.ping();
        } catch {
          this.terminateClient(clientId, client, 1011, 'Ping failed');
        }
      }
    }, intervalMs);
  }

  private onPong(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.isAlive = true;
    }
  }

  // ---- Event handlers -----------------------------------------------------

  private onClose(clientId: string, code: number, reason: Buffer): void {
    this.emit('client:disconnected', {
      clientId,
      code,
      reason: reason.toString(),
    });
    this.removeClient(clientId);
  }

  private removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    // Emit room-leave events for all subscribed workspaces
    for (const wsId of client.workspaceIds) {
      this.emit('client:unsubscribed', { clientId, workspaceId: wsId });
    }
    this.clients.delete(clientId);
  }

  // ---- Internal helpers ---------------------------------------------------

  private rawSend(client: WSClient, payload: string): boolean {
    try {
      if (client.ws.readyState !== 1 /* WebSocket.OPEN */) return false;
      client.ws.send(payload);
      return true;
    } catch {
      return false;
    }
  }

  private sendError(clientId: string, message: string, correlationId?: string): void {
    this.sendToClient(clientId, {
      type: 'error',
      payload: { message },
      correlationId,
      timestamp: new Date().toISOString(),
    });
  }

  private terminateClient(
    clientId: string,
    client: WSClient,
    code: number,
    reason: string,
  ): void {
    try {
      if (client.ws.readyState === 1 /* OPEN */ || client.ws.readyState === 0 /* CONNECTING */) {
        client.ws.close(code, reason);
      }
    } catch {
      /* ignore */
    }
    this.removeClient(clientId);
  }

  private generateClientId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  // ---- Metrics ------------------------------------------------------------

  /** Number of currently connected WS clients. */
  get connectionCount(): number {
    return this.clients.size;
  }

  /** List active client IDs. */
  getConnectedClientIds(): string[] {
    return Array.from(this.clients.keys());
  }
}
