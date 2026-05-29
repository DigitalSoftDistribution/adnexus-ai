/**
 * RoomManager — Workspace Room Membership
 * ========================================
 * Tracks which clients (SSE + WS) are present in which workspace rooms.
 * Uses bidirectional maps for O(1) join/leave/lookup operations.
 */

import { EventEmitter } from 'events';

export class RoomManager extends EventEmitter {
  /** workspaceId → Set<clientId> */
  private rooms = new Map<string, Set<string>>();

  /** clientId → Set<workspaceId> (reverse index for fast cleanup) */
  private clientIndex = new Map<string, Set<string>>();

  // ---- Public API ---------------------------------------------------------

  /**
   * Add a client to a workspace room. Idempotent — safe to call repeatedly.
   * Emits `room:joined` when the room gains its first member.
   */
  joinRoom(clientId: string, workspaceId: string): void {
    // Update room → clients
    let members = this.rooms.get(workspaceId);
    if (!members) {
      members = new Set<string>();
      this.rooms.set(workspaceId, members);
    }
    const wasFirst = members.size === 0;
    members.add(clientId);

    // Update client → rooms
    let rooms = this.clientIndex.get(clientId);
    if (!rooms) {
      rooms = new Set<string>();
      this.clientIndex.set(clientId, rooms);
    }
    rooms.add(workspaceId);

    if (wasFirst) {
      this.emit('room:activated', workspaceId);
    }
    this.emit('room:joined', { clientId, workspaceId, memberCount: members.size });
  }

  /**
   * Remove a client from a specific workspace room.
   * Emits `room:left` and `room:deactivated` (when empty).
   */
  leaveRoom(clientId: string, workspaceId: string): void {
    const members = this.rooms.get(workspaceId);
    if (members) {
      members.delete(clientId);
      if (members.size === 0) {
        this.rooms.delete(workspaceId);
        this.emit('room:deactivated', workspaceId);
      }
    }

    const rooms = this.clientIndex.get(clientId);
    if (rooms) {
      rooms.delete(workspaceId);
      if (rooms.size === 0) {
        this.clientIndex.delete(clientId);
      }
    }

    this.emit('room:left', { clientId, workspaceId });
  }

  /**
   * Remove a client from **all** rooms. Use this during disconnect cleanup.
   */
  leaveAllRooms(clientId: string): void {
    const rooms = this.clientIndex.get(clientId);
    if (!rooms) return;

    // Clone because `leaveRoom` mutates the set while iterating
    for (const workspaceId of Array.from(rooms)) {
      this.leaveRoom(clientId, workspaceId);
    }
    this.clientIndex.delete(clientId);
  }

  /** Return all client IDs currently in a workspace room. */
  getRoomMembers(workspaceId: string): string[] {
    const members = this.rooms.get(workspaceId);
    return members ? Array.from(members) : [];
  }

  /** Return all workspace IDs a client is subscribed to. */
  getClientRooms(clientId: string): string[] {
    const rooms = this.clientIndex.get(clientId);
    return rooms ? Array.from(rooms) : [];
  }

  /** Total number of active rooms. */
  get roomCount(): number {
    return this.rooms.size;
  }

  /** Total number of tracked clients (across all rooms). */
  get clientCount(): number {
    return this.clientIndex.size;
  }

  /** Snapshot of current room occupancy (useful for metrics / health checks). */
  getRoomStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [wsId, members] of this.rooms.entries()) {
      stats[wsId] = members.size;
    }
    return stats;
  }
}
