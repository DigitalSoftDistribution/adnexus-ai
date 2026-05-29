/**
 * WebSocket Server Handler
 *
 * Creates a WebSocket server that integrates with the unified EventBus
 * for bidirectional real-time collaboration.
 */

import type { Server } from 'http';
import WebSocket from 'ws';
import type { EventBus } from './EventBus';
import { logger } from '../lib/logger';

export function createWebSocketServer(httpServer: Server, eventBus: EventBus): WebSocket.Server {
  const wss = new WebSocket.Server({ server: httpServer, path: '/ws' });

  wss.on('connection', (socket, req) => {
    // Extract user info from upgrade request
    // In production, verify JWT from req.headers.cookie or query param
    const userId = (req as any).user?.id || `anon-${Date.now()}`;
    const workspaceId = (req as any).user?.workspaceId || null;

    const clientId = `ws-${userId}-${Date.now()}`;

    eventBus.addWSClient({
      id: clientId,
      userId,
      workspaceId,
      socket,
      isAlive: true,
    });

    logger.info(`WebSocket client connected: ${clientId}`);

    socket.on('close', () => {
      eventBus.removeWSClient(clientId);
      logger.info(`WebSocket client disconnected: ${clientId}`);
    });
  });

  wss.on('error', (err) => {
    logger.error('WebSocket server error', err);
  });

  return wss;
}
