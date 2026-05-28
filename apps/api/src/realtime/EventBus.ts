/**
 * Unified EventBus — Redis Pub/Sub backed real-time messaging
 *
 * Replaces the separate SSEManager + WebSocketManager with a single
 * event bus that supports both SSE and WebSocket transports.
 *
 * Architecture:
 *   EventBus (orchestrator)
 *   ├── Redis Pub/Sub (cross-instance message distribution)
 *   ├── SSETransport (Server-Sent Events for dashboard updates)
 *   └── WSTransport (WebSocket for bidirectional collaboration)
 */

import type { Response } from 'express';
import type WebSocket from 'ws';
import { getRedisClient } from '../lib/redis';
import { logger } from '../lib/logger';

export type EventType =
  | 'draft.created'
  | 'draft.approved'
  | 'draft.rejected'
  | 'draft.executed'
  | 'draft.rolled_back'
  | 'campaign.created'
  | 'campaign.updated'
  | 'campaign.status_changed'
  | 'campaign.metrics_updated'
  | 'alert.triggered'
  | 'ai.recommendation'
  | 'notification'
  | 'user.joined'
  | 'user.left'
  | 'collaboration.cursor'
  | 'collaboration.edit';

export interface EventMessage {
  id: string;
  type: EventType;
  workspaceId: string;
  data: unknown;
  timestamp: string;
  sourceInstance?: string;
}

export interface SSEConnection {
  id: string;
  userId: string;
  workspaceId: string;
  response: Response;
  heartbeatAt: number;
}

export interface WSConnection {
  id: string;
  userId: string;
  workspaceId: string | null;
  socket: WebSocket;
  isAlive: boolean;
}

type EventHandler = (message: EventMessage) => void;

export class EventBus {
  private instanceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  private redis = getRedisClient();
  private subscribers = new Map<string, Set<EventHandler>>();
  private sseClients = new Map<string, SSEConnection>();
  private wsClients = new Map<string, WSConnection>();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.setupRedisSubscription();
    this.startHeartbeat();
  }

  // ─── Publishing ──────────────────────────────────────────────

  async publish(type: EventType, workspaceId: string, data: unknown): Promise<void> {
    const message: EventMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      workspaceId,
      data,
      timestamp: new Date().toISOString(),
      sourceInstance: this.instanceId,
    };

    // Local delivery
    this.deliverLocal(message);

    // Cross-instance delivery via Redis
    if (this.redis) {
      try {
        await this.redis.publish(`adnexus:events:${workspaceId}`, JSON.stringify(message));
      } catch (err) {
        logger.error('Redis publish failed', err);
      }
    }
  }

  async broadcast(type: EventType, data: unknown): Promise<void> {
    const message: EventMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      workspaceId: '*',
      data,
      timestamp: new Date().toISOString(),
      sourceInstance: this.instanceId,
    };

    this.deliverLocal(message);

    if (this.redis) {
      try {
        await this.redis.publish('adnexus:events:broadcast', JSON.stringify(message));
      } catch (err) {
        logger.error('Redis broadcast failed', err);
      }
    }
  }

  // ─── Subscribing ─────────────────────────────────────────────

  subscribe(eventType: EventType, handler: EventHandler): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(handler);

    return () => {
      this.subscribers.get(eventType)?.delete(handler);
    };
  }

  // ─── SSE Transport ───────────────────────────────────────────

  addSSEClient(connection: SSEConnection): void {
    this.sseClients.set(connection.id, connection);
    this.sendSSE(connection, { type: 'connected', data: { clientId: connection.id } } as EventMessage);
  }

  removeSSEClient(clientId: string): void {
    this.sseClients.delete(clientId);
  }

  private sendSSE(client: SSEConnection, message: EventMessage): void {
    try {
      client.response.write(`data: ${JSON.stringify(message)}\n\n`);
      client.heartbeatAt = Date.now();
    } catch {
      this.removeSSEClient(client.id);
    }
  }

  // ─── WebSocket Transport ─────────────────────────────────────

  addWSClient(connection: WSConnection): void {
    this.wsClients.set(connection.id, connection);

    connection.socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        this.handleWSMessage(connection, msg);
      } catch {
        connection.socket.send(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });

    connection.socket.on('close', () => {
      this.removeWSClient(connection.id);
    });

    connection.socket.on('pong', () => {
      connection.isAlive = true;
    });

    connection.socket.send(JSON.stringify({ type: 'connected', clientId: connection.id }));
  }

  removeWSClient(clientId: string): void {
    const client = this.wsClients.get(clientId);
    if (client) {
      client.socket.terminate();
      this.wsClients.delete(clientId);
    }
  }

  private handleWSMessage(client: WSConnection, msg: { type: string; workspaceId?: string; payload?: unknown }): void {
    switch (msg.type) {
      case 'subscribe':
        if (msg.workspaceId) {
          client.workspaceId = msg.workspaceId;
          client.socket.send(JSON.stringify({ type: 'subscribed', workspaceId: msg.workspaceId }));
        }
        break;
      case 'ping':
        client.socket.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        break;
      case 'draft.action':
        // Forward to event bus for processing
        this.publish('draft.approved', client.workspaceId ?? '*', msg.payload);
        break;
      default:
        client.socket.send(JSON.stringify({ error: `Unknown message type: ${msg.type}` }));
    }
  }

  // ─── Delivery ────────────────────────────────────────────────

  private deliverLocal(message: EventMessage): void {
    // Deliver to local subscribers
    const handlers = this.subscribers.get(message.type);
    if (handlers) {
      handlers.forEach((h) => {
        try { h(message); } catch (err) { logger.error('Event handler error', err); }
      });
    }

    // Deliver to SSE clients in workspace
    if (message.workspaceId !== '*') {
      for (const client of this.sseClients.values()) {
        if (client.workspaceId === message.workspaceId) {
          this.sendSSE(client, message);
        }
      }
    } else {
      // Broadcast to all SSE clients
      for (const client of this.sseClients.values()) {
        this.sendSSE(client, message);
      }
    }

    // Deliver to WS clients in workspace
    if (message.workspaceId !== '*') {
      for (const client of this.wsClients.values()) {
        if (client.workspaceId === message.workspaceId) {
          this.sendWS(client, message);
        }
      }
    } else {
      for (const client of this.wsClients.values()) {
        this.sendWS(client, message);
      }
    }
  }

  private sendWS(client: WSConnection, message: EventMessage): void {
    try {
      if (client.socket.readyState === 1) { // OPEN
        client.socket.send(JSON.stringify(message));
      }
    } catch {
      this.removeWSClient(client.id);
    }
  }

  // ─── Redis Cross-Instance ────────────────────────────────────

  private setupRedisSubscription(): void {
    if (!this.redis) return;

    const subscriber = this.redis.duplicate();

    subscriber.on('message', (channel, message) => {
      try {
        const event = JSON.parse(message) as EventMessage;
        // Skip messages from this instance (already delivered locally)
        if (event.sourceInstance === this.instanceId) return;
        this.deliverLocal(event);
      } catch (err) {
        logger.error('Redis message parse error', err);
      }
    });

    subscriber.subscribe('adnexus:events:broadcast').catch((err) => {
      logger.error('Redis broadcast subscribe failed', err);
    });

    // Subscribe to workspace-specific channels dynamically
    // In production, use pattern matching: psubscribe('adnexus:events:*')
    subscriber.psubscribe('adnexus:events:*').catch((err) => {
      logger.error('Redis pattern subscribe failed', err);
    });
  }

  // ─── Heartbeat ───────────────────────────────────────────────

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 60s

      // Clean up dead SSE clients
      for (const [id, client] of this.sseClients) {
        if (now - client.heartbeatAt > timeout) {
          this.removeSSEClient(id);
        } else {
          this.sendSSE(client, { id: 'hb', type: 'notification', workspaceId: client.workspaceId, data: { type: 'heartbeat' }, timestamp: new Date().toISOString() });
        }
      }

      // Clean up dead WS clients
      for (const [id, client] of this.wsClients) {
        if (!client.isAlive) {
          this.removeWSClient(id);
          continue;
        }
        client.isAlive = false;
        try { client.socket.ping(); } catch { this.removeWSClient(id); }
      }
    }, 30000);
  }

  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    for (const client of this.sseClients.values()) {
      try { client.response.end(); } catch { /* ignore */ }
    }
    for (const client of this.wsClients.values()) {
      try { client.socket.terminate(); } catch { /* ignore */ }
    }
    this.sseClients.clear();
    this.wsClients.clear();
  }

  getStats(): { sseClients: number; wsClients: number; subscribers: number } {
    let subscriberCount = 0;
    for (const set of this.subscribers.values()) {
      subscriberCount += set.size;
    }
    return {
      sseClients: this.sseClients.size,
      wsClients: this.wsClients.size,
      subscribers: subscriberCount,
    };
  }
}
