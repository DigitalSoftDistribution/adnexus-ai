/**
 * AdNexus AI — Real-Time System (Unified)
 * ========================================
 * Central export barrel for the unified real-time subsystem.
 *
 * Architecture:
 *   EventBus (orchestrator)
 *   ├── Redis Pub/Sub (cross-instance message distribution)
 *   ├── SSE Transport (Server-Sent Events for dashboard updates)
 *   └── WS Transport (WebSocket for bidirectional collaboration)
 *
 * Quick Start:
 *   import { EventBus, createSSEHandler, createWebSocketServer } from './realtime';
 *   const eventBus = new EventBus();
 *
 *   // SSE endpoint:
 *   app.get('/api/v2/events', authenticate, createSSEHandler(eventBus));
 *
 *   // WebSocket server:
 *   createWebSocketServer(httpServer, eventBus);
 *
 *   // Publishing from business logic:
 *   await eventBus.publish('campaign.updated', workspaceId, { campaignId, changes });
 */

export { EventBus } from './EventBus';
export type { EventType, EventMessage, SSEConnection, WSConnection } from './EventBus';
export { createSSEHandler } from './sse';
export { createWebSocketServer } from './websocket';
