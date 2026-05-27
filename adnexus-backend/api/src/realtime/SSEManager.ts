/**
 * SSEManager — Server-Sent Events
 * ================================
 * Handles SSE connections at `/api/v1/events`.
 * • JWT-authenticated clients subscribe to a workspace event stream.
 * • Heartbeat comments keep connections alive through proxies.
 * • Auto-cleanup on disconnect / error / timeout.
 */

import type { Response } from 'express';
import { EventEmitter } from 'events';
import type { SSEClient, ServerEvent, SSEConfig } from './types';

const DEFAULT_CONFIG: SSEConfig = {
  heartbeatIntervalMs: 30_000,
  maxConnectionAgeMs: 300_000, // 5 min
};

export class SSEManager extends EventEmitter {
  private clients = new Map<string, SSEClient>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private config: SSEConfig;

  constructor(config?: Partial<SSEConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ---- Lifecycle ----------------------------------------------------------

  /** Call once when the server starts to begin heartbeats + janitor. */
  start(): void {
    this.startHeartbeat(this.config.heartbeatIntervalMs);
    this.startJanitor(this.config.maxConnectionAgeMs);
  }

  /** Gracefully terminate all connections and timers. */
  stop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    for (const [clientId, client] of this.clients) {
      this.terminateClient(clientId, client, 'server_shutdown');
    }
    this.clients.clear();
  }

  // ---- Subscriptions ------------------------------------------------------

  /**
   * Subscribe an authenticated client to a workspace event stream.
   * Sets up the SSE headers and sends an initial `connected` event.
   */
  subscribe(clientId: string, workspaceId: string, res: Response): void {
    // Prevent duplicate subscriptions on the same clientId
    if (this.clients.has(clientId)) {
      this.unsubscribe(clientId);
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.statusCode = 200;

    // Send initial comment to establish connection immediately
    res.write(':ok\n\n');

    const client: SSEClient = {
      id: clientId,
      workspaceId,
      response: res,
      heartbeatAt: Date.now(),
    };
    this.clients.set(clientId, client);

    // Notify listeners (e.g., RoomManager)
    this.emit('client:subscribed', { clientId, workspaceId });

    // Send connected event
    this.sendToClient(clientId, {
      type: 'notification',
      workspaceId,
      data: { message: 'SSE connected', clientId },
      timestamp: new Date().toISOString(),
    });

    // Cleanup when the HTTP connection closes
    res.on('close', () => this.unsubscribe(clientId));
    res.on('error', (err: Error) => {
      this.emit('client:error', { clientId, error: err.message });
      this.unsubscribe(clientId);
    });
  }

  /** Remove a client and end its response stream. */
  unsubscribe(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    this.terminateClient(clientId, client, 'unsubscribed');
    this.clients.delete(clientId);
  }

  // ---- Broadcasting -------------------------------------------------------

  /** Send an event to **all** SSE clients in a workspace. */
  broadcastToWorkspace(workspaceId: string, event: ServerEvent): void {
    const payload = this.serializeEvent(event);
    let sent = 0;
    for (const [clientId, client] of this.clients) {
      if (client.workspaceId === workspaceId) {
        if (this.write(client, payload)) {
          sent++;
        }
      }
    }
    if (sent > 0) {
      this.emit('broadcast:workspace', { workspaceId, eventType: event.type, recipients: sent });
    }
  }

  /** Send an event to a specific client by ID. */
  sendToClient(clientId: string, event: ServerEvent): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;
    return this.write(client, this.serializeEvent(event));
  }

  // ---- Heartbeat & Janitor ------------------------------------------------

  /**
   * Start periodic heartbeat comments to keep connections alive
   * through load balancers, reverse proxies, and browser timeout logic.
   */
  startHeartbeat(intervalMs: number): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      for (const [clientId, client] of this.clients) {
        if (!this.write(client, ':hb\n\n')) {
          this.emit('client:heartbeat_failed', { clientId });
          this.unsubscribe(clientId);
        } else {
          client.heartbeatAt = now;
        }
      }
    }, intervalMs);
  }

  /** Start a janitor that removes stale connections older than `maxAgeMs`. */
  private startJanitor(maxAgeMs: number): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [clientId, client] of this.clients) {
        if (now - client.heartbeatAt > maxAgeMs) {
          this.emit('client:stale', { clientId, ageMs: now - client.heartbeatAt });
          this.unsubscribe(clientId);
        }
      }
    }, maxAgeMs);
  }

  // ---- Internal helpers ---------------------------------------------------

  /** Serialize a ServerEvent into the SSE wire format. */
  private serializeEvent(event: ServerEvent): string {
    const lines = [
      `id: ${event.timestamp}`,
      `event: ${event.type}`,
      `data: ${JSON.stringify(event)}`,
      '', // blank line terminates the event
    ];
    return lines.join('\n') + '\n';
  }

  /** Write raw data to an SSE response stream. Returns false if the write fails. */
  private write(client: SSEClient, data: string): boolean {
    try {
      if (client.response.writableEnded || client.response.destroyed) {
        return false;
      }
      client.response.write(data);
      return true;
    } catch {
      return false;
    }
  }

  /** End the underlying HTTP response and clean up references. */
  private terminateClient(
    clientId: string,
    client: SSEClient,
    reason: string,
  ): void {
    try {
      if (!client.response.writableEnded) {
        client.response.end();
      }
    } catch {
      /* ignore */
    }
    this.emit('client:unsubscribed', { clientId, workspaceId: client.workspaceId, reason });
  }

  // ---- Metrics ------------------------------------------------------------

  /** Number of currently connected SSE clients. */
  get connectionCount(): number {
    return this.clients.size;
  }

  /** List active client IDs (useful for debug / health checks). */
  getConnectedClientIds(): string[] {
    return Array.from(this.clients.keys());
  }
}
