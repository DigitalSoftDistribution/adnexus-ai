/**
 * AdNexus AI — Real-Time System
 * ==============================
 * Central export barrel for the real-time subsystem.
 *
 * Architecture Overview:
 *   RealtimeService (orchestrator)
 *   ├── SSEManager      — Server-Sent Events for dashboard updates
 *   ├── WebSocketManager — Bidirectional for interactive features (chat, drafts)
 *   ├── EventPublisher  — Publishes domain events from backend code
 *   └── RoomManager     — Workspace room membership tracking
 *
 * Quick Start:
 *   import { RealtimeService } from './realtime';
 *   const rt = new RealtimeService();
 *   rt.start();
 *
 *   // In an Express route handler:
 *   app.get('/api/v1/events', authenticate, (req, res) => {
 *     rt.sse.subscribe(req.user.id, req.user.workspaceId, res);
 *   });
 *
 *   // In a WebSocket server:
 *   wss.on('connection', (ws, req) => {
 *     rt.ws.handleConnection(ws, req.user?.id);
 *   });
 *
 *   // Publishing an event from business logic:
 *   await rt.publisher.publishDraftApproved(workspaceId, draft);
 */

// ---- Core types ----------------------------------------------------------
export type {
  ServerEvent,
  ServerEventType,
  SSEClient,
  ClientMessage,
  ClientMessageType,
  ServerMessage,
  ServerMessageType,
  WSClient,
  Draft,
  Campaign,
  Metrics,
  Alert,
  Recommendation,
  AuthenticatedUser,
  SSEConfig,
  WSConfig,
  RealtimeConfig,
} from './types';

// ---- Managers ------------------------------------------------------------
export { RoomManager } from './RoomManager';
export { SSEManager } from './SSEManager';
export { WebSocketManager } from './WebSocketManager';
export { EventPublisher } from './EventPublisher';

// ---- Orchestrator --------------------------------------------------------
export { RealtimeService } from './RealtimeService';
export type { RealtimeServiceConfig } from './RealtimeService';

// ---- Convenience factory -------------------------------------------------
import { RealtimeService } from './RealtimeService';
import type { RealtimeServiceConfig } from './RealtimeService';

/** Create and start a fully wired RealtimeService in one call. */
export function createRealtimeService(config?: RealtimeServiceConfig): RealtimeService {
  const service = new RealtimeService(config);
  service.start();
  return service;
}
