/**
 * SSE Endpoint Handler
 *
 * Express route handler for Server-Sent Events connections.
 * Uses the unified EventBus for message delivery.
 */

import type { Request, Response } from 'express';
import type { EventBus } from './EventBus';
import { logger } from '../lib/logger';

export function createSSEHandler(eventBus: EventBus) {
  return (req: Request, res: Response): void => {
    const userId = (req as any).user?.id;
    const workspaceId = (req as any).user?.workspaceId;

    if (!userId || !workspaceId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const clientId = `sse-${userId}-${Date.now()}`;

    eventBus.addSSEClient({
      id: clientId,
      userId,
      workspaceId,
      response: res,
      heartbeatAt: Date.now(),
    });

    logger.info(`SSE client connected: ${clientId} (workspace: ${workspaceId})`);

    // Handle client disconnect
    req.on('close', () => {
      eventBus.removeSSEClient(clientId);
      logger.info(`SSE client disconnected: ${clientId}`);
    });

    req.on('error', () => {
      eventBus.removeSSEClient(clientId);
    });

    // Send initial connection event
    res.write(`data: ${JSON.stringify({
      id: 'conn',
      type: 'connected',
      workspaceId,
      data: { clientId, userId },
      timestamp: new Date().toISOString(),
    })}\n\n`);
  };
}
